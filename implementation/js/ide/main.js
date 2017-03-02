/**
 * Sample MAIN script.
 *
 * @author Stagejs.CLI
 * @created Fri Jan 20 2017 01:27:21 GMT-0800 (PST)
 */
;(function(app){

	/////////////////setup/////////////////
	app.setup({
		template: '@ide.html', //can be undefined if using layout
		layout: undefined,
		contextRegion: 'contexts',
		curtains: {},

		//Note: Always set navRegion if using app template here, unless you've merged it(the tpl) with index.html;
		defaultContext: 'Create',
		viewSrcs: 'js/ide', //set this to a folder path to enable view dynamic loading. 
		//---------------------------------------------------------------------------------------------
		fullScreen: false, //this will put <body> to be full screen sized (window.innerHeight).
		//---------------------------------------------------------------------------------------------
		i18nTransFile: 'i18n.json', //can be {locale}.json
		i18nLocale: '', //if you really want to force the app to certain locale other than browser preference. (Still override-able by ?locale=.. in url)
		//---------------------------------------------------------------------------------------------
		baseAjaxURI: '', //modify this to fit your own backend apis. e.g index.php?q= or '/api'
		timeout: 5 * 60 * 1000 //general communication timeout (ms), e.g when using app.remote()
	});

	///////////initializers/////////// - [optional]
	app.addInitializer(function(){
		//reload previously stored configuration
		
		var endPoints, hlines, vlines, temp, regionView;


		if(app.store.get('current')){//has currently actived template

			temp = app.store.get(app.store.get('current'));
			endPoints = temp.endPoints;
			hlines = temp['horizontal-line'];
			vlines = temp['vertical-line'];
			regionView = temp.regionView;

		}else{//no currently actived template
			
			endPoints = app.store.get('endPoints');
			hlines = app.store.get('horizontal-line');
			vlines = app.store.get('vertical-line');
			regionView = app.store.get('regionView');
		}
		
		if(endPoints && hlines && vlines){
			app._global = app._global || {};
			app._global.endPoints = endPoints;
			app._global['horizontal-line'] = hlines;
			app._global['vertical-line'] = vlines;
			app._global.regionView = regionView;
		}

		console.log(app.store.get('regionView'), app._global && app._global.regionView);
	});

	app.addInitializer(function(){
		//menu status
		//use __opened__ as local key to store menu status
		if(!app.store.get('__opened__')) app.store.set('__opened__', false);
	});
	//Note: initializer can return a promise object for async loading, 
	//add more initializers if you need. e.g `return app.remote() or $.ajax()`.
	
	///////////////////////////warning///////////////////////////
	//Don't put app.run() here, use the one found in index.html//
	/////////////////////////////////////////////////////////////

})(Application);