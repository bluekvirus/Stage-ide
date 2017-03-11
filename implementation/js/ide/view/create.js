;(function(app){

	app.view('Create', {
		template: '@context/create.html',
		attributes: {
			tabindex: "1" //make this div focusable in order to use keypress event
		},
		coop: ['active-template-deleted', 'user-reset', 'continue-template-switch', 'template-saved'],
		initialize: function(){
			//indicate whether click event will be triggered or not
			this.clickable = true;
			//lock all the interactions
			this.locked = false;
			//hide end points or not
			this.meshed = true;
			//flag to indicate whether view has generated some kind of layout
			this.generated = false;
			//meta to store currently focusing on which region
			this.currentRegion = '';
		},
		onReady: function(){
			var that = this;
			//guide line
			this.show('guide', 'Create.Guide');
			//layout svg
			this.show('layout', 'Create.Layout');
			//menu arrows
			this.show('arrows', 'Create.Arrows');
			//view-menu
			this.show('view-menu', 'Create.ViewMenu');
			//side-menu
			this.show('side-menu', 'Create.SideMenu');

			//show all stored templates
			_.each(app.store.getAll(), function(item, key){
				if(key !== 'endPoints' && key !== 'horizontal-line' && key !== 'vertical-line' && key !== 'current' && key !== '__opened__' && key !== 'regionView' && key !== ''){//only focus on stored object
					
					//actived one should be highlighed
					if(key === app.store.get('current')){
						that.addTemplateOnMenu(key, true);
						if(app._global.regionView){
							that.loadTemplate(false,  app.store.get('current'));
						}

					}else{
						that.addTemplateOnMenu(key);
					}
				}
			});
			
			//load locally stored template if there is no current
			if(!app.store.get('current') && app._global.regionView){
				_.defer(function(){
					that.getViewIn('side-menu').lockLayout();
				});
			}

			//focus on this.$el to trigger events
			this.$el.focus();

			//consult local storage whether side menu used to be opened or not
			if(app.store.get('__opened__')){
				_.defer(function(){
					that.toggleSideMenu(true);
				});
			}

			//on mouse move use app.coop to show the guide lines
			this.$el.on('mousemove', function(e){
				//prevent default events
				e.preventDefault();

				var constrain = that.checkConstrain(e), x, y;

				//check constrain
				if(!constrain) {
					//re-set guideline
					app.coop('guideline-move',{
						x: 0,
						y: 0
					});
					//set clickable to false
					that.clickable = false;

					return;	
				}else if(typeof constrain === 'boolean'){//normal
					
					that.clickable = true;
					//get x and y
					x = e.pageX;
					y = e.pageY;

					app.coop('guideline-move', {
						x: x,
						y: y
					});

				}else{//magnet

					that.clickable = true;
					//get x and y
					x = constrain.x;
					y = constrain.y;

					app.coop('guideline-move', {
						x: x,
						y: y
					});

				}

			});

			//on press shift key switch the direction of guide line
			this.$el.on('keyup', function(e){
				//prevent default events
				e.preventDefault();

				//shift key pressed
				if(e.which === 16)
					app.coop('guideline-switch');

			});

			this.$el.on('click', function(e){
				var $target = $(e.target);
				app.debug('clicking target...', $target);
				//check whether side menu is active, if yes close it
				if(that.$el.find('.side-menu-trigger').hasClass('active'))
					that.toggleSideMenu();

				//if end point menu is being shown, close menu ONLY and no further operations
				var Menu = that.getViewIn('arrows');
				if(Menu.shown){
					Menu.closeMenu();
					return;
				}

				//if unlocked and unmeshed give a hint and return
				if(that.generated && !that.locked && !that.meshed){
					(new (app.get('Create.UnmeshUnlockInfo'))()).overlay({
						effect: false,
						class: 'unmesh-unlock-info-overlay create-overlay'
					});
					return;
				}

				app.debug($target);
				//for clicking on non-region element when in locking view
				if(that.generated && that.locked && !$target.hasClass('region') && !$target.hasClass('region-cover')){
					while(!$target.hasClass('region'))
						$target = $target.parent();
				}

				//locked and generated means inserting views
				if((that.generated && that.locked) || $target.hasClass('region-cover')){

					//exclude view-menu
					if($target.hasClass('view-menu'))
						return;

					//check whether parent region already be assigned, if yes change current region.
					//console.log(that.getViewIn('generate-view').getRegion(that.currentRegion) && that.getViewIn('generate-view').getRegion(that.currentRegion).parentCt.parentRegion);

					//setup current region
					that.currentRegion = $target.attr('region') || that.currentRegion;
					
					//hightlight clicked region
					//remove highlight
					if(!$target.hasClass('region-cover')){
						that.$el.find('.region-generate-view .region.active').removeClass('active');
						$target.addClass('active');	
						that.adjustRegionCover(true, $target);
					}else{
						that.adjustRegionCover(true);
					}

					app.coop('view-menu-show', {
						$target: $target, //for getting target region
						e: e, //for e.pageX and e.pageY
						currentRegion: that.currentRegion //currently focused region
					});

					//return immediately
					return;
				}

				//only trigger if this.$el is already focused
				if(that.$el.is(':focus') && that.clickable)
					//tell guide line view user clicked
					app.coop('guideline-click');
			});

			//set up templates holder height for scroll
			var height = this.$el.height(),
				blockHeight = this.$el.find('.side-menu-section').outerHeight() * 2 + this.$el.find('.side-menu-item').outerHeight() * 4,
				adjust = (parseFloat(getComputedStyle(document.body).fontSize)) * 0.5; //wrapper class adjustment
			this.$el.find('.side-menu-templates-holder').css({
				height: (height - blockHeight - adjust) + 'px'
			});

			//for resize
			this.listenTo(app, 'app:resized', function(){
				var height = that.$el.height();
				//side menu
				that.$el.find('.side-menu-templates-holder').css({
					height: (height - blockHeight - adjust) + 'px'
				});

				//region-cover
				if(!that.$el.find('.region-cover').hasClass('hidden')){
					that.adjustRegionCover(true, that.$el.find('.region.active'));
				}
			});
		},
		actions: {
			'side-menu': function(){
				this.toggleSideMenu();
			},
		},
		toggleSideMenu: function(opened){
			var $self = this.$el.find('.side-menu-trigger');
			//flash current
			if(!$self.hasClass('active'))
				this.flashCurrent();
			//
			$self.toggleClass('active');
			this.$el.find('.side-menu-list').toggleClass('active');

			//toggle icon
			$self.find('.fa').toggleClass('hidden');

			//flip side menu status in the local storage
			var temp = app.store.get('__opened__');
			app.store.set('__opened__', opened || !temp);
		},
		generateLayout: function(adjusting, overlay){
			var x = [], y = [], that = this;
			//generate a list of x and y coordinates from end points
			_.each(app._global.endPoints, function(endPoint, pid){
				var flag = false;
				if(!_.contains(x, endPoint.x)){//not contained in the x 
					if(!checkContained(x, endPoint, 'x')){//adjust the coordinate if necessary
						x.push(endPoint.x);
						//sort
						x = _.sortBy(x, function(num){ return num;});
					}
				}

				if(!_.contains(y, endPoint.y)){//y
					if(!checkContained(y, endPoint, 'y')){
						y.push(endPoint.y);
						//sort
						y = _.sortBy(y, function(num){ return num;});
					}
				}
			});

			//augment horizontal lines and vertical lines based on coordiates extracted from end points
			//horizontal
			_.each(app._global['horizontal-line'], function(hline){
				//left anchor
				checkContained(x, hline, 'x1');
				//right anchor
				checkContained(x, hline, 'x2');
				//y
				checkContained(y, hline, 'y');
			});

			//vertical
			_.each(app._global['vertical-line'], function(vline){
				//top anchor
				checkContained(y, vline, 'y1');
				//bottom anchor
				checkContained(y, vline, 'y2');
				//x
				checkContained(x, vline, 'x');
			});

			if(overlay){//only show overlay, when user click generate directly
				app.remote({
					url: '/api/generate',
					payload: {
						endPoints: app._global.endPoints,
						//max length h/v lines are 100 (%).
						hlines: app._global['horizontal-line'],
						vlines: app._global['vertical-line'],
					}
				})
				.done(function(data){
					
					app.view('_Demo', {
						layout: _.extend(data.layout, {
							width: 400 * 1.5,
							height: 300 * 1.5,
						}), 
						attributes: {style: 'border:2px solid #FFF;'},
						onReady: function(){
							_.each(this.regions, function(def, r){
								this[r].$el.css('color', '#FFF').text(r.split('-')[2]);
							}, this);
						},
					});
					app.view('_Code', {
						template: '<textarea style="width:100%;" rows="20"></textarea>',
						onReady: function(){
							this.$el.find('textarea').val(JSON.stringify(data.layout.split).replace(/\\/g, ""));
						},
					});
					app.view({
						data: {
							tabs: ['Preview', 'Layout'],
						},
						template: [
							'<ul class="nav nav-tabs">',
								'{{#tabs}}<li activate="single" tabId="{{.}}"><a>{{.}}</a></li>{{/tabs}}',
							'</ul>',
							'<div region="tabs"></div>',
							'<div><button action="close" type="button" class="btn btn-primary btn-lg btn-block">Close</button></div>',
						],
						onReady: function(){
							//activate default tab
							this.activate('single', 0, true);
						},
						onItemActivated: function($item){
							var tabId = $item.attr('tabId');
							if(tabId === 'Preview')
								this.tab('tabs', app.get('_Demo'), tabId);
							else
								this.tab('tabs', app.get('_Code'), tabId);
						},
						actions: {
							close: function(){
								this.close();
							}
						}}, true)
					.overlay({
						effect: false,
						class: 'generate-overlay',
					});
				})
				.fail(function(error){
					app.notify('Error!', 'Generating error.', 'error', {icon: 'fa fa-reddit-alien'});
				});

			}else{
				app.remote({
					url: '/api/generate',
					payload: {
						endPoints: app._global.endPoints,
						//max length h/v lines are 100 (%).
						hlines: app._global['horizontal-line'],
						vlines: app._global['vertical-line'],
					}
				})
				.done(function(data){
					if(!adjusting) app.notify('Generated!', 'Layout has been generated.', 'ok', {icon: 'fa fa-fort-awesome'});
					var _Demo = app.view(/*'_Demo', */{
						layout: _.extend(data.layout)
					});
					that.show('generate-view', _Demo);
					if(!adjusting){
						// that.generateLock();
						// that.generateUnmesh();
						
						//object to store region-view configuration globally
						app._global.regionView = app._global.regionView || {};
						//sync with local storage
						app.store.set('regionView', $.extend(true, {}, app._global.regionView));
					}

					//contruct a mapping from point to region
					/*var regions = that.getViewIn('generate-view').$el.find('.region'),
						height = that.$el.height(),
						width = that.$el.width();

					_.each(regions, function(el){
						var $el = $(el);

						var boundingRect = el.getBoundingClientRect();

						//translate boundingRect from exact coordinates to percentage
						

						
					});*/
					

					//re-render views
					if(_.keys(app._global.regionView).length){
						_.each(app._global.regionView, function(obj, r){
							//load view into the region
							that.getViewIn('generate-view').spray(that.$el.find('[region="' + r + '"]'), obj.view, {
								data: obj.data
							});
						});
					}
				})
				.fail(function(error){
					app.notify('Error!', 'Generating error.', 'error', {icon: 'fa fa-reddit-alien'});
				});

				//set generated flag to true
				this.generated = true;
			}

			//debug log
			app.debug('x array', x, 'y array', y);
			app.debug('endPoints exported from generate action', app._global.endPoints);
			app.debug('h-lines exported from generate action', app._global['horizontal-line']);
			app.debug('v-lines exported from generate action', app._global['vertical-line']);
		},
		adjustRegionCover: function(show, $el){
			if(show){
				//for when region-cover is already being shown
				if(!$el) return;

				var left = $el.offset().left,
				top = $el.offset().top,
				height = $el.height(),
				width = $el.width();

				var hem = parseFloat(getComputedStyle(document.body).fontSize),
					wem = parseFloat(getComputedStyle(document.body).fontSize);

				this.$el.find('.region-cover').css({
					left: left + wem + 'px',
					top: top + hem + 'px',
					height: height - 2 * hem + 'px',
					width: width - 2 * wem + 'px'
				}).removeClass('hidden');
			}else{
				this.$el.find('.region-cover').addClass('hidden');
			}
		},
		loadTemplate: function($button, initial){
			//reset this.generated
			this.generated = false;

			var name = initial || $button.attr('template-name'),
				temp = app.store.get(name),
				oldName = this.$el.find('.side-menu-list .current-name').text(),
				old = {};

			//save old template, only if the current name is not untitled
			if(oldName !== 'untitled'){
				old.endPoints = app._global.endPoints;
				old['horizontal-line'] = app._global['horizontal-line'];
				old['vertical-line'] = app._global['vertical-line'];
				//store region view
				old.regionView = app._global.regionView;
				app.store.set(oldName, old);
			}

			//reset app._global object
			app._global.endPoints = temp.endPoints;
			app._global['horizontal-line'] = temp['horizontal-line'];
			app._global['vertical-line'] = temp['vertical-line'];
			app._global.regionView = temp.regionView;

			//reset local stored object for current template
			app.store.set('endPoints', temp.endPoints);
			app.store.set('horizontal-line', temp['horizontal-line']);
			app.store.set('vertical-line', temp['vertical-line']);
			app.store.set('regionView', temp.regionView);

			//refresh
			this.show('guide', 'Create.Guide');
			//layout svg
			this.show('layout', 'Create.Layout');
			//menu arrows
			this.show('arrows', 'Create.Arrows');

			//highlight currently actived template
			if($button){
				this.$el.find('.side-menu-templates-holder .side-menu-item-text').removeClass('active');
				$button.addClass('active');
			}
			//change current loaded template name
			this.$el.find('.side-menu-list .current-name').text(name);

			var SideMenu = this.getViewIn('side-menu');
			//for region and views, if locked generate view directly
			if(app._global.regionView){
				//SideMenu.lockLayout will trigger generateLayout in create.js
				if(!this.locked)
					SideMenu.lockLayout();
				else
					this.generateLayout();
			}else{
				//make sure unlock and meshed
				if(this.locked)
					SideMenu.lockLayout();
				if(!this.meshed)
					SideMenu.meshLayout();
			}

			app.notify('Loaded!', 'Template <strong>' + name + '</strong> has been loaded.', 'ok', {icon: 'fa fa-fort-awesome'});
		},
		checkConstrain: function(e){
			var that = this;
			//if locked return false
			if(this.locked) return false;
			//if no mesh return false
			if(!this.meshed) return false;
			//stay inside window, use 5px as a buffer
			if(e.pageX < 5 || e.pageX > this.$el.width() - 5 || e.pageY < 5 || e.pageY > this.$el.height() - 5)
				return false;
			//menu is showing return false
			if(this.getViewIn('arrows').shown) return false;
			//dragging an end point return false
			if(this.getViewIn('layout').dragging) return false;
			//hover on points
			var forbiddenClasses = ['end-point', 'side-menu-trigger', 'fa', 'operations-item', 'operations-holder', 'operations-subitem'],
				forbidden = false;
			_.each(forbiddenClasses, function(classname){
				if(_.string.include($(e.target).attr('class'), classname))
					forbidden = true;
			});
			if(forbidden) return false;
			//keep a 2em gap
			var horizontal = this.getViewIn('guide')._horizontal, //get now doing horizontal line or vertical line
				em = horizontal ? (parseFloat(getComputedStyle(document.body).fontSize)) / this.$el.height() * 100
								: (parseFloat(getComputedStyle(document.body).fontSize)) / this.$el.width() * 100, //get default em and translate it into percentage
				tooClose = false,
				yPer = e.pageY / this.$el.height() * 100,
				xPer = e.pageX / this.$el.width() * 100;


			if(horizontal){//horizontal lines
				//check
				_.each(app._global['horizontal-line'], function(hline){
					if(xPer <= hline.x2 && xPer >= hline.x1 && yPer >= hline.y - 2 * em && yPer <= hline.y + 2 * em)
						tooClose = true;
				});

			}else{//vertical lines
				_.each(app._global['vertical-line'], function(vline){
					if(yPer <= vline.y2 && yPer >= vline.y1 && xPer >= vline.x - 2 * em && xPer <= vline.x + 2 * em)
						tooClose = true;
				});
			}

			if(tooClose) return false;

			//magnet effect within 1em radius to a certain point
			var x,y, distance;
			_.each(app._global.endPoints, function(endPoint, id){

				//calculate distance
				distance = horizontal ? Math.abs(endPoint.y - yPer) : Math.abs(endPoint.x - xPer);
				//if less than 1 em assign new x, y for return
				if(distance < 1.25 * em){
					if(horizontal){
						x = e.pageX;
						y = endPoint.y / 100 * that.$el.height();
					}else{
						x = endPoint.x / 100 * that.$el.width();
						y = e.pageY;
					}
				}
			});

			if(x && y) return {x: x, y: y};//returns an object differs from return a boolean, though truely.

			return true;
		},
		addTemplateOnMenu: function(name, active){
			var htmlStr = '<div class="side-menu-item wrapper wrapper-horizontal-2x clearfix">' +
								'<span class="side-menu-item-text" action="load-template" template-name="' + name + '">'+ name +'</span>' +
								'<div class="pull-right" action="delete-template" template-name="' + name + '"><i class="fa fa-close"></i></div>' +
							'</div>',
			$elem = $(htmlStr);

			//newly added template. active text and change current template value
			if(active){
				//change active class
				this.$el.find('.side-menu-templates-holder .side-menu-item-text').removeClass('active');
				$elem.find('.side-menu-item-text').addClass('active');

				//change template value
				this.$el.find('.side-menu-list .current-name').text(name);

				//change stored current value
				//app.store.set('current', name);
			}

			this.$el.find('.side-menu-templates-holder').append($elem);
		},
		reset: function(){
			//clear cache for current layout
			app.store.remove('endPoints');
			app.store.remove('horizontal-line');
			app.store.remove('vertical-line');
			app.store.remove('regionView');
			//app.store.remove('current');
			//reset global objects
			app._global.endPoints = undefined;
			app._global['horizontal-line'] = undefined;
			app._global['vertical-line'] = undefined;
			app._global.regionView = undefined;
			
			//reset layout
			this.resetLayout(true);

			//reset lock and mesh by calling functions in child view
			if(this.locked)
				this.getViewIn('side-menu').lockLayout();
			if(!this.meshed)
				this.getViewIn('side-menu').meshLayout(this.$el.find('.operations-item .hide-button'));

			//hide view-menu
			this.$el.find('.view-menu').addClass('hidden');
			
			//refresh
			this.show('guide', 'Create.Guide');
			//layout svg
			this.show('layout', 'Create.Layout');
			//menu arrows
			this.show('arrows', 'Create.Arrows');
		},
		resetLayout: function(userReset){
			//reset generated flag
			this.generated = false;

			//reset generated view
			if(this.getViewIn('generate-view')) this.getViewIn('generate-view').close();

			//reset regionView table
			app._global.regionView = undefined;
			//clear cache
			app.store.remove('regionView');

			//reset locker index
			this.$el.find('.locker').addClass('hidden').css(({'z-index': 3}));

			//send notification
			if(!userReset) app.notify('Layout Resetted.', 'You have changed original layout. The generated view has been resetted.', 'error', {icon: 'fa fa-reddit-alien'});
		},
		flashCurrent: function(){
			this.$el.find('.side-menu-list .current-name-holder').addClass('flash');
		},
		//---------------------------------- app coops ----------------------------------//
		onLayoutResetted: function(){//when user adding/remving lines after generated 
			this.resetLayout(true);
		},
		onActiveTemplateDeleted: function(){
			this.reset();
		},
		onUserReset: function(){
			this.reset();
		},
		onTemplateSaved: function(meta){
			if(meta['new-gen']){//new template

				//reset locally stored current. 
				//this.reset() only resets layout, does not clean current key in the local storage
				app.store.remove('current');

				//remove all the active class
				this.$el.find('.side-menu-templates-holder .side-menu-item-text').removeClass('active');

				//change template value to untitled
				this.$el.find('.side-menu-list .current-name').text('untitled');

				//reset layout
				this.reset();

			}else if(meta.switching){//switching template
				//load template
				this.loadTemplate(meta.switching);
				//set current
				app.store.set('current', meta.switching.text());
			}else if(meta.overwrite){
				//??overwrite needs some more actions??
			}

			//if not continue, add current
			if(!meta.continue && !meta.overwrite) this.addTemplateOnMenu(meta.name, true);
			//flash text
			this.flashCurrent();
		},
		//---------------------------------- view coops ----------------------------------//
		onLayoutAdjusted: function(){//dragging end points
			var that = this;
			//only response if some layout has already been generated
			if(!this.generated) return;

			//reset layout
			this.generateLayout(true);
		},
		onSyncLocal: function(){//sync local storage
			//sync end points
			app.store.set('endPoints', app._global.endPoints);
			//sync horizontal lines
			app.store.set('horizontal-line', app._global['horizontal-line']);
			//sync vertical lines
			app.store.set('vertical-line', app._global['vertical-line']);
		},
		onViewMenuClose: function(){
			this.$el.find('.view-menu').addClass('hidden');
			//clean active on region
			if(this.generated) this.$el.find('.region-generate-view .region.active').removeClass('active');
			//hide region-cover
			this.adjustRegionCover(false);
		},
		onViewMenuAddView: function(obj){
			var content = obj.content,
				data = obj.data,
				method = obj.method;

			this.getViewIn('generate-view').spray(this.$el.find('[region="' + this.currentRegion + '"]'), content, {
				data: data
			});
			//hide menu
			this.$el.find('.view-menu').addClass('hidden');
			//remove active class on region
			this.$el.find('.region-generate-view .region.active').removeClass('active');
			//hide region-cover
			this.adjustRegionCover(false);
			
			//add region to list
			app._global.regionView[this.currentRegion] = {
				view: content,
				data: data,
				method: method
			};
			//sync it in local storage
			app.store.remove('regionView');
			app.store.set('regionView', $.extend(true, {}, app._global.regionView));
		},
		onSideMenuClicked: function(){
			//hide view menu
			this.$el.find('.view-menu').addClass('hidden');

			//hide arrow
			this.$el.find('.end-point-menu').addClass('hidden');
		},
		onLayoutLocked: function(locked){
			var $locker = this.$el.find('.locker');

			this.locked = locked;

			if(locked){//newly locked

				//generate layout
				this.generateLayout();

				//lock always show .
				//change lock div z-index to 3, for view inserting
				$locker.css({'z-index': 3}).removeClass('hidden');

				//re-set guideline
				app.coop('guideline-move',{
					x: 0,
					y: 0
				});

			}else{//newly unlocked

				//if generated, only change z-index do not hide
				//if not generated, just hide
				if(this.generated){
					//change lock div z-index to -1, for easier dragging
					$locker.css({'z-index': -2}).removeClass('hidden');

					//hide view adding menu
					this.$el.find('.view-menu').addClass('hidden');
					//clean active on region
					this.$el.find('.region-generate-view .region.active').removeClass('active');
					//hide region-cover
					this.adjustRegionCover(false);
				}
				//not generated, just hide
				else{
					$locker.addClass('hidden');
				}

			}
		},
		onLayoutMeshed: function(meshed){
			this.meshed = meshed;
		},
		onOverlayGenerate: function(){
			this.generateLayout(false, true);
		},
	});

	function checkContained(arr, obj, key){
		var flag = false;
		//check whether in the margin of error
		//if yes, correct it
		_.each(arr, function(single){
			if(
				(single === 0 && obj[key] <= app._global.tolerance) ||//tolerance is 0.02 need to magnify it 100 times
				(single === 100 && obj[key] >= 100 - app._global.tolerance) ||
				(obj[key] >= (single - app._global.tolerance) && obj[key] <= (single + app._global.tolerance))
			){
				obj[key] = single;
					flag = true;
			}
		});
		return flag;
	}

})(Application);