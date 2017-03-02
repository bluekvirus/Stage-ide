;(function(app){

	app.view('Create.Save', {
		template: '@view/create/save.html',
		overlay: true,
		onReady: function(){
			var that = this;
			//give default value to the editor
			var name = $('.side-menu-list .current-name').text();
			this.getEditor('name').setVal(name);

			this.$el.on('keypress', function(e){
				if(e.which === 13){
					that.saveTemplate();
				}
			});
		},
		editors: {
			name: {
				type: 'text',
				label: 'Template Name',
				help: 'please give a template name',
				validate: {
					required: true,
					fn: function(val, parentCt){
						if( val === 'horizontal-line' || val === 'vertical-line' || 
							val === 'endPoints' || val === 'current' || val === 'untitled' ||
							val === '__opened__'|| val === 'regionView') 
							return 'The name "' + val + '" is reserved for system use.';
					},
				},
				layout: {
					label: 'col-md-4',
					field: 'col-md-8',
				},
			},
			'view-name': {
				type: 'text',
				label: 'View Name(optional)',
				help: 'the names of views use this layout configuration, separated by ";"',
				validate: {
					fn: function(val, parentCt){
						if( val === 'mainview')
							return 'The name "' + val + '" is reserved for system use.';
					},
				},
				layout: {
					label: 'col-md-4',
					field: 'col-md-8',
				},	
			}
		},
		actions: {
			close: function(){
				this.close();
			},
			save: function(){
				this.saveTemplate();
			},
			overwrite: function(){
				var temp = {}, name = this.getEditor('name').getVal();
				temp.endPoints = app._global.endPoints;
				temp['horizontal-line'] = app._global['horizontal-line'];
				temp['vertical-line'] = app._global['vertical-line'];
				temp['view-name'] = this.getEditor('view-name').getVal();

				//store
				app.store.remove(name);
				app.store.set(name, temp);
				app.coop('save-region-view-config', name);

				if(this.get('new-gen'))
					app.coop('new-template-confirmed', name);

				if(this.get('switching'))
					app.coop('save-template-switch-confirmed', {
						name: name,
						$button: this.get('switching')
					});

				this.close();
			},
			'continue-new': function(){
				app.coop('new-template-confirmed');
				this.close();
			},
			'continue-switch': function(){
				app.coop('continue-template-switch', this.get('switching'));
				this.close();	
			},
			cancel: function(){
				this.$el.find('.overwrite-message').addClass('hidden');
			}
		},
		saveTemplate: function(){
			if(!this.validate(true)){
				var temp = {}, name = this.getEditor('name').getVal();
				temp.endPoints = app._global.endPoints;
				temp['horizontal-line'] = app._global['horizontal-line'];
				temp['vertical-line'] = app._global['vertical-line'];
				temp['view-name'] = this.getEditor('view-name').getVal();

				if(app.store.get(name)){//overwrite
					this.$el.find('.overwrite-message .name').text(name);
					this.$el.find('.overwrite-message').removeClass('hidden');
				}else{//no overwrite
					app.store.set(name, temp);
					app.coop('template-added', name);
					app.coop('save-region-view-config', name);
					if(this.get('new-gen'))
						app.coop('new-template-confirmed', name);

					if(this.get('switching'))
						app.coop('save-template-switch-confirmed', {
							name: name,
							$button: this.get('switching')
						});
					
					app.notify('Saved!', 'Template <strong>' + name + '</strong> has been saved.', 'ok', {icon: 'fa fa-fort-awesome'});
					this.close();
				}
			}
		}
	});

})(Application);