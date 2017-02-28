;(function(app){

	app.view('Create.ResetConfirm', {
		template: '@view/create/reset-confirm.html',
		overlay: true,
		onReady: function(){

		},
		actions: {
			close: function(){
				this.close();
			},
			continue: function(){
				//trigger overwrite event, create context will re-generate
				app.coop('user-reset');
				this.close();
			}
		}
	});

})(Application);