/**
 * Sample VIEW script.
 *
 * @author Stagejs.CLI
 * @created Thu Feb 23 2017 14:45:07 GMT-0800 (PST)
 */
;(function(app){

	app.view('User.Content', {

		template: '@view/user/content.html',
		//data: 'url', {} or [],
		//coop: ['e', 'e'],
		//[editors]: {...},
		
		initialize: function(){},
		//onShow: function(){},
		//onDataRendered: function(){},
		svg: {
			'test-svg1': function(paper){
				paper.circle(20, 20, 15);
			}
		},
		editors: {
			'test-editor': {
				type: 'number',
			},
		},
		actions: {
		//	submit: function(){...},
		//	dosomething: function(){...},
		//	...
		},

		onReady: function(){
			//console.log('templates', this.getTemplate(true));
		},

	});

})(Application);