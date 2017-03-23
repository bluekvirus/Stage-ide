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
			this.initialEditorSetup = {'type': 'text'};

			//flag indicating which editing mode is on
			this.viewEditing = true;

			//flag to indicate which view is currently being activated
			this.activatedView = '';

			//object to store original top and left coordinates before expanding
			this.originalTopLeft = {};
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
					app.notify('Remote is not enabled!', 'You must enable remote to fetch.', 'error', {icon: 'fa fa-reddit-alien'});
				}else{
					var url = this.$el.find('#data-url').val();
					if(url)
						app.remote(url)
							.done(function(data){
								that.$el.find('#data-editor').val(JSON.stringify(data, '\t', 4));
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
				var that = this;
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

				//check whether currently actived tab is svg or editors, save current
				var $current = this.$el.find('.tabs .tab.active');
				if($current.attr('tab') === 'svg' && method === 'html'){
					var $currentSvg = this.$el.find('.svg-content .svg-list .svg-list-item.active');
					if($currentSvg){
						this.tempSvg[$currentSvg.text()] = this.$el.find('#svg-editor').val();
					}
				}else if($current.attr('tab') === 'editor' && method === 'html'){
					var $currentEditor = this.$el.find('.editor-content .editor-list .editor-list-item.active');
					if($currentEditor){
						this.tempEditor[$currentEditor.text()] = JSON.parse(this.$el.find('#editors-editor').val());
					}
				}
				
				//if method is view, go through view definition for svg and editors
				if(method === 'view'){
					//update this.tempEditor
					this.tempEditor = app.get(content).prototype.editors;

					//update thie.tempSvg
					//reset this.tempSvg
					this.tempSvg = {};
					//insert by looping through svg definitions
					_.each(app.get(content).prototype.svg, function(fn, name){
						that.tempSvg[name] = fn.toString();
					});
				}

				//coop event to spray view in selected region
				this.coop('view-menu-add-view', {
					content: content,
					data: (data && !error) ? data : {},
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
				//if(this.viewEditing && !this.activatedView) return;

				//when switching tabs away from svgs and editors, should store the configuration of svgs and editors
				if(current === 'svg'){
					$el = this.$el.find('.svg-list .svg-list-item.active');

					//save current svg
					if($el.text() && this.$el.find('#svg-editor').val())
						this.tempSvg[$el.text()] = this.$el.find('#svg-editor').val();

				}else if(current === 'editor'){
					$el = this.$el.find('.editor-list .editor-list-item.active');
					
					//save
					if($el.text() && this.$el.find('#editors-editor').val())
						this.tempEditor[$el.text()] = JSON.parse(this.$el.find('#editors-editor').val());
				}

				//if switch to svg or editors, scan html editor, if raw enabled
				if(name === 'svg' || name === 'editor'){
					var $htmlEditor = this.$el.find('#html-editor'),
						svg, editors;

					if(this.viewEditing && this.activatedView){
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
				this.tempEditor[$active.text()] = JSON.parse(this.$el.find('#editors-editor').val());

				//active current, switch content
				$self.addClass('active').siblings().removeClass('active');
				this.$el.find('#editors-editor').val(JSON.stringify(this.tempEditor[$self.text()], '\t', 4));
			},
			expand: function(){
				var that = this,
					$parent = this.$el.parent();

				//add class on region for easier styling
				$parent.toggleClass('expand');

				//change expand and shrink icon and text
				this.$el.find('.expand-holder>span').toggleClass('hidden');

				_.defer(function(){
					//check whether expand or not to adjust height of editor region
					if($parent.hasClass('expand')){
						$parent.css({
							left: 0,
							top: 0,
						});

						var totalHeight = that.$el.parent().innerHeight(),
							topHeight = that.$el.find('.view-menu-top-holder').outerHeight(),
							bottomHeight = that.$el.find('.view-menu-button-holder').outerHeight(),
							contentHeight = totalHeight - topHeight - bottomHeight,
							viewAndDataInputHeight = 50;
						//set up contents height
						that.$el.find('.view-menu-middle-holder').css({
							height: contentHeight + 'px'
						});
						
						//set up info height specifically for view and data content
						that.$el.find('.view-menu-list, .data-editor-holder').css({
							height: contentHeight - viewAndDataInputHeight + 'px'
						});

						//change tabs holder size
						var totalWidth = that.$el.parent().innerWidth(),
							toggleWidth = that.$el.find('.view-html-toggle-holder').outerWidth();

						that.$el.find('.view-menu-top-holder .tabs').css({
							width: totalWidth - toggleWidth + 'px'
						});

					}else{
						that.resetToOriginalHeight(true);
					}
				});
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

			//clean up old lists
			//empty old svg list
			this.$el.find('.svg-content .svg-list').empty();
			//empty old editors list
			this.$el.find('.editor-content .editor-list').empty();

			//=========== svgs ==========//
			if(svgs){
				//trim out falsy element
				svgs = _.compact(svgs);
				//trim every element of svgs array
				if(svgs.length){
					_.map(svgs, function(svgStr, index){
						svgs[index] = svgStr.replace('svg=', '').replace(/\"|\'/g, '');
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
						that.$el.find('#editors-editor').val(JSON.stringify(that.tempEditor[str], '\t', 4));

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

				//set viewEditing flag to true
        		this.viewEditing = true;

        		//change toggle switch
        		this.$el.find('#view-html-switch').prop('checked', true);

			}else{
				//hide view tab, active html tab
        		this.$el.find('.tabs [tab="html"]').removeClass('hidden').addClass('active');
        		this.$el.find('.tabs [tab="view"]').addClass('hidden');
        		
        		//show html content, hide other active content
        		this.$el.find('.view-menu-middle-holder .tab-content').addClass('hidden');
        		this.$el.find('.view-menu-middle-holder .html-content').removeClass('hidden');

        		//unlock SVG tab and Editors tab
        		$('.svg-content').overlay(false);
        		$('.editor-content').overlay(false);

        		//switch from view to html, if user has selected html after activating a view, need to populate html editor with view's tempalte
				if(this.activatedView){
					//fill html editor with view's template
					this.$el.find('#html-editor').val(app.get(this.activatedView).create().getTemplate(true));

					//update this.tempEditor
					this.tempEditor = app.get(this.activatedView).prototype.editors;

					//update thie.tempSvg
					//reset this.tempSvg
					this.tempSvg = {};
					//insert by looping through svg definitions
					_.each(app.get(this.activatedView).prototype.svg, function(fn, name){
						that.tempSvg[name] = fn.toString();
					});
				}

				//set viewEditing flag to false
				this.viewEditing = false;
				this.activatedView = '';

				//change toggle switch
        		this.$el.find('#view-html-switch').prop('checked', false);
			}
		},
		//----------------------------------------- coops -----------------------------------------//
		onViewMenuShow: function(obj){
			//reset to original size first
			this.$el.parent().removeClass('expand');
			this.resetToOriginalHeight();
			this.originalTopLeft = {};

			//variables
			var that = this,
				config = $.extend(true, {}, obj);
				
			app.debug('view-menu-show object received', config);

			var $viewMenu = that.parentCt.$el.find('.view-menu');
			//get view list
			app.remote({
				url: '/api/getViewList'
			})
			.done(function(views){
				//clean up input text
				that.$el.find('#view-search').val('');

				//clean up old lists
				that.$el.find('.view-menu-list').empty();
				//populate the list, with views returned from backend
				_.each(views, function(viewName){
					if(config.method === 'view' && viewName === config.content){
						that.$el.find('.view-menu-list').append('<div class="view-menu-list-item active" action="existing-view-click"><span>' + viewName + '</span></div>');
						//set indicator for activatedView
						that.activatedView = viewName;
					}
					else
						that.$el.find('.view-menu-list').append('<div class="view-menu-list-item" action="existing-view-click"><span>' + viewName + '</span></div>');
				});
			});

			if(!_.string.include(config.$target.attr('class'), 'side-menu')){

				//check whether current region has been assigned or not
				if(config.assigned){//assigned
					
					if(config.method === 'view'){

						//active view editing tab
						this.viewRawSwitch(true);

					}else if(config.method === 'html'){

						//active html editing tab
						this.viewRawSwitch();

						//update html editor
						this.$el.find('#html-editor').val(config.content);
					}

					//update temp storage for svg and editors
					this.tempSvg = config.svg;
					this.tempEditor = config.editors;

					//update data editor
					this.$el.find('#data-editor').val(JSON.stringify(config.data, '\t', 4));
				}
				//not assigned
				else{
					//set up view as initial method
					this.viewRawSwitch(true);

					//clean up all the temp storage for svgs and editors
					this.tempSvg = {};
					this.tempEditor = {};

					//cleanup currently activated flag
					this.activatedView = '';

					//clean up all the inputs 
					this.$el.find('#html-editor').val('');
					this.$el.find('#svg-editor').val('');
					this.$el.find('#editors-editor').val('');
				}

				//remove hidden class first, otherise no height
				$viewMenu.removeClass('hidden');
				this.originalTopLeft.top = (($window.height() - config.e.pageY) < $viewMenu.height()) ? 
							((config.e.pageY - $viewMenu.height() <= 10) ? ($window.height() - $viewMenu.height()) : config.e.pageY - $viewMenu.height()) 
							: config.e.pageY;
				this.originalTopLeft.left = (($window.width() - config.e.pageX) < $viewMenu.width()) ? (config.e.pageX - $viewMenu.width()) : config.e.pageX;
				//adjust view menu position
				$viewMenu.css({
					top: this.originalTopLeft.top,
					left: this.originalTopLeft.left,
				});

			}else{
				$viewMenu.addClass('hidden');
			}
		},
		resetToOriginalHeight: function(callFromExpand){
			if(callFromExpand)
				this.$el.parent().css({
					top: this.originalTopLeft.top,
					left: this.originalTopLeft.left,
				});

			//reset tab holder size
			this.$el.find('.view-menu-top-holder .tabs').css({
				width: 510 + 'px'
			});

			//reset middle holder the sizes
			this.$el.find('.view-menu-middle-holder').css({
				height: 450 + 'px'
			});

			//set up info height specifically for view and data content
			this.$el.find('.view-menu-list, .data-editor-holder').css({
				height: 400 + 'px'
			});
		}
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