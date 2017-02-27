;(function(app){

	app.view('Create.GenerateConfirm', {
		template: '@view/create/generate-confirm.html',
		overlay: true,
		onReady: function(){

		},
		actions: {
			close: function(){
				this.close();
			},
			overwrite: function(){
				//trigger overwrite event, create context will re-generate
				app.coop('generate-overwrite');
				this.close();
			}
		}
	});

})(Application);