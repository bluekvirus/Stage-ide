/**
 * Sample VIEW script.
 *
 * @author Stagejs.CLI
 * @created Fri Mar 17 2017 16:47:11 GMT-0700 (PDT)
 */
;(function(app){

	app.view('Create.Export', {

		template: '@view/create/export.html',
		//data: 'url', {} or [],
		//coop: ['e', 'e'],
		//[editors]: {...},
		overlay: true,
		initialize: function(){},
		//onShow: function(){},
		//onDataRendered: function(){},
		onReady: function(){
			var that = this;
			//hide overwrite menu if editor is chaning
			this.getEditor('view-name').listenTo(this.getEditor('view-name'), 'editor:keyup', app.debounce(function(){
				var $msg = that.$el.find('.overwrite-message');
				if(!$msg.hasClass('hidden'))
					that.$el.find('.overwrite-message').addClass('hidden');
			}));
		},
		actions: {
			close: function(){
				this.close();
			},
			save: function(){
				this.saveViewToServer(this.get('view-name'));
			},
			overwrite: function(){
				this.saveViewToServer(this.get('view-name'), true);
			},
			'overwrite-cancel': function(){
				this.$el.find('.overwrite-message').addClass('hidden');
			}
		},
		editors: {
			'view-name': {
				type: 'text',
				label: 'View Name',
				help: 'please give a view name',
				validate: {
					required: true,
				},
				layout: {
					label: 'col-md-4',
					field: 'col-md-8',
				},
			},
		},
		saveViewToServer: function(name, overwrite){
			var that = this;
			//get html from the layout
			var $html = $(app.locate('Create').view.getViewIn('generate-view').$el[0].outerHTML),
				svg = {},
				editors = {};
			//var html = app.locate('Create').view.getViewIn('generate-view').$el.html();

			//trim out the contents inside svg= and editor= for avoiding double show
			$html.find('div[svg], div[editor]').empty();

			//walk through all the configurations saved in regionView
			_.each(app._global.regionView, function(rv){
				//check if method is view or html
				//method is view
				if(rv.method === 'view'){
					//!!SVG and editors change is not going to happen, since editing can only happen in html mode.
					//if method is view, need to get assigned region, mark view on the region tag, and delete all the 
					//... process ...
					//find assigned region
					var region = _.find(app._global.regions, function(r){
						return rv.topLeft === r.topLeft &&
								rv.topRight === r.topRight &&
								rv.bottomLeft === r.bottomLeft &&
								rv.bottomRight === r.bottomRight;
					});
					//find $region and remove the html inside and mark view on the region tag
					var $region = $html.find('[region="' + region.regionName + '"]');
					//empty
					$region.empty();
					//mark view on region
					$region.attr('View', rv.view);
				}
				//method is html
				else{
					//extend svg and editors object.
					_.extend(svg, rv.svg);
					_.extend(editors, rv.editors);
				}
			});

			var html = $html[0].outerHTML;

			//output for debugging
			app.debug('exporting objects...', html, svg, editors);
			
			//call backend to save this view
			app.remote({
				url: '/api/viewexport',
				payload: {
					html: html,
					name: name,
					svg: svg,
					editors: editors,
					overwrite: overwrite,
				}	
			}).fail(function(data){
				//add name into the message
				that.$el.find('.name').text(name);
				//remove hidden class
				that.$el.find('.overwrite-message').removeClass('hidden');
			}).done(function(data){
				app.notify('Success!', 'View has been saved.', 'ok', {icon: 'fa fa-fort-awesome'});
				//close the view, if save successfully
				that.close();
			});
		},

	});

})(Application);