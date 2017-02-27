;(function(app){

	app.view('Create.LayoutResetConfirm', {
		template: '@view/create/layout-reset-confirm.html',
		actions: {
			close: function(){
				this.close();
			},
			continue: function(){
				if(this.get('anchor'))
					app.coop('point-layout-reset-confirmed', this.get('anchor'));
				else
					app.coop('line-layout-reset-confirmed');

				this.close();
			}
		}
	});

})(Application);