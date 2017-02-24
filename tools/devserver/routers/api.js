/**
 * @author Patrick Zhu, Tim Lauv
 * @created 2017.02.06
 * @updated 2017.02.20 (Tim Lauv +generate and 4 funcs)
 */
var _ = require('underscore'),
path = require('path'),
fs = require('fs-extra');

module.exports = function(server){

	var profile = server.get('profile');
	var router = server.mount(this);
	server.secure(router);

	router.get('/getViewList', function(req, res){
		var views = [],
			baseSrc = '../../implementation/js/ide/view/';
		//
		var paths = fs.walkSync(path.join(baseSrc, 'user')); //walkSync relies on fs-extra 1.x.x. 2.x.x has moved this function to a separate package.
		//augment paths to view names
		_.each(paths, function(p, index){
			//get paths in pieces
			var temp = p.replace(baseSrc, '').split('/');
			//get rid of last .js extension
			temp[temp.length - 1] = temp[temp.length - 1].replace(/.js$/, '');
			//capitalize first character
			_.each(temp, function(str, index){
				temp[index] = str.charAt(0).toUpperCase() + str.slice(1);
			});
			//combine them into view name
			views.push(temp.join('.'));
		});
		return res.status(200).json(views);
	});

	router.post('/generate', function(req, res){
		
		//grab the points and lines
		var meta = req.body;
		//cleanse them (remove the edge lines)
		meta.hlines = _.filter(meta.hlines, function(l){
			return Math.ceil(l.y) !== 100 && Math.floor(l.y) !== 0;
		});
		meta.vlines = _.filter(meta.vlines, function(l){
			return Math.ceil(l.x) !== 100 && Math.floor(l.x) !== 0;
		});

		//generate layout configure ($.flexLayout)
		var counter = {count: 0}, layout = constructLayout({
			top: 0,
			bottom: 100,
			left: 0,
			right: 100,
		}, meta.hlines, meta.vlines, counter) || [];

		return res.status(200).json({
			meta: meta,
			layout: {
				split: layout.layout, //Just put it like this to confuse you! Muhaha...
				dir: layout.dir,
			},
			'region-count': counter.count,
		});
	});

};

function constructLayout(region, hlines, vlines, counter){

	//find all through lines (assuming ascending order in line lvls)
	var hThroughLines = findThroughLines(region.left, region.right, hlines, 'x'),
	vThroughLines = findThroughLines(region.top, region.bottom, vlines, 'y');

	//debug
	//console.log('region:', region, 'hT:', hThroughLines, 'vT:', vThroughLines);

	var layout = [], dir;
	if(hThroughLines.length > 0){
		var currentTop = region.top;
		hThroughLines.push(region.bottom);
		_.each(hThroughLines, function(yLevel){
			var subRegionLayout = constructLayout({
				top: currentTop,
				bottom: yLevel,
				left: region.left,
				right: region.right,
			}, _.filter(hlines, function(l){
				return l.y > currentTop && l.y < yLevel;
			}), _.filter(vlines, function(l){
				return l.y1 >= currentTop && l.y2 <= yLevel;
			}), counter);

			if(subRegionLayout)
				layout.push([(yLevel - currentTop) + ':#' + _.uniqueId('flex-region-'), subRegionLayout.layout]);
			else
				layout.push((yLevel - currentTop) + ':id="' + _.uniqueId('flex-region-') + '" region="gen-h-' + counter.count + '"');

			currentTop = yLevel;
		});
		dir = 'h';
	}else if(vThroughLines.length > 0){
		var currentLeft = region.left;
		vThroughLines.push(region.right);
		_.each(vThroughLines, function(xLevel){
			var subRegionLayout = constructLayout({
				top: region.top,
				bottom: region.bottom,
				left: currentLeft,
				right: xLevel,
			}, _.filter(hlines, function(l){
				return l.x1 >= currentLeft && l.x2 <= xLevel;
			}), _.filter(vlines, function(l){
				return l.x > currentLeft && l.x < xLevel;
			}), counter);

			if(subRegionLayout)
				layout.push([(xLevel - currentLeft) + ':#' + _.uniqueId('flex-region-'), subRegionLayout.layout]);
			else
				layout.push((xLevel - currentLeft) + ':id="' + _.uniqueId('flex-region-') + '" region="gen-v-' + counter.count + '"');

			currentLeft = xLevel;
		});
		dir = 'v';
	}else {
		//no through lines means region not sub-divided.
		counter.count++;
		return;
	}
	return {layout: layout, dir: dir};
}

function inverseD(xory){
	switch(xory){
		case 'x':
			return 'y';
		case 'y':
			return 'x';
		default:
			break;
	}
}

function findThroughLines(start, stop, lines, direction){
	var throughLines = [];
	_.each(lines, function(l){
		if(l[direction + '1'] === start && followTheLine(l[direction + '2'], stop, l[inverseD(direction)], lines, direction))
			throughLines.push(l[inverseD(direction)]);
	});
	return throughLines;
}

function followTheLine(next, until, level, lines, direction){
	if(next === until || Math.ceil(next) === until)
		return true;

	for(var index in lines){
		var l = lines[index];
		if(l[direction + '1'] === next && l[inverseD(direction)] === level)
			return followTheLine(l[direction + '2'], until, level, lines, direction);
	}
	return false;
}
