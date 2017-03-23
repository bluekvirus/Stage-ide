;(function(app){

	app.view('Create.GuidelineEvenSplitConfirm', {
		template: '@view/create/guideline-even-split-confirm.html',
		overlay: true,
		onReady: function(){

		},
		editors: {
			'number-of-regions': {
				type: 'number',
				label: 'Number of Regions',
				help: 'How many regions do you want to evenly split?',
				layout: {
					label: 'col-md-3',
					field: 'col-md-9'
				},
				validate: {
					required: true,
					fn: function(val){
						if(val <= 1)
							return 'The number should be strictly greater than 1.';
					},
				}
			},
		},
		actions: {
			close: function(){
				this.close();
			},
			split: function(){
				//trigger overwrite event, create context will re-generate
				if(!this.validate(true)){
					if(app._global.regionView){
						this.$el.find('.warning-message').removeClass('hidden');
						//this.$el.find('.modal-footer .button-holder').addClass('hidden');
					}else{
						app.coop('guideline-even-divide-confirmed', parseInt(this.getEditor('number-of-regions').getVal()));
						this.close();
					}
				}
				
			},
			'continue-no': function(){
				this.$el.find('.warning-message').addClass('hidden');
				//this.$el.find('.modal-footer .button-holder').removeClass('hidden');
			},
			'continue-yes': function(){
				if(!this.validate(true)){
					app.coop('guideline-even-divide-confirmed', parseInt(this.getEditor('number-of-regions').getVal()));
					this.close();
				}
			},
		}
	});

})(Application);