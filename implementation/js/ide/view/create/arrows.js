;(function(app){

	app.view('Create.Arrows', {
		template: '@view/create/arrows.html',
		coop: ['click-endpoint', 'point-layout-reset-confirmed'],
		lines: {//store lines attached to current point
			up: '',
			down: '',
			left: '',
			right: ''
		},
		point: '',//store the point currently focusing on
		shown: false,//variable indicate whether currently menu is showing or not. for other views and events to consult.
		onReady: function(){

		},
		onClickEndpoint: function(e){
			//hide side menu if necesary
			var $trigger = this.parentCt.$el.find('.side-menu-trigger');
			if($trigger.hasClass('active'))
				this.parentCt.toggleSideMenu($trigger);
			//reset
			this.cleanIndication();
			//vars
			var $target = $(e.target),
				radius = this.parentCt.getViewIn('layout').radius,
				width = this.$el.find('.end-point-menu').width(),
				height = this.$el.find('.end-point-menu').height(),
				x = $target.offset().left,
				y = $target.offset().top;

			var pid = $target.attr('point-id'),
				point = app._global.endPoints[pid];
			//store pid in View
			this.point = point;

			//check if point is on frame, if yes do not show menu
			if(
				point.x <= 0 + app._global.tolerance || 
				point.y <= 0 + app._global.tolerance || 
				point.x >= 100 - app._global.tolerance|| 
				point.y >= 100 - app._global.tolerance
			) {
				//notification
				app.notify('Cannot be Operated', 'End points on outter frame cannot be operated! Choose inside end points inside!', 'error', {icon: 'fa fa-reddit-alien'});
				//close currently opened menu, if showing
				if(this.shown)
					this.closeMenu();
				return;
			}

			//add active tag to current element
			//!!Note: jQuery2 does NOT support SVG element addClass. jQuery3 claims it has solved this problem.
			$target.attr('class', 'end-point draggble active');
			
			//show menu
			this.$el.find('.end-point-menu').css({
				left: (x - width / 2 + radius) + 'px',
				top: (y - height / 2 + radius) + 'px'
			}).removeClass('hidden');

			//flip flag
			this.shown = true;

			//NOW check in four directions whether there is a line attached 
			//if no pass
			//if yes check whether that line can be deleted or not
			this.colorArrows(point);
		},
		actions: {
			delete: function($self){
				//if parectView has generated layout, send reset event
				if(this.parentCt.generated){
					(new (app.get('Create.LayoutResetConfirm'))({
						data: {
							anchor: $self
						}
					})).overlay({
						effect: false,
						class: 'layout-reset-confirm-overlay create-overlay danger-title',
					});
				}
				else
					this.confirmDelete($self);
			}
		},
		onPointLayoutResetConfirmed: function($anchor){
			this.coop('layout-resetted');
			this.confirmDelete($anchor);
		},
		confirmDelete: function($self){
			if($self.find('i').hasClass('deletable')){//deletable
				var line = this.lines[$self.data('direction')];
				this.deleteLine(line, $self.data('direction'));

				this.coop('sync-local');
			}else{//NOT deletable
				app.notify('Cannot Delete', 'This line cannot be deleted!', 'error', {icon: 'fa fa-reddit-alien'});
			}
		},
		closeMenu: function(){
			//hide menu
			this.$el.find('.end-point-menu').addClass('hidden');
			this.shown = false;
			//cleanup
			this.cleanIndication();
		},
		cleanIndication: function(){
			//remove active class
			this.parentCt.$el.find('.end-point.active').attr('class', 'end-point draggble');
			//clean all the indication color
			this.$el.find('.indicator > i').removeClass('text-muted text-danger deletable');
		},
		checkDeletable: function(lineId, position){
			var line, dir, startPoint, endPoint,
				that = this;
			if(position === 'up' || position === 'down'){
				line = _.find(app._global['vertical-line'], function(vline){ return vline.id === lineId; });
				dir = 'v';
			}
			else{
				dir = 'h';
				line = _.find(app._global['horizontal-line'], function(hline){ return hline.id === lineId; });
			}
			//store line for later reference
			this.lines[position] = line;

			//if horizontal line, two end points need to both have top and bottom
			if(dir === 'h'){
				startPoint = app._global.endPoints[line.left];
				endPoint = app._global.endPoints[line.right];

				if(startPoint.top && startPoint.bottom && endPoint.top && endPoint.bottom){//deletable
					this.$el.find('.' + position + ' > i').addClass('text-danger deletable');
					return true;
				}
				else//not deletable
					this.$el.find('.' + position + ' > i').addClass('text-muted');
			}
			//if vertical line, two end points need to both have left and right
			else{
				startPoint = app._global.endPoints[line.top];
				endPoint = app._global.endPoints[line.bottom];

				if(startPoint.left && startPoint.right && endPoint.left && endPoint.right){//deletable
					this.$el.find('.' + position + ' > i').addClass('text-danger deletable');
					return true;
				}
				else//not deletable
					this.$el.find('.' + position + ' > i').addClass('text-muted');
			}

			return false;
			
		},
		deleteLine: function(line, position){
			var startPoint, endPoint,
				left, right, top, bottom,
				that = this;

			if(position === 'up' || position === 'down'){//deleting vertical line

				//get end points
				startPoint = app._global.endPoints[line.top];
				endPoint = app._global.endPoints[line.bottom];

			}else{//deleting horizontal line

				//get end points
				startPoint = app._global.endPoints[line.left];
				endPoint = app._global.endPoints[line.right];
			}
			
			//start point not attached anymore
			if(!checkAttached(startPoint, line.id, position)){
				removeAttachedPoint(startPoint, (position === 'up' || position === 'down') ? 'v' : 'h');
			}

			//end point not attached anymore
			if(!checkAttached(endPoint, line.id, position)){
				removeAttachedPoint(endPoint, (position === 'up' || position === 'down') ? 'v' : 'h');
			}

			//remove current line
			removeLineFromCollection(line.id, (position === 'up' || position === 'down') ? 'v' : 'h', true);

			app.coop('line-deleted');

			//if point still exists re-color, if not hide
			if(app._global.endPoints[this.point.id]){
				this.colorArrows(this.point);

				//add active class back
				_.defer(function(){
					_.each($('.end-point.draggble'), function(el){
						var $el = $(el);
						if($el.attr('point-id') === that.point.id)
							$el.attr('class', 'end-point draggble active');
					});
				});
			}
			else{
				this.$el.find('.end-point-menu').addClass('hidden');
				//flip flag
				this.shown = false;
			}

			app.notify('Success!', 'Line has been deleted.', 'ok', {icon: 'fa fa-fort-awesome'});
				
		},
		colorArrows: function(point){
			this.cleanIndication();
			//top
			if(point.top){
				this.checkDeletable(point.top, 'up');
			}else{
				this.$el.find('.up > i').addClass('text-muted');
			}
			//bottom
			if(point.bottom){
				this.checkDeletable(point.bottom, 'down');
			}else{
				this.$el.find('.down > i').addClass('text-muted');
			}
			//left
			if(point.left){
				this.checkDeletable(point.left, 'left');
			}else{
				this.$el.find('.left > i').addClass('text-muted');
			}
			//right
			if(point.right){
				this.checkDeletable(point.right, 'right');
			}else{
				this.$el.find('.right > i').addClass('text-muted');
			}
		},
	});

	function checkAttached(point, selfId, position){
		
		if(position === 'up' || position === 'down'){//check vertical lines

			if(//4 attachments must have at least one that is not deleting line
				(point.top && point.top !== selfId) ||
				(point.bottom && point.bottom !== selfId)
			)
				return true;

		}else{//check horizontal lines

			if(//4 attachments must have at least one that is not deleting line
				(point.left && point.left !== selfId) ||
				(point.right && point.right !== selfId)
			)
				return true;
		}
		
		return false;
	}

	function removeLineFromCollection(lineId, dir, updateEndpoint){
		var line;
		if(dir === 'h'){//horizontal line
			if(updateEndpoint){
				//delete end pointer point reference
				line = _.find(app._global['horizontal-line'], function(hline){ return hline.id === lineId; });
				app._global.endPoints[line.left] && delete app._global.endPoints[line.left].right;
				app._global.endPoints[line.right] && delete app._global.endPoints[line.right].left;
			}
			//delete line
			app._global['horizontal-line'] = _.without(app._global['horizontal-line'], _.find(app._global['horizontal-line'], function(hline){ return hline.id === lineId; }));
		}else{//vertical line
			if(updateEndpoint){
				//delete end pointer point reference
				line = _.find(app._global['vertical-line'], function(vline){ return vline.id === lineId; });
				app._global.endPoints[line.top] && delete app._global.endPoints[line.top].bottom;
				app._global.endPoints[line.bottom]&& delete app._global.endPoints[line.bottom].top;
			}
			//delete line
			app._global['vertical-line'] = _.without(app._global['vertical-line'], _.find(app._global['vertical-line'], function(vline){ return vline.id === lineId; }));
		}
	}

	function removeAttachedPoint(point, dir){
		var pre, after, x1, x2, y1, y2, startPoint, endPoint,
			newLineId = _.uniqueId((dir === 'h') ? 'vertical-' : 'horizontal-');
		if(dir === 'h'){//deleting horizontal line
			//get two vertical segments
			pre = _.find(app._global['vertical-line'], function(vline){ return vline.id ===  point.top;});
			after = _.find(app._global['vertical-line'], function(vline){ return vline.id ===  point.bottom;});

			//assign new line coords
			x1 = x2 = pre.x;
			y1 = pre.y1;
			y2 = after.y2;
			startPoint = pre.top;
			endPoint = after.bottom;

			//update end points' pointer to the new line
			app._global.endPoints[pre.top].bottom = newLineId;
			app._global.endPoints[after.bottom].top = newLineId;

		}else{//deleting vertical line
			//get two horizontal segments
			pre = _.find(app._global['horizontal-line'], function(vline){ return vline.id ===  point.left;});
			after = _.find(app._global['horizontal-line'], function(vline){ return vline.id ===  point.right;});

			//assign new line coords
			x1 = pre.x1;
			x2 = after.x2;
			y1 = y2 = pre.y;
			startPoint = pre.left;
			endPoint = after.right;

			//update end points' pointer to the new line
			app._global.endPoints[pre.left].right = newLineId;
			app._global.endPoints[after.right].left = newLineId;
		}

		//remove old lines and the point
		removeLineFromCollection(pre.id, (dir === 'h') ? 'v' : 'h');//flip
		removeLineFromCollection(after.id, (dir === 'h') ? 'v' : 'h');
		delete app._global.endPoints[point.id];

		//gen new line use genLine in guide.js
		app.coop('gen-new-line', {x1: x1, y1: y1, x2: x2, y2: y2, startPoint: startPoint, endPoint: endPoint, id: newLineId, dir: (dir === 'h') ? 'v' : 'h'});
	}

})(Application);