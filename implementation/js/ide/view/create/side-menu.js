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
            .on('mousemove', function(e){
            	e.preventDefault();
            	e.stopPropagation();
            })
            //block click event on side menu to propagate
            .on('click', function(e){
            	e.stopPropagation();
            	e.preventDefault();

            	this.coop('side-menu-clicked');
            });
		},
		actions: {
			lock: function($self){
				//check whether already generated layout, if not gnerate, if yes just lock
				if(this.generated)
					this.lockLayout($self);
				else
					this.generateLayout();
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
				this.meshLayout($self);
			},
		},

	});

})(Application);