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
		//coop: ['e', 'e'],
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
            .on('mousemove', app.throttle(function(e){
            	e.preventDefault();
            	e.stopPropagation();

            	//cleanup the guide line, if hovering on side menu
            	that.coop('side-menu-hover');
            }))
            //block click event on side menu to propagate
            .on('click', function(e){
            	e.stopPropagation();
            	e.preventDefault();

            	that.coop('side-menu-clicked');
            });
		},
		actions: {
			lock: function($self){
				//check whether already generated layout, if not gnerate, if yes just lock
				// if(this.generated)
				// 	this.lockLayout($self);
				// else
				// 	this.generateLayout();

				//check whether generated layout
				//If not, lock layout, unmesh and generate.
				//If yes, unlock layout, mesh.
				//Both of the circumstances, needs to notify create view for generate status change.
				
				//use app._global.regionView to check whether generated.
				//use the active class to check whether locked.
				var locked = $self.hasClass('active'),
					generated = !!app._global.regionView; //? do I really need this information?

				this.lockLayout($self, locked);

			},
			generate: function(){//need to align lines, ignore margin of errors
				this.generateLayout(false, true);
				// var that = this,
				// 	flag = false;

				//check whether there are any view has been inserted
				/*if(this.getViewIn('generate-view'))
					flag = true;
					// _.each(_.keys(this.getViewIn('generate-view').regions), function(regionName){
					// 	if(that.getViewIn('generate-view').getViewIn(regionName))
					// 		flag = true;
					// });

				if(flag)
					(new (app.get('Create.GenerateConfirm'))()).overlay({
						effect: false,
						class: 'generate-confirm-overlay create-overlay danger-title'
					});
				else
					this.generateLayout();*/
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
			'hide-end-points': function($self){
				this.meshLayout($self.hasClass('active'));
			},
		},
		lockLayout: function(){
			var $lockButton = this.$el.find('.operations-item .lock-button'),
				locked = $lockButton.hasClass('active');

			//call meshLayout before lockButton status chagned
			this.meshLayout(true);

			if(locked){//unlock and mesh

			}else{//lock and unmesh
				//need to generate layout here
			}

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
		}
	});

})(Application);