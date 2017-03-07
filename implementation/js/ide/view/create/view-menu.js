/**
 * Sample VIEW script.
 *
 * @author Stagejs.CLI
 * @created Mon Mar 06 2017 17:39:27 GMT-0800 (PST)
 */
;(function(app){

	app.view('Create.ViewMenu', {

		template: '@view/create/view-menu.html',
		//data: 'url', {} or [],
		coop: ['view-menu-show'],
		//[editors]: {...},
		
		initialize: function(){},
		//onShow: function(){},
		//onDataRendered: function(){},
		onReady: function(){
			var that = this;

			//view input search view names that contains the input string
			this.$el.find('#view-search').on('keyup', _.debounce(function(e){
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

			}, 200));

	        //switch remote or local
            this.$el.find('#remote-switch input[type="checkbox"]').on('change', function(e){
            	if($(this).prop('checked')){
					that.$el.find('#data-url').prop('disabled', false);
				}
				else{
					that.$el.find('#data-url').prop('disabled', true);	
				}
            });

			//block hover on view menu to propagate
            this.$el
            .on('mousemove', function(e){
            	e.preventDefault();
            	e.stopPropagation();
            })
            //block click event on view menu to propagate
            .on('click', function(e){
            	e.stopPropagation();
            });
		},
		actions: {
			'data-fetch': function(){
				var that = this;
				//remote not enabled
				if(this.$el.find('#data-url').prop('disabled')){
					app.notify('Remote not enabled!', 'You must enable remote to fetch.', 'error', {icon: 'fa fa-reddit-alien'});
				}else{
					var url = this.$el.find('#data-url').val(),
						dataStr = '';
					if(url)
						app.remote(url)
							.done(function(data){
								dataStr = JSON.stringify(data);
								that.$el.find('#data-editor').val(dataStr);
							})
							.fail(function(){
								app.notify('Remote fetch error!', 'Please check your remote URL.', 'error', {icon: 'fa fa-reddit-alien'});
							});
				}
			},
			'data-remote': function($self){
				$self.toggleClass('active');
				//check if active, if yes enable input, else disable input
				if($self.hasClass('active')){
					this.$el.find('#data-url').prop('disabled', false);
				}
				else{
					this.$el.find('#data-url').prop('disabled', true);
				}
			},
			'existing-view-click': function($self){
				//only toggles active classes, now only add existing class
				$self.siblings().removeClass('active');
				$self.addClass('active');
			},
			'view-cancel': function(){
				this.coop('view-menu-close');
			},
			'view-add': function(){
				//check html is active or view is active
				var method = this.$el.find('.tabs .tab.active').attr('tab'),
					data = this.$el.find('#data-editor').val(),
					content = '',
					error = false;

				//check if dataStr exists
				if(data){
					try {
				        data = JSON.parse(data);
				    } catch (e) {
				    	error = true;
				    	app.notify('Error Data Format!', 'Please check your JSON data format.', 'error', {icon: 'fa fa-reddit-alien'});
				        console.warn('IDE::invalid data format. please make sure .');
				    }
				}

				if(method === 'data'){
					app.notify('No insert method selected!', 'Please select view or HTML tab to compensate the data.', 'error', {icon: 'fa fa-reddit-alien'});
					return;
				}
				//check which one is active
				else if(method === 'html'){
					content = this.$el.find('#html-editor').val();
				}
				else if(method === 'view'){
					content = this.$el.find('.view-menu-list .view-menu-list-item.active').text();
					//check whether there is an active name
					if(!content){
						//no name actived, raise notification
						app.notify('No view selected!', 'You have not selected any view. Please selecte one.', 'error', {icon: 'fa fa-reddit-alien'});
						return;
					}
				}

				//for future use, like svg and editors
				//else if....
				
				//coop event to spray view in selected region
				this.coop('view-menu-add-view', {
					content: content,
					data: (data && !error) ? data : {},
					method: method
				});
			},
			'active-menu-tab': function($self){
				var name = $self.attr('tab');
				//add active class on tabs
				$self.siblings().removeClass('active');
				$self.addClass('active');
				//hide others
				this.$el.find('.view-menu-middle-holder .tab-content').addClass('hidden');
				//show actived
				this.$el.find('.view-menu-middle-holder .tab-content[content="' + name + '"]').removeClass('hidden');
			},
		},
		onViewMenuShow: function(obj){
			var that = this,
				$target = obj.$target,
				e = obj.e,
				currentRegion = obj.currentRegion;

			var $viewMenu = that.parentCt.$el.find('.view-menu');
			//get view list
			app.remote({
				url: '/api/getViewList'
			})
			.done(function(views){
				//clean up input text
				that.$el.find('#view-search').val('');

				//clean up currently actived view tag
				that.$el.find('.view-menu-list .view-menu-list-item').removeClass('active');

				//clean up old lists
				that.$el.find('.view-menu-list').empty();
				//populate the list, with views returned from backend
				_.each(views, function(viewName){
					that.$el.find('.view-menu-list').append('<div class="view-menu-list-item" action="existing-view-click"><span>' + viewName + '</span></div>');
				});
			});

			if(!_.string.include($target.attr('class'), 'side-menu')){

				//make sure active the right tab when show
				var method = (app._global.regionView[currentRegion] && app._global.regionView[currentRegion].method) || 'view';

				//active the method tab
				that.$el.find('.tabs .tab').removeClass('active');
				that.$el.find('.tabs .tab[tab="'+ method +'"]').addClass('active');

				//active the right input
				that.$el.find('.tab-content').addClass('hidden');
				that.$el.find('.tab-content[content="' + method + '"]').removeClass('hidden');

				//load right data into editors
				if(method === 'html'){//html only
					that.$el.find('#html-editor').val((app._global.regionView[currentRegion] && app._global.regionView[currentRegion].view) || '');
				}
				else if(method === 'view'){//fetch template from a view
					var Temp = '';
					if(app._global.regionView[currentRegion]){
						Temp = new (app.get(app._global.regionView[currentRegion].view))();
					}
					that.$el.find('#html-editor').val(Temp && Temp.getTemplate(true));
				}

				that.$el.find('#data-editor').val((app._global.regionView[currentRegion] && 
													app._global.regionView[currentRegion].data && 
													JSON.stringify(app._global.regionView[currentRegion].data)) || '');


				//adjust view menu position
				$viewMenu.removeClass('hidden').css({
					top: (($window.height() - e.pageY) < $viewMenu.height()) ? 
							((e.pageY - $viewMenu.height() <= 10) ? ($window.height() - $viewMenu.height()) : e.pageY - $viewMenu.height()) 
							: e.pageY,
					left: (($window.width() - e.pageX) < $viewMenu.width()) ? (e.pageX - $viewMenu.width()) : e.pageX,
				});	
			}else{
				$viewMenu.addClass('hidden');
			}
		},
		

	});

})(Application);