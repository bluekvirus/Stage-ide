;(function(app){

	app.view('Create.Layout', {
		svg: true,
		coop: ['layout-added', 'line-deleted'],
		radius: 8,
		dragging: false,//for other view to consult whether dragging an end point
		onReady: function(){
			var that = this;

			this.paper.clear();

			//initial draw all the lines and end points on the frame
			this.redrawAll();

			//listen to resize event
			this.listenTo(app, 'app:resized', app.throttle(function(){
				that.redrawAll();
			}));
		},
		onLayoutAdded: function(endPoints){
			//add end points to global object
			
			//since all points are in percentage translate it into pixels
			var height = this.$el.height(),
				width = this.$el.width(),
				circle;

			//draw the line
			var x1 = this.calSvgCoord(endPoints.x1, true),
				x2 = this.calSvgCoord(endPoints.x2, true),
				y1 = this.calSvgCoord(endPoints.y1),
				y2 = this.calSvgCoord(endPoints.y2);

			this.drawPath('M' + x1 + ' ' + y1 + 'L' + x2 + ' ' + y2);

			//draw points
			circle = this.drawCircle(x1, y1);
			this.addPointAttr(circle.node, endPoints.startPoint);
			circle = this.drawCircle(x2, y2);
			this.addPointAttr(circle.node, endPoints.endPoint);
		},
		onLineDeleted: function(){
			this.redrawAll();
		},
		//function to redraw all lines based on global object, mainly used for window resize event
		redrawAll: function(){
			var that = this;

			//clean old lines
			this.paper.clear();

			//draw horizontal lines
			_.each(app._global['horizontal-line'], function(coords, index){
				var x1 = that.calSvgCoord(coords.x1, true),
					x2 = that.calSvgCoord(coords.x2, true),
					y = that.calSvgCoord(coords.y);

				that.drawPath('M' + x1 + ' ' + y + 'L' + x2 + ' ' + y);
			});

			//draw vertical lines
			_.each(app._global['vertical-line'], function(coords, index){
				var y1 = that.calSvgCoord(coords.y1),
					y2 = that.calSvgCoord(coords.y2),
					x = that.calSvgCoord(coords.x, true);

				that.drawPath('M' + x + ' ' + y1 + 'L' + x + ' ' + y2);
			});

			//draw all the points
			_.each(app._global.endPoints, function(endPoint, id){
				var x = that.calSvgCoord(endPoint.x, true),
					y = that.calSvgCoord(endPoint.y);

				var circle = that.drawCircle(x, y);
				that.addPointAttr(circle.node, id);
			});
		},
		calSvgCoord: function(coord, w/*width*/){
			var height = this.$el.height(),
				width = this.$el.width();

			if(w)
				return coord / 100 * width;
			else
				return coord / 100 * height;
		},
		drawPath: function(pathStr){
			//draw path on paper
			var path = this.paper.path(pathStr).attr({'stroke' : '#DEDEDE', 'stroke-dasharray': '--'});
			//consult mesh/unmesh flag from parentCt
			if(this.parentCt.meshed && !this.parentCt.preview)
				//add a class for mesh and unmesh
				$(path.node).attr('class', 'layout-line');
			else
				//add a class for mesh and unmesh
				$(path.node).attr('class', 'layout-line hidden');
		},
		drawCircle: function(x, y){
			//draw circle on paper
			//inner circle, draw first, so it will be at lower index than outter circle, which has events on it.
			var inner = this.paper.circle(x, y, this.radius - 2).attr({'stroke-width':'none', 'fill': '#000'});
			$(inner.node).attr('class', 'end-point-inner' + ((this.parentCt.meshed && !this.parentCt.preview) ? ' ' : ' hidden'));
			//outer circle
			var circle = this.paper.circle(x, y, this.radius).attr({'stroke' : '#DEDEDE', 'stroke-width':'2', 'fill': 'rgba(0, 0, 0, 0)'});
			return circle;
		},
		addPointAttr: function(node, id){
			var $node = $(node),
				$body = $('body');

			var that = this;
			//jquery2 cannot use addClass on SVG element
			node.setAttribute('class', 'end-point draggble' + ((this.parentCt.meshed && !this.parentCt.preview) ? ' ' : ' hidden'));
			node.setAttribute('point-id', id);

			$node.one('click', function(e){
				that.clickCallback(e, $node);
			});

			$node.one('mousedown', function(e){
				that.mousedownCallback(e, $node, $body);
			});
		},
		clickCallback: function(e, $node){
			var that = this;
			//prevent default
			e.preventDefault();
			//stop event poping to parent element
			e.stopPropagation();

			//trigger end point click event
			app.coop('click-endpoint', e);

			$node.one('click', function(event){
				that.clickCallback(event, $node);
			});
		},
		mousedownCallback: function(e, $node, $body){
			//hide side menu if necesary
			var $trigger = this.parentCt.$el.find('.side-menu-trigger');

			//save original point object
			var $point = $(e.target);

			if($trigger.hasClass('active'))
				this.parentCt.toggleSideMenu($trigger);
			
			var that = this,
				id = $node.attr('point-id');

			//prevent default
			e.preventDefault();
			//stop event poping to parent element
			e.stopPropagation();
			//set dragging flag true
			this.dragging = true;

			var constrains = this.checkMovingConstrain(id),
				originalCoords = {
					x: app._global.endPoints[id].x,
					y: app._global.endPoints[id].y
				};

			//check whether if the nodes are on the frame
			if(
				originalCoords.x < 0 + app._global.tolerance || originalCoords.x > 100 - app._global.tolerance ||
				originalCoords.y < 0 + app._global.tolerance || originalCoords.y > 100 - app._global.tolerance
			){
				//send notification
				app.notify('Cannot be Operated', 'End points on outter frame cannot be operated! Choose inside end points inside!', 'error', {icon: 'fa fa-reddit-alien'});
				//set dragging false
				this.dragging = false;
				//return
				return;
			}

			//use body as the mousemove view port
			var updateLayoutSVG = function(e){
				//check constrains
				var hPer = e.pageX / that.$el.width() * 100,
					vPer = e.pageY / that.$el.height() * 100;

				//totally inside boundary
				if(hPer > constrains.limits.xmin && hPer < constrains.limits.xmax && vPer > constrains.limits.ymin && vPer < constrains.limits.ymax){
					//update all related lines and end points
					that.updateRelated(constrains.hlines, constrains.vlines, constrains.endPoints, e, $node.attr('point-id'), originalCoords, {x: true, y: true});
				}
				//only x inside boundary
				else if(hPer > constrains.limits.xmin && hPer < constrains.limits.xmax && (vPer < constrains.limits.ymin || vPer > constrains.limits.ymax)){
					//update all related lines and end points
					that.updateRelated(constrains.hlines, constrains.vlines, constrains.endPoints, e, $node.attr('point-id'), originalCoords, {x: true, y: false});
				}
				//only y inside boundary
				else if((hPer < constrains.limits.xmin || hPer > constrains.limits.xmax) && vPer > constrains.limits.ymin && vPer < constrains.limits.ymax){
					//update all related lines and end points
					that.updateRelated(constrains.hlines, constrains.vlines, constrains.endPoints, e, $node.attr('point-id'), originalCoords, {x: false, y: true});
				}
			};
			var updateGeneratedViewLayout = app.debounce(function(){
				//trigger coop event to re-generate layout and views
				that.coop('layout-adjusted', $point);
			});
			$body
			.on('mousemove', function(e){
				//prevent default
				e.preventDefault();

				//unbind original click event and mousedown event,
				//unbind click until mousemove to avoid mousedown and click event conflict
				$node.unbind('click').unbind('mousedown');

				updateLayoutSVG(e);
				updateGeneratedViewLayout();
				
			})
			.one('mouseup', function(e){
				//prevent default
				e.preventDefault();
				//unbind mousemove event on body
				$body.unbind('mousemove');
				//reset dragging flag to false
				that.dragging = false;
				//mouseup has a bit delay. use defer to register click and mousedown event on node again
				_.defer(function(){
					//click
					$node.one('click', function(event){
						that.clickCallback(event, $node);
					});
					//mousedown
					$node.one('mousedown', function(event){
						that.mousedownCallback(event, $node, $body);
					});
				});
			});
		},
		checkMovingConstrain: function(id/*point id*/){
			//fetch the point
			var point = app._global.endPoints[id],
				directions = ['left', 'right', 'top', 'bottom'],
				vem = (parseFloat(getComputedStyle(document.body).fontSize)) / this.$el.height() * 100,
				hem = (parseFloat(getComputedStyle(document.body).fontSize)) / this.$el.width() * 100,
				temp;

			var limits = {
				xmin : 2 * hem, xmax: 100 - 2 * hem, ymin: 2 * vem, ymax: 100 - 2 * vem
			};//store all the limits

			var extensions = {
				left: 0, right: 0, top: 0, bottom: 0,
				hlines: [],//store all the horizontal lines controlled by this point
				vlines: [],//store all the vertical lines controlled by this point
				endPoints: []//store all the end points controlled by this point
			};
			
			//check the extension limit of each direction
			_.each(directions, function(direction){
				var orientation = (direction === 'left' || direction === 'right') ? 'h' : 'v', tempLine;

				temp = point;
				if(!_.contains(extensions.endPoints, temp.id))
					extensions.endPoints.push(temp.id);//store the point

				//trace down the last point in this direction
				while(temp[direction]){
					//fetch next line
					tempLine = _.find(app._global[(orientation === 'h') ? 'horizontal-line' : 'vertical-line'], function(line){ return line.id === temp[direction] });
					//store line walked through
					(orientation === 'h') ? extensions.hlines.push(tempLine.id) : extensions.vlines.push(tempLine.id);
					//get next point
					temp = app._global.endPoints[tempLine[direction]];
					//store next point
					extensions.endPoints.push(temp.id);
				}

				switch(direction){
					case 'left':
						extensions.left = temp.x;
					break;
					case 'right':
						extensions.right = temp.x;
					break;
					case 'top':
						extensions.top = temp.y;
					break;
					case 'bottom':
						extensions.bottom = temp.y;
					break;
				}
			});

			//now we have extension limits, check with horizontal and vertical collections to setup the real limit
			//horizontal
			_.each(app._global['horizontal-line'], function(hline){
				if(
					!_.contains(extensions.hlines, hline.id) &&
					(
						(hline.x1 < (extensions.right + app._global.tolerance) && hline.x1 > (extensions.left - app._global.tolerance)) ||
						(hline.x2 < (extensions.right  + app._global.tolerance) && hline.x2 > (extensions.left - app._global.tolerance))
					)
				){
					if(hline.y <= (point.y + app._global.tolerance)){//ymin
						temp = hline.y + 2 * vem;
						if(temp > limits.ymin)
							limits.ymin = temp;
					}

					else if(hline.y >= (point.y - app._global.tolerance)){//ymax
						temp = hline.y - 2 * vem;
						if(temp < limits.ymax)
							limits.ymax = temp;
					}
				}
			});

			//vertical
			_.each(app._global['vertical-line'], function(vline){
				if(	
					!_.contains(extensions.vlines, vline.id) &&
					(
						(vline.y1 < (extensions.bottom + app._global.tolerance) && vline.y1 > (extensions.top - app._global.tolerance)) ||
						(vline.y2 < (extensions.bottom + app._global.tolerance) && vline.y2 > (extensions.top - app._global.tolerance))
					)

				){
					if(vline.x <= (point.x + app._global.tolerance)){//xmin
						temp = vline.x + 2 * hem;
						if(temp > limits.xmin)
							limits.xmin = temp;
					}

					else if(vline.x >= (point.x - app._global.tolerance)){//xmax
						temp = vline.x - 2 * hem;
						if(temp < limits.xmax)
							limits.xmax = temp;
					}
				}
			});

			return {
				limits: limits,
				hlines: extensions.hlines,
				vlines: extensions.vlines,
				endPoints: extensions.endPoints
			};
		},
		updateRelated: function(hlines, vlines, points, event, anchorId, originalCoords, direction){
			var height = this.$el.height(),
				width = this.$el.width();

			//update horizontal lines
			if(direction.y)
				_.each(hlines, function(id){
					var line = _.find(app._global['horizontal-line'], function(hline){ return hline.id === id; }),
						yCoord = trimNumber(event.pageY / height * 100);
					//update line itself
					line.y = yCoord;
					//update its end points
					//left
					app._global.endPoints[line.left].y = yCoord;
					//right
					app._global.endPoints[line.right].y = yCoord;
				});

			//update vertical lines
			if(direction.x)
				_.each(vlines, function(id){
					var line = _.find(app._global['vertical-line'], function(vline){ return vline.id === id; }),
						xCoord = trimNumber(event.pageX / width * 100);
					//update line tiself
					line.x = xCoord;
					//update its end points
					//top
					app._global.endPoints[line.top].x = xCoord;
					//bottom
					app._global.endPoints[line.bottom].x = xCoord;
				});

			//update length of lines that connected to the related points
			_.each(points, function(pointId){
				var point = app._global.endPoints[pointId],
					line;
				//top line
				if(point.top){
					line = _.find(app._global['vertical-line'], function(vline){ return vline.id === point.top; });
					line.y2 = point.y;
				}

				//bottom line
				if(point.bottom){
					line = _.find(app._global['vertical-line'], function(vline){ return vline.id === point.bottom; });
					line.y1 = point.y;
				}

				//left line
				if(point.left){
					line = _.find(app._global['horizontal-line'], function(hline){ return hline.id === point.left; });
					line.x2 = point.x;
				}

				if(point.right){
					line = _.find(app._global['horizontal-line'], function(hline){ return hline.id === point.right; });
					line.x1 = point.x;
				}

			});

			//update points in the local storage
			app.store.set('endPoints', app._global.endPoints);
			app.store.set('horizontal-line', app._global['horizontal-line']);
			app.store.set('vertical-line', app._global['vertical-line']);

			this.redrawAll();
		},
	});

	//trim number only leave two digits after decimal point
	function trimNumber(number){
		return parseFloat(number.toFixed(2));
	}
	

})(Application);