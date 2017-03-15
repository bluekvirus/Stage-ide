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
		
		initialize: function(){
			//temp storage for storing svgs
			this.tempSvg = {};

			//temp storage for storing editors
			this.tempEditor = {};

			//initial textarea setup for svgs
			this.initialSvgSetup = 'function(paper){\r\n\t\r\n}';

			//initial textarea setup for editors
			this.initialEditorSetup = '{\r\n\t"type": "text"\r\n}';

			//flag indicating which editing mode is on
			this.viewEditing = true;

			//flag to indicate which view is currently being activated
			this.activatedView = '';
		},
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

            //initial view setup, show view related configs
            //this.$el.find('#view-html-switch').prop('checked', true);
            this.viewRawSwitch(true);
            //swtich view or raw
            this.$el.find('#view-html-switch').on('change', function(e){
            	var $this = $(this);
            	//change flag
            	that.viewEditing = $this.prop('checked');
            	//true is view, false is raw
            	that.viewRawSwitch($this.prop('checked'));
            });

            //enable tooptip for svg and editor lists
            this.$el.find('[data-toggle="tooltip"]').tooltip();

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
				//clean up stored svgs and editors
				this.tempSvg = {};
				this.tempEditor = {};
				//only toggles active classes, now only add existing class
				$self.siblings().removeClass('active');
				$self.addClass('active');

				//scan view's editor and svg tags
				var viewName = $self.text(),
					svgs = app.get(viewName).create().getTemplate(true).match(/svg=\"([^"]*)\"/g),
					editors = app.get(viewName).create().getTemplate(true).match(/editor=\"([^"]*)\"/g);

				//modify this.activatedView flag
				this.activatedView = viewName;

				//add svg and edtior
				this.addSvgEditorTags(svgs, editors);
			},
			'view-cancel': function(){
				this.coop('view-menu-close');
			},
			'view-add': function(){
				//check html is active or view is active
				var method = this.$el.find('#view-html-switch').prop('checked') ? 'view' : 'html',//this.$el.find('.tabs .tab.active').attr('tab'),
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
					data: (data && !error) ? data : undefined,
					method: method,
					svg: this.tempSvg,
					editors: this.tempEditor
				});
			},
			'active-menu-tab': function($self){
				var name = $self.attr('tab'),//tab intend to be activated
					current = $self.parent().find('.active').attr('tab'),
					$el;
				//add active class on tabs
				$self.siblings().removeClass('active');
				$self.addClass('active');
				//hide others
				this.$el.find('.view-menu-middle-holder .tab-content').addClass('hidden');
				//show actived
				this.$el.find('.view-menu-middle-holder .tab-content[content="' + name + '"]').removeClass('hidden');

				//if current is view but with NO selection, and switching to svg or editor. send notification and return
				if(this.viewEditing && !this.activatedView) return;

				//when switching tabs away from svgs and editors, should store the configuration of svgs and editors
				if(current === 'svg'){
					$el = this.$el.find('.svg-list .svg-list-item.active');

					//save
					if($el.text() && this.$el.find('#svg-editor').val())
						this.tempSvg[$el.text()] = this.$el.find('#svg-editor').val();
				}else if(current === 'editor'){
					$el = this.$el.find('.editor-list .editor-list-item.active');
					
					//save
					if($el.text() && this.$el.find('#editors-editor').val())
						this.tempEditor[$el.text()] = this.$el.find('#editors-editor').val();
				}

				//if switch to svg or editors, scan html editor, if raw enabled
				if(name === 'svg' || name === 'editor'){
					var $htmlEditor = this.$el.find('#html-editor'),
						svg, editors;

					if(this.viewEditing){
						svgs = app.get(this.activatedView).create().getTemplate(true).match(/svg=\"([^"]*)\"/g);
						editors = app.get(this.activatedView).create().getTemplate(true).match(/editor=\"([^"]*)\"/g);
					}else{
						//scan for svg and editor tags
	            		svgs = $htmlEditor.val().match(/svg=\"([^"]*)\"/g);
						editors = $htmlEditor.val().match(/editor=\"([^"]*)\"/g);
					}
					
					//add svg and edtior
					this.addSvgEditorTags(svgs, editors);
				}
			},
			'load-svg': function($self){
				//save currently active content to editor-content
				var $active = $self.parent().find('.active');
				this.tempSvg[$active.text()] = this.$el.find('#svg-editor').val();

				//active current, switch content
				$self.addClass('active').siblings().removeClass('active');
				this.$el.find('#svg-editor').val(this.tempSvg[$self.text()]);
			},
			'load-editor': function($self){
				//save currently active content to editor-content
				var $active = $self.parent().find('.active');
				this.tempEditor[$active.text()] = this.$el.find('#editors-editor').val();

				//active current, switch content
				$self.addClass('active').siblings().removeClass('active');
				this.$el.find('#editors-editor').val(this.tempEditor[$self.text()]);
			},
		},
		//----------------------------------------- helpers -----------------------------------------//
		addSvgEditorTags: function(svgs, editors){
			var that = this,
				firstFlag = false,
				temp = {};
			
			//remove active and linked classes from items
			this.$el.find('.svg-list .svg-list-item').removeClass('active linked');
			this.$el.find('.editor-list .editor-list-item').removeClass('active linked');
			this.$el.find('#svg-editor').val('');
			this.$el.find('#editors-editor').val('');

			//=========== svgs ==========//
			if(svgs){
				//empty old list
				this.$el.find('.svg-content .svg-list').empty();
				//trim out falsy element
				svgs = _.compact(svgs);
				//trim every element of svgs array
				if(svgs.length){
					_.map(svgs, function(svgStr, index){
						svgs[index] = svgStr.replace('svg=', '').replace(/\"/g, '');
					});

					//extend this.tempSvg with svgs
					temp = {};
					_.each(svgs, function(svgStr, index){ temp[svgStr] = ''; });
					this.tempSvg = _.extend(temp, this.tempSvg);
				}

				firstFlag = false;
				//show every stored svgs
				_.each(this.tempSvg, function(config, str){

					var $temp = $('<div class="svg-list-item" data-toggle="tooltip" data-placement="top" title="' + str + '" action="load-svg"><span>' + str + '</span></div>');

					if(!that.tempSvg[str])
						that.tempSvg[str] = that.initialSvgSetup;
					
					//initial active first
					if(!firstFlag &&  _.contains(svgs, str)){
						//active
						$temp.addClass('active');

						//change svg editor content
						that.$el.find('#svg-editor').val(that.tempSvg[str]);

						//flip flag
						firstFlag = true;
					}

					//add linked class if it contains in svgs array
					if(svgs.length && _.contains(svgs, str)){
						$temp.addClass('linked');
					}

					that.$el.find('.svg-content .svg-list').append($temp);
				});
			}
			
			//=========== editors ==========//
			if(editors){
				//empty old list
				this.$el.find('.editor-content .editor-list').empty();
				//trim out falsy elements
				editors = _.compact(editors);
				//trim every element of editors array
				if(editors && editors.length){
					_.map(editors, function(editorStr, index){
						editors[index] = editorStr.replace('editor=', '').replace(/\"/g, '');
					});

					//extend this.tempEditor with editors
					temp = {};
					_.each(editors, function(editorStr, index){ temp[editorStr] = ''; });
					this.tempEditor = _.extend(temp, this.tempEditor);
				}

				firstFlag = false;
				//show every stored editors
				_.each(this.tempEditor, function(config, str){	
					
					var $temp = $('<div class="editor-list-item" data-toggle="tooltip" data-placement="top" title="' + str + '" action="load-editor"><span>' + str + '</span></div>');

					//if not previously stored, give an intial option
					if(!that.tempEditor[str])
						that.tempEditor[str] = that.initialEditorSetup;

					//initial active first
					if(!firstFlag && _.contains(editors, str)){
						//active
						$temp.addClass('active');

						//change editors editor content
						that.$el.find('#editors-editor').val(that.tempEditor[str]);

						//flip flag
						firstFlag = true;
					}

					//add linked class if it contains in editors array
					if(editors && editors.length && _.contains(editors, str)){
						$temp.addClass('linked');
					}

					that.$el.find('.editor-content .editor-list').append($temp);
				});
			}
			
		},
		viewRawSwitch: function(view){
			var that = this;
			//remove active class on all tabs
			this.$el.find('.tabs .tab').removeClass('active');

			if(view){
				//hide html tab, active view tab
        		this.$el.find('.tabs [tab="html"]').addClass('hidden');
        		this.$el.find('.tabs [tab="view"]').removeClass('hidden').addClass('active');
        		
        		//show view content, hide other active content
        		this.$el.find('.view-menu-middle-holder .tab-content').addClass('hidden');
        		this.$el.find('.view-menu-middle-holder .view-content').removeClass('hidden');

        		//lock SVG and Editors tab
        		(new LockView()).overlay({
        			effect: false,
        			anchor: $('.svg-content')
        		});

				(new LockView()).overlay({
        			effect: false,
        			anchor: $('.editor-content')
        		});

			}else{
				//hide html tab, active view tab
        		this.$el.find('.tabs [tab="html"]').removeClass('hidden').addClass('active');
        		this.$el.find('.tabs [tab="view"]').addClass('hidden');
        		
        		//show html content, hide other active content
        		this.$el.find('.view-menu-middle-holder .tab-content').addClass('hidden');
        		this.$el.find('.view-menu-middle-holder .html-content').removeClass('hidden');

        		//unlock SVG tab and Editors tab
        		$('.svg-content').overlay(false);
        		$('.editor-content').overlay(false);

        		//switch from view to html, if user has selected html after activating a view, need to populate html editor with view's tempalte
				if(this.activatedView) 
					this.$el.find('#html-editor').val(app.get(this.activatedView).create().getTemplate(true));
				
			}
		},
		//----------------------------------------- coops -----------------------------------------//
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
				var method = obj.method;

				//active the method tab
				that.$el.find('.tabs .tab').removeClass('active');
				if(method === 'view'){
					that.$el.find('.tabs .tab[tab="view"]').addClass('active').removeClass('hidden');
					that.$el.find('.tabs .tab[tab="html"]').addClass('hidden').removeClass('active');
					that.viewEditing = true;
					that.viewRawSwitch(true);
					that.$el.find('#view-html-switch').prop('checked', true);
				}else{
					that.$el.find('.tabs .tab[tab="html"]').addClass('active').removeClass('hidden');
					that.$el.find('.tabs .tab[tab="view"]').addClass('hidden').removeClass('active');
					that.viewEditing = false;
					that.viewRawSwitch(false);
					that.$el.find('#view-html-switch').prop('checked', false);
				}
				
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

	
	var LockView = app.view({

		template: [
					'<div class="box text-left">',
						'<div class="heading"><i class="fa fa-lock"></i> <strong>Locked</strong></div>',
	        			'<div class="body">Please swtich to "Raw" model to edit.</div>',
        			'</div>'
        		],

    });

})(Application);