;(function(app){

	app.view('Create.Delete', {
		template: '@view/create/delete.html',
		overlay: true,
		onReady: function(){

		},
		actions: {
			close: function(){
				this.close();
			},
			delete: function(){
				//get template id
				var name = this.get('name'),
					$elem = this.get('$elem');
				//remove tempalte saved in local storage
				app.store.remove(name);
				//remove menu item in DOM
				$elem.parent().remove();

				//remove active, change current-name to untitled
				var active = $elem.parent().find('.side-menu-item-text').hasClass('active');
				if(active){
					$('.side-menu-list .current-name').text('untitled');
					app.store.remove('current');
					//send coop event to reset layout
					app.coop('active-template-deleted');
				}

				//send notification
				app.notify('Deleted!', 'Template ' + name + 'has been deleted.', 'ok', {icon: 'fa fa-fort-awesome'});

				//close current view
				this.close();
			},
		}
	});

})(Application);