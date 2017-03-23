/**
 * Sample VIEW script.
 *
 * @author Stagejs.CLI
 * @created Mon Mar 06 2017 19:26:49 GMT-0800 (PST)
 */
;(function(app){

	app.view('Create.SideMenu', {

		template: '@view/create/side-menu.html',
		//data: 'url', {} or [],
		coop: [],
		//[editors]: {...},
		
		initialize: function(){},
		//onShow: function(){},
		//onDataRendered: function(){},
		onReady: function(){
			var that = this;
			//for animation end
            this.$el.find('.current-name-holder').bind('webkitAnimationEnd', function(){
               $(this).removeClass('flash');
            });
            this.$el.find('.current-name-holder').bind('animationend', function(){
                $(this).removeClass('flash');
            });

			//block hover on side menu to propagate
            this.$el
            .on('mousemove', function(e){
            	e.preventDefault();
            	e.stopPropagation();

            	//cleanup the guide line, if hovering on side menu
            	//that.coop('side-menu-hover');
            })
            //block click event on side menu to propagate
            .on('click', function(e){
            	e.stopPropagation();
            	e.preventDefault();

            	that.coop('side-menu-clicked');
            });

            //block hover on side menu to propagate
            this.$el.children()
            .on('mousemove', function(e){
            	e.preventDefault();
            	e.stopPropagation();

            	//cleanup the guide line, if hovering on side menu
            	//that.coop('side-menu-hover');
            })
            //block click event on side menu to propagate
            .on('click', function(e){
            	e.preventDefault();

            	that.coop('side-menu-clicked');
            });
		},
		actions: {
			lock: function($self){
				this.previewLayout(this.$el.find('.preivew-button'), true);
				this.lockLayout();
			},
			'mesh': function($self){
				this.meshLayout($self.hasClass('active'));
			},
			generate: function(){//need to align lines, ignore margin of errors
				this.coop('overlay-generate');
			},
			reset: function(){
				(new (app.get('Create.ResetConfirm'))()).overlay({
					effect: false,
					class: 'generate-reset-overlay create-overlay danger-title'
				});
			},
			save: function(){
				var Save = app.get('Create.Save');
				(new Save()).overlay({
					effect: false,
					class: 'save-overlay create-overlay'
				});
			},
			'load-template': function($self){
				var Save = app.get('Create.Save');
				(new Save({
					data: {
						'switching': $self,
					}
				})).overlay({
					effect: false,
					class: 'save-overlay create-overlay',
				});
			},
			'new-template': function(){
				var Save = app.get('Create.Save');
				(new Save({
					data: {
						'new-gen': true
					}
				})).overlay({
					effect: false,
					class: 'save-overlay create-overlay',
				});
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
			'save-view': function($self){
				var Export = app.get('Create.Export');
				(new Export({
					
				})).overlay({
					effect: false,
					class: 'export-overlay create-overlay',
				});	
			},
			preview: function($self){
				this.previewLayout($self);
			},
		},
		previewLayout: function($previewBtn, reset){
			var svgClasses = ['end-point'/*outer circle*/, 'end-point-inner'/*inner circle*/, 'layout-line'/*lines*/];

			if(!reset){
				$previewBtn.toggleClass('active');
				$previewBtn.find('.operations-subitem').toggleClass('hidden');
			}else{//reset
				$previewBtn.removeClass('active');
				$previewBtn.find('.operations-subitem.hide-point').removeClass('hidden');
				$previewBtn.find('.operations-subitem.show-point').addClass('hidden');
			}
				
			//if has class active, hide all the svg lines and borders
			if($previewBtn.hasClass('active')){
				this.parentCt.$el.find('.layout-bar, .region-cover').addClass('hidden');
				this.parentCt.getViewIn('generate-view').$el.find('.region').removeClass('active');
			}else{
				this.parentCt.$el.find('.layout-bar').removeClass('hidden');
			}

			_.each(svgClasses, function(cl){
				_.each($('.' + cl), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', (($previewBtn.hasClass('active')) ? (classes + ' hidden') : (classes.replace('hidden', ''))));
				});	
			});

			//coop to parent view
			this.coop('layout-preview-toggle', $previewBtn.hasClass('active'));
		},
		lockLayout: function(){
			var $lockButton = this.$el.find('.operations-item .lock-button'),
				locked = $lockButton.hasClass('active');

			//call meshLayout before lockButton status chagned
			this.meshLayout(true);

			//toggle ui appearence
			$lockButton.toggleClass('active');
			$lockButton.find('.lock').toggleClass('hidden');
			$lockButton.find('.unlock').toggleClass('hidden');

			//echo coop event
			this.coop('layout-locked', $lockButton.hasClass('active'));
		},
		meshLayout: function(callFromLock){
			var $meshButton = this.$el.find('.operations-item .hide-button'),
				meshed = $meshButton.hasClass('active'),
				locked = this.$el.find('.operations-item .lock-button').hasClass('active'),
				svgClasses = ['end-point'/*outer circle*/, 'end-point-inner'/*inner circle*/, 'layout-line'/*lines*/];

			//check whether locked, if yes tell user must unlock first, return
			if(locked && !meshed && !callFromLock){
				app.notify('Error!', 'You have generated a layout. You need to unlock to see all the grids.', 'error', {icon: 'fa fa-reddit-alien'});
				return;
			}

			//if unlock and unmesh, do not mesh
			if(!locked && !meshed && callFromLock){
				return;
			}

			//toggle ui appearence
			$meshButton.toggleClass('active');
			$meshButton.find('.hide-point').toggleClass('hidden');
			$meshButton.find('.show-point').toggleClass('hidden');

			_.each(svgClasses, function(cl){
				_.each($('.' + cl), function(el){
					var $el = $(el);
					//
					var classes = $el.attr('class');
					$el.attr('class', ((meshed) ? (classes + ' hidden') : (classes.replace('hidden', ''))));
				});	
			});
			
			//echo coop event
			this.coop('layout-meshed', meshed = $meshButton.hasClass('active'));
		},
		//
		
	});

})(Application);