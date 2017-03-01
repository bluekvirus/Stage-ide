/**
 * flexLayout v0.3.0, http://TBD
 * ===================================
 * Highly customizable easy to use, light weight, layout/split jQuery plugin
 * 
 * (c) 2016 mr-beaver, http://TBD
 * MIT Licensed
 */

;(function($){

	$.fn.flexLayout = function(layout, opts, _cb/*TBI*/){
    
		var _options = {}, /*store options*/
			_layoutArr = []; /*store array*/

		//check whether layout is given
		if($.isPlainObject(layout)){
			opts = layout;
			_layoutArr = $.fn.flexLayout.defaults.layout;
		}else{
			_layoutArr = layout || $.fn.flexLayout.defaults.layout;
		}
		_options = $.extend({}, $.fn.flexLayout.defaults.options, opts);
		//setup layout
		return this.each(function(index, el){
			var _taskQue = [],  //task queue, setup layout iteratively
				$el = $(el);
			/**
			 * Only setup height/width for the first level, since the following levels will self-expand with style flex.
			 * Therefore, need to check whether el already has flex style properties(e.g. setup by previous calling), if yes do not setup height/width.
			 * 
			 * !Caveat: do not check $el.css('flex-XXX'), it might return wrong values. Use DOM node instead.
			 */
			if(!el.style['flex-grow'] && !el.style['flex-shrink'] && !el.style['flex-basis'])
				$el.css({height: _options.height, width: _options.width});
			//push the first task into queue
			_taskQue.push({
				$element: $el,
				layout: _layoutArr,
				options: _options
			});
			//traverse task queue
			while(_taskQue.length){
				setLayout(_taskQue[0].$element, _taskQue[0].layout, _taskQue[0].options, _taskQue);
			}
		});
	};

	/**
	 * Default configuration for the plugin
	 */
	$.fn.flexLayout.defaults = {
		/*defines the final layout, ['...', '...', ['...', ['...', '...']]]*/
		/*layout: [
			'80px:class="top banner":"<div>This is top banner.</div>"',
			['1:id="content"', ['1:.content-left:"This is left content."','2:.content-right']]
		],*/
		layout: [], //do not give any default.
		options: {
			/*defines the height of the requesting element; '...string...'*/
			height: '100%',
			/*defines the width of the requesting element '...string...'*/
			width: '100%',
			/*defines the direction of the layout; 'h', 'v' or ['h', 'v', 'v', ...]*/
			dir: 'h',
			/*defines whether the width/height of created blocks can be adjusted or not, boolean or [boolean, boolean]*/
			adjust: false,
			/*defines the style of divide bars between created blocks, {...css object}, '...string of class name...', boolean or [..., ..., ..., ...]*/
			bars: {flex: '0 0 2px', 'background-color': '#ddd'}
		}
	};

	/**
	 * Default flex-box 'justify-content' configuration used inside the plug-in. 
	 * If you do not like the default configuration, you can change it here.
	 */
	$.fn.flexLayout.flexConfig = {
		'justify-content': 'flex-start'
	};


	/**
	 * Make $.fn.flexlayout = $.fn.flexLayout, for convenience
	 */
	$.fn.flexlayout = $.fn.flexLayout;

	/**
	 * main layout setup function
	 */
	function setLayout($el, layout, opts, _tq){
		//check direction configure to setup flex-flow
		var _flow = (($.isArray(opts.dir) ? opts.dir[0] : opts.dir) === 'v') ? 'row' : 'column';
		//setup flex parameters
		$el.css({display: 'flex', 'flex-flow': _flow,  'justify-content': $.fn.flexLayout.flexConfig['justify-content']});
		//go through layout array
		$.each(layout, function(index, config){
				//get size
			var _dimension = $.isArray(config) ? config[0].split(':')[0] : config.split(':')[0],
				//check whether fixed or flexible
				_style = /(px|em)/.test(_dimension) ? 'style = "flex: 0 0 ' + _dimension + ';" ' : 'style="flex: ' + _dimension + ' 1 0;" ', 
				//check attributes
				_attribute = $.isArray(config) ? trimAttr(config[0].split(':')[1]) : trimAttr(config.split(':')[1]),
				//added for insert html string
				_html = $.isArray(config) ? '' : ((config.split(':')[2]) ? config.split(':')[2].replace(/^"|^'/, '').replace(/"$|'$/, '') : ''),
				//make block object
				_$block = $('<div ' + _style + _attribute + '>' + _html + '</div>'),
				//save a copy of arrays, it might be multiple same level of blocks; therefore do not 'shift' on original array
				_adjust = $.isArray(opts.adjust) ? opts.adjust.slice() : opts.adjust, //use Array.slice() to copy an original array
				_bars = $.isArray(opts.bars) ? opts.bars.slice() : opts.bars,
				_dir = $.isArray(opts.dir) ? opts.dir.slice() : opts.dir;

			//append block
			_$block.appendTo($el);
			//insert bars if bar is true or adjustable is true
			if( (($.isArray(_bars) ? _bars[0] : _bars) || ($.isArray(_adjust) ? _adjust[0] : _adjust)) && index < layout.length - 1){
				var _barstyle = trimBarStyle($el, ($.isArray(_bars) ? _bars[0] : _bars)), //trim/fetch barstyle for later use, {}
					//bar object for later use, if necessary
					_$bar = $('<div ' + _barstyle + '></div>');
				//append bar
				_$bar.appendTo($el);
				//check whether adjustable is true or not
				if($.isArray(_adjust) ? _adjust[0] : _adjust && !/(px|em|%)/.test(_dimension)){//adjust is true and not fixed height/width
					//register events on bars
					registerResize(_$bar, $.isArray(_dir) ? _dir[0] : _dir, layout[index + 1]);
				}
			}
			//multi-layer layout, push next layer into task que
			if($.isArray(config)){
				_tq.push({
					$element: _$block,
					layout: config[1],
					options: {
						dir: 	(function(){//if array return shifted, if not switch direction
									if($.isArray(_dir)) {_dir.shift(); return _dir[0];}
									else{ return (_dir === 'v') ? 'h' : 'v'; }
								})(),
						adjust: (function(){//if array return shifted
									if($.isArray(_adjust)) {
										_adjust.shift();
										if(!_adjust.length) _adjust = $.fn.flexLayout.defaults.options.adjust;//in case the given array is shorter
									}
									return _adjust;
								})(),
						bars: 	(function(){//if array return shifted
									if($.isArray(_bars)) {
										_bars.shift();
										if(!_bars.length) _bars = $.fn.flexLayout.defaults.options.bars;//in case the given array is shorter
									}
									return _bars;
								})()
					}
				});
			}
		});
		//remove the current finished task
		_tq.shift();
	}

	/**
	 * Get barstyle given by user.
	 * Or fill the barstyle if user want to have bars but did not provide bar style
	 */
	function trimBarStyle($el, bstyle){
		if($.type(bstyle) === 'boolean'){//no barstyle
			return '';//'style="flex: 0 0 2px;background-color: #ddd;"';
		}else if($.isPlainObject(bstyle)){//css object
			var _styleStr = 'style="';
			$.each(bstyle, function(key, value){
				_styleStr += key + ': ' + value + ';';
			});
			return _styleStr + '"';
		}else if($.type(bstyle) === 'string'){//string of class names
			return 'class="' + bstyle + '"';
		}else{//wrong input
			throw new Error('jQuery plugin::flexLayout::error on barstyle settings');
		}

	}

	/**
	 * Trim attributes given by user, if user uses selectors style(e.g. #, .)
	 *
	 * Note: if using selector style, the function performs under the assumption that only one 'id' exits.
	 * 		 That is, there is only one '#' in the selector style string.
	 */
	function trimAttr(attrStr){
		var _attr = '',
			_classArr = [];
		//empty
		if(!attrStr)
			return '';
		//selector style
		if(/(#|\.)/.test(attrStr) && !/(href)/.test(attrStr)){
			//remove spaces
			attrStr = attrStr.replace(/\s/g, '');
			//id exists
			if(/#.*?(?=\.|$)/i.test(attrStr)){
				_attr += attrStr.match(/#.*?(?=\.|$)/i)[0].replace('#', 'id="') + '"';
				//remove # part in the original string for later use
				attrStr = attrStr.replace(attrStr.match(/#.*?(?=\.|$)/i)[0], '');
			}
			if(attrStr){
				//add classes to attribute string
				_attr += ' class="';
				_classArr = attrStr.split('.');
				$.each(_classArr, function(index, str){
					if(str)//ignore empty string caused by split
						_attr += str + ((index === _classArr.length - 1) ? '' : ' ');
				});
				_attr +='"';
			}
			return _attr;
		}
		//region and view
		else if(!/(=)/.test(attrStr)){
			//check whether capitalized(View)
			if(attrStr.charAt(0) === attrStr.charAt(0).toUpperCase())
				return 'view="' + attrStr + '" ';
			else if(attrStr.charAt(0) === attrStr.charAt(0).toLowerCase())
				return 'region="' + attrStr + '"';
			else{
				console.warn('please check your region/view name setting.');
				return '';
			}
		}
		//inline style
		else{
			return attrStr;
		}
	}

	/**
	 * register resize event on bars, if necessary
	 */
	function registerResize($bar, dir, nextConfig){
		//cehck whether the next block has fixed height/width, if yes return
		if(/(px|em)/.test($.isArray(nextConfig) ? nextConfig[0].split(':')[0] : nextConfig.split(':')[0]))
			return;
		//add cursor style according to dir
		$bar.css({cursor: (function(){return (dir === 'v') ? 'ew-resize' : 'ns-resize';})()});
		//register mousedown event on bars
		$bar.on('mousedown', function(e){
			/**
			 * Note: browsers register all the listening event at the second phase of JS loading.
			 * 		 That is, after all the DOM elements are inserted even those ones inserted by the JS.
			 * 		 Therefore one might think the next block 'has not been inserted' through the code;
			 * 		 however by the time browsers register this event the next block is already there.
			 */
			e.preventDefault();//pervent default
			var $this = $(this),
				$prev = $this.prev(),
				$next = $this.next(),
				$parent = $this.parent(),
				prevStart = (dir === 'v') ? $prev.offset().left - $parent.offset().left : $prev.offset().top - $parent.offset().top,
				nextEnd = (dir === 'v') ? ($next.offset().left + $next.width()) - $parent.offset().left : ($next.offset().top + $next.height()) - $parent.offset().top,
				total = nextEnd - prevStart,//total height/width of two blocks
				totalFlexGrow = Number.parseFloat($prev.css('flex-grow')) + Number.parseFloat($next.css('flex-grow'));
				//mousemove event registered on $this.parent()
				$parent.on('mousemove', function(e){
					e.preventDefault();//pervent default
					//get current position
					var relX = e.pageX - $parent.offset().left,
						relY = e.pageY - $parent.offset().top,
						prevPercent = (dir === 'v') ? (relX - prevStart) / total : (relY - prevStart) / total,
						nextPercent = 1 - prevPercent,
						min = 10;//minimum percentage of a block
					if(prevPercent * 100 < min || nextPercent * 100 < min){
						$parent.unbind('mousemove');//unbind mousemove if one block is less than minimum percentage
						return;
					}
						
					$prev.css({'flex-grow': prevPercent * totalFlexGrow});
					$next.css({'flex-grow': nextPercent * totalFlexGrow});
					//unbind mousemove if mouseup
					$(window).on('mouseup', function(){
						$parent.unbind('mousemove');
					});
				});
		});
	}

}(window.jQuery));