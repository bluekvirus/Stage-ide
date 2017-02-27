;(function(app){

	app.context('Create', {
		template: '@context/create.html',
		attributes: {
			tabindex: "1" //make this div focusable in order to use keypress event
		},
		coop: ['template-added', 'template-reseted', 'generate-overwrite'],
		initialize: function(){
			//indicate whether click event will be triggered or not
			this.clickable = true;
			//lock all the interactions
			this.locked = false;
			//hide end points or not
			this.meshed = true;
			//flag to indicate whether view has generated some kind of layout
			this.generated = false;
			//flag to indicate whether showing view configuration menu or not
			this.viewMenu = false;
			//meta to store currently focusing on which region
			this.currentRegion = '';
			//meta for region view table
			this.regionView = {};
		},
		onTemplateAdded: function(name){
			this.addTemplateOnMenu(name, true);
			this.flashCurrent();
		},
		onTemplateReseted: function(){
			this.reset();
		},
		onSyncLocal: function(){
			//sync end points
			app.store.set('endPoints', app._global.endPoints);
			//sync horizontal lines
			app.store.set('horizontal-line', app._global['horizontal-line']);
			//sync vertical lines
			app.store.set('vertical-line', app._global['vertical-line']);
		},
		onReady: function(){
			var that = this;
			//guide line
			this.show('guide', 'Create.Guide');
			//layout svg
			this.show('layout', 'Create.Layout');
			//menu arrows
			this.show('arrows', 'Create.Arrows');

			//show all stored templates
			_.each(app.store.getAll(), function(item, key){
				if(key !== 'endPoints' && key !== 'horizontal-line' && key !== 'vertical-line' && key !== 'current' && key !== '__opened__'){//only focus on stored object
					
					//actived one should be highlighed
					if(key === app.store.get('current')){
						that.addTemplateOnMenu(key, true);
					}else{
						that.addTemplateOnMenu(key);
					}
				}
			});
			
			//focus on this.$el to trigger events
			this.$el.focus();

			//consult local storage whether side menu used to be opened or not
			if(app.store.get('__opened__')){
				var $trigger = this.$el.find('.side-menu-trigger'),
					$list = this.$el.find('.side-menu-list');

				//flash content
				this.flashCurrent();
				//
				$trigger.toggleClass('active');
				$list.toggleClass('active');

				//toggle icon
				$trigger.find('.fa').toggleClass('hidden');
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
				//if end point menu is being shown, close menu ONLY and no further operations
				var Menu = that.getViewIn('arrows');
				if(Menu.shown){
					Menu.closeMenu();
					return;
				}

				//if view menu shown, return
				if(_.string.include($target.attr('class'), 'view-menu') || $target.is('input')){
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

				//locked and generated means inserting views
				if((that.generated && that.locked) || $target.hasClass('region-cover')){

					//setup current region
					that.currentRegion = $target.attr('region');

					//clean up input text
					that.$el.find('.view-menu #view-menu-input').val('');
					
					//hightlight clicked region
					//remove highlight
					if(!$target.hasClass('region-cover')){
						that.$el.find('.region-generate-view .region.active').removeClass('active');
						$target.addClass('active');	
						that.adjustRegionCover(true, $target);
					}else{
						that.adjustRegionCover(true);
					}

					//get view list
					app.remote({
						url: '/api/getViewList'
					})
					.done(function(views){
						//clean up old lists
						that.$el.find('.view-menu-list').empty();
						//populate the list
						_.each(views, function(viewName){
							that.$el.find('.view-menu-list').append('<div class="view-menu-list-item" action="existing-view-click"><span>' + viewName + '</span></div>');
						});
					});

					if(!_.string.include($target.attr('class'), 'side-menu')){
						that.$el.find('.view-menu').removeClass('hidden').css({
							top: (($window.height() - e.pageY) < that.$el.find('.view-menu').height()) ? (e.pageY - that.$el.find('.view-menu').height()) : e.pageY,
							left: e.pageX
						});	
					}else{
						that.$el.find('.view-menu').addClass('hidden');
					}
					

					//indicate this.viewMenu is showing
					this.viewMenu = true;

					//return immediately
					return;
				}

				//only trigger if this.$el is already focused
				if(that.$el.is(':focus') && that.clickable)
					//tell guide line view user clicked
					app.coop('guideline-click');
			});

			//click event to show menu
			/*this.$el.find('.side-menu-trigger').on('click', app.throttle(function(e){
				//prevent default events
				e.preventDefault();

				var $this = $(this);
				//flash current
				if(!$this.hasClass('active'))
					that.flashCurrent();
				//
				$this.toggleClass('active');
				that.$el.find('.side-menu-list').toggleClass('active');

				//toggle icon
				$this.find('.fa').toggleClass('hidden');

				//flip side menu status in the local storage
				var temp = app.store.get('__opened__');
				app.store.set('__opened__', !temp);
			}));*/

			//click side menu close all other menus
			this.$el.find('.side-menu').on('click', app.throttle(function(e){
				//view menu
				that.$el.find('.view-menu').addClass('hidden');

				//arrow
				that.$el.find('.end-point-menu').addClass('hidden');
			}));

			//view input change need to de-highlight or highlight view menu list item
			this.$el.find('#view-menu-input').on('keyup', _.debounce(function(e){
				var $this = $(this),
					current = $this.val(),
					flag = false;

				//filter only
				_.each(that.$el.find('.view-menu-list .view-menu-list-item'), function(el){
					var $el = $(el);
					//has valid input, check string
					if(current){
						if(_.string.include($el.text().toLowerCase(), current.toLowerCase()))
							$el.removeClass('hidden');
						else
							$el.addClass('hidden');
					}else{
						//show all the views
						$el.removeClass('hidden');
					}
				});

			}, 150));

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
				that.$el.find('.side-menu-templates-holder').css({
					height: (height - blockHeight - adjust) + 'px'
				});
			});

			//for animation end
            this.$el.find('.side-menu-list .current-name-holder').bind('webkitAnimationEnd', function(){
               $(this).removeClass('flash');
            });
            this.$el.find('.side-menu-list .current-name-holder').bind('animationend', function(){
                $(this).removeClass('flash');
            });
		},
		actions: {
			'side-menu': function($self){
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
				app.store.set('__opened__', !temp);
			},
			lock: function($self){
				//check whether already generated layout, if not gnerate, if yes just lock
				if(this.generated)
					this.lockLayout($self);
				else
					this.generateLayout();
			},
			generate: function(){//need to align lines, ignore margin of errors
				var that = this,
					flag = false;
				//check whether there are any view has been inserted
				if(this.getViewIn('generate-view'))
					flag = true;
					/*_.each(_.keys(this.getViewIn('generate-view').regions), function(regionName){
						if(that.getViewIn('generate-view').getViewIn(regionName))
							flag = true;
					});*/

				if(flag)
					(new (app.get('Create.GenerateConfirm'))()).overlay({
						effect: false,
						class: 'generate-confirm-overlay create-overlay danger-title'
					});
				else
					this.generateLayout();
			},
			reset: function(){
				this.reset();
			},
			save: function(){
				var Save = app.get('Create.Save');
				(new Save()).overlay({
					effect: false,
					class: 'save-overlay create-overlay'
				});
			},
			'load-template': function($self){
				var name = $self.attr('template-name'),
					temp = app.store.get(name),
					oldName = this.$el.find('.side-menu-list .current-name').text(),
					old = {};

				//save old template, only if the current name is not untitled
				if(oldName !== 'untitled'){
					old.endPoints = app._global.endPoints;
					old['horizontal-line'] = app._global['horizontal-line'];
					old['vertical-line'] = app._global['vertical-line'];
					app.store.set(oldName, old);
				}

				//reset app._global object
				app._global.endPoints = temp.endPoints;
				app._global['horizontal-line'] = temp['horizontal-line'];
				app._global['vertical-line'] = temp['vertical-line'];

				//reset local stored object for current template
				app.store.set('endPoints', temp.endPoints);
				app.store.set('horizontal-line', temp['horizontal-line']);
				app.store.set('vertical-line', temp['vertical-line']);

				//refresh
				this.show('guide', 'Create.Guide');
				//layout svg
				this.show('layout', 'Create.Layout');
				//menu arrows
				this.show('arrows', 'Create.Arrows');

				//highlight currently actived template
				this.$el.find('.side-menu-templates-holder .side-menu-item-text').removeClass('active');
				$self.addClass('active');
				//change current loaded template name
				this.$el.find('.side-menu-list .current-name').text(name);
				//flash text
				this.flashCurrent();
				//set current
				app.store.set('current', name);

				app.notify('Loaded!', 'Template <strong>' + name + '</strong> has been loaded.', 'ok', {icon: 'fa fa-fort-awesome'});
			},
			'delete-template': function($self){
				var Delete = app.get('Create.Delete');
				(new Delete({
					data: {
						name: $self.attr('template-name'),
						$elem: $self
					}
				})).overlay({
					effect: false,
					class: 'delete-overlay create-overlay danger-title',
				});
			},
			'new-template': function(){
				//reset locally stored current
				app.store.remove('current');

				//remove all the active class
				this.$el.find('.side-menu-templates-holder .side-menu-item-text').removeClass('active');

				//change template value to untitled
				this.$el.find('.side-menu-list .current-name').text('untitled');

				//reset layout
				this.reset();
			},
			'hide-end-points': function($self){
				this.meshLayout($self);
			},
			'existing-view-click': function($self){
				//only toggles active classes, now only add existing class
				$self.siblings().removeClass('active');
				$self.addClass('active');
			},
			'view-cancel': function(){
				this.$el.find('.view-menu').addClass('hidden');
				//clean active on region
				if(this.generated) this.$el.find('.region-generate-view .region.active').removeClass('active');
				//hide region-cover
				this.adjustRegionCover(false);
			},
			'view-add': function(){
				//check which one is active
				var name = this.$el.find('.view-menu-list .view-menu-list-item.active').text();

				//check whether there is an active name
				if(name){
					//show view
					this.getViewIn('generate-view').show(this.currentRegion, name);
					//hide menu
					this.$el.find('.view-menu').addClass('hidden');
					//remove currently actived class
					this.$el.find('.view-menu-list .view-menu-list-item').removeClass('active');
					//remove active class on region
					this.$el.find('.region-generate-view .region.active').removeClass('active');
					//hide region-cover
					this.adjustRegionCover(false);
					//add region to list
					this.regionView[this.currentRegion] = name;
				}else{
					//no name actived, raise notification
					app.notify('No view selected!', 'You have not selected any view. Please selecte one.', 'error', {icon: 'fa fa-reddit-alien'});
				}

			}
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
			var forbiddenClasses = ['end-point', 'side-menu-trigger', 'side-menu-list', 'side-menu-item', 'fa', 
									'side-menu-templates-holder', 'operations-item', 'operations-holder', 'operations-subitem'],
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
				app.store.set('current', name);
			}

			this.$el.find('.side-menu-templates-holder').append($elem);
		},
		reset: function(){
			//clear cache for current layout
			app.store.remove('endPoints');
			app.store.remove('horizontal-line');
			app.store.remove('vertical-line');
			//app.store.remove('current');
			//reset global objects
			app._global.endPoints = undefined;
			app._global['horizontal-line'] = undefined;
			app._global['vertical-line'] = undefined;

			this.onLayoutResetted(true);

			//refresh
			this.show('guide', 'Create.Guide');
			//layout svg
			this.show('layout', 'Create.Layout');
			//menu arrows
			this.show('arrows', 'Create.Arrows');
		},
		flashCurrent: function(){
			this.$el.find('.side-menu-list .current-name-holder').addClass('flash');
		},
		lockLayout: function($lockButton){
			//check if already generated layout
			if(this.generated){
				//check if try to unlock or lock
				if(this.locked){//try to unlock
					//if not meshed, make it meshed
					if(!this.meshed)
						this.meshLayout(this.$el.find('.operations-item .hide-button'), true);

					//change lock div z-index to -1, for easier dragging
					this.$el.find('.locker').css({'z-index': -2}).removeClass('hidden');

				}else{//try to lock
					//if meshed make it unmeshed
					if(this.meshed)
						this.meshLayout(this.$el.find('.operations-item .hide-button'), true);

					//change lock div z-index to 3, for view inserting
					this.$el.find('.locker').css({'z-index': 3}).removeClass('hidden');
				}
			}
			//not generated any layout
			else{
				this.$el.find('.locker').toggleClass('hidden');
			}

			$lockButton.toggleClass('active');
			$lockButton.find('.lock').toggleClass('hidden');
			$lockButton.find('.unlock').toggleClass('hidden');
			this.locked = !this.locked;
		},
		meshLayout: function($meshButton, callFromLock){
			//check whether locked and generated, if yes tell user must unlock first, return
			//ignore this branch, if this method is called directly from lockLayout function
			if(!callFromLock && this.generated && !this.meshed && this.locked){
				app.notify('Error!', 'You have generated a layout. You need to unlock to see all the grids.', 'error', {icon: 'fa fa-reddit-alien'});
				return;
			}

			//appereance
			$meshButton.toggleClass('active');
			$meshButton.find('.hide-point').toggleClass('hidden');
			$meshButton.find('.show-point').toggleClass('hidden');

			//real stuff
			if(this.meshed){
				//outer circle
				_.each($('.end-point'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes + ' hidden');
				});

				//inner circle
				_.each($('.end-point-inner'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes + ' hidden');
				});

				//lines
				_.each($('.layout-line'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes + ' hidden');
				});

			}else{
				//outer circle
				_.each($('.end-point'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes.replace('hidden', ''));
				});

				//inner circle
				_.each($('.end-point-inner'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes.replace('hidden', ''));
				});

				//lines
				_.each($('.layout-line'), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', classes.replace('hidden', ''));
				});
			}
			this.meshed = !this.meshed;
		},
		generateLock: function(){
			//check whether view is already locked
			//if already locked return
			if(this.locked) return;
			//if not locked, lock the view
			else
				this.lockLayout(this.$el.find('.operations-item.lock-button'));
		},
		generateUnmesh: function(){
			//check whether view is already unmeshed
			//if unmeshed, return
			if(!this.meshed) return;
			//if not, unmesh
			else
				this.meshLayout(this.$el.find('.operations-item.hide-button'));
		},
		generateLayout: function(adjusting){
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
					that.generateLock();
					that.generateUnmesh();	
				}else{
					//if calls from adjusting layout, then re-render views
					if(_.keys(that.regionView).length){
						_.each(that.regionView, function(v, r){
							//load view into the region
							that.getViewIn('generate-view').show(r, v);
						});
					}
				}
			})
			.fail(function(error){
				app.notify('Error!', 'Generating error.', 'error', {icon: 'fa fa-reddit-alien'});
			});

			//set generated flag to true
			this.generated = true;

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
		onLayoutAdjusted: function(){
			var that = this;
			//only response if some layout has already been generated
			if(!this.generated) return;

			//reset layout
			this.generateLayout(true);
		},
		onLayoutResetted: function(userReset){
			//reset generated flag
			this.generated = false;

			//reset generated view
			if(this.getViewIn('generate-view')) this.getViewIn('generate-view').close();

			//reset regionView table
			this.regionView = {};

			//reset locker index
			this.$el.find('.locker').addClass('hidden').css(({'z-index': 3}));

			//send notification
			if(!userReset) app.notify('Layout Resetted.', 'You have changed original layout. The generated view has been resetted.', 'error', {icon: 'fa fa-reddit-alien'});
		},
		onGenerateOverwrite: function(){
			this.generateLayout();
		}
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