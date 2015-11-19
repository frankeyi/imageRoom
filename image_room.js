/**
 * WEB图片查看
 * author：joson
 * 
 * 使用方法：
 * 选中所要被分到一组的图片，用room()方法即可，图片需要加上data-room-src属性指定大图路径，如:
 * <div id="test"><img src="xx" data-room-src="xxx" /></div>
 * $('img').room();
 * 或 $('#test').find('img').room();
 * 不是图片的对象也行，只要指定data-room-src属性，如：
 * <div data-room-src="xx"></div>
 * $('div').room();
 */


(function($){
	var loading_gif = 'http://s-static.oss-cn-qingdao.aliyuncs.com/loading.gif';
	
	
	var layer = $('<div style="position:fixed;z-index:102;left:0;top:0;right:0;bottom:0;background:#1a1a1a;overflow:hidden;"></div>');
	var container = $('<ul style="position:absolute;height:100%;"></ul>');
	var btn_container = $('<div style="position:absolute; bottom:10px; width:100%; height:20px; text-align:center;"></div>');
	
	//html定义
	var item_html = '<li style="float:left;height:100%;position:relative; overflow:hidden;"></li>';
	var loading_html = '<div class="room_img_loading" style="position:absolute;top:0;left:0;right:0;bottom:0;background-image:url('+loading_gif+');background-repeat:no-repeat;background-position:center;">';
	var btn_html = '<div style="width:10px;height:10px;background:#ccc;display:inline-block; margin:0 2px;"></div>';
	
	var init_container = false;
	
	
	
	//获得两点之间的直线距离
	var get_distance = function(x1,y1,x2,y2){
		return Math.sqrt( ( x2 - x1 )*( x2 - x1 ) + ( y2 - y1 ) * ( y2 - y1 ) );
	};
	
	
	//不同缩略等级坐标转换
	var translateLevelPos = function(x,y,src_w,src_h,target_w,target_h){
		var scaleX = target_w / src_w;
		var rx = x * scaleX;
		var scaleY = target_h / src_h;
		var ry = y * scaleY;
		return {x:rx,y:ry};
	};
	
	
	$.fn.extend({

		room : function(){
			
			if(!init_container){
				init_container = true;
				layer.append(container);
				layer.append(btn_container);
			}
			
			var img = $(this);
			var count = img.size();
			var is_init = false;
			var screen_width, screen_height;
			var current = 0;
			var items;
			var currentX = 0, currentImg, prevImg, currentImgX = 0, currentImgY = 0;
			var startX,endX,startY,endY,prevX,prevY,flag=false,mouse_status = false;
			var ci_w,ci_h;
			var gesture = '';
			var taptime;
			var startx1,starty1,startx2,starty2,start_distance,scale_status,yw,yh;
			
			
			//屏幕坐标转图片坐标
			var translateScreenPosToImagePos = function(x,y){
				var imageX = x - parseInt( currentImg.css('left') );
				var imageY = y - parseInt( currentImg.css('top') );
				return {x:imageX,y:imageY};
			};
			
			//图片坐标转屏幕坐标
			var translateImagePosToScreenPos = function(x,y){
				var screenX = x + parseInt( currentImg.css('left') );
				var screenY = y + parseInt( currentImg.css('top') );
				return {x:screenX,y:screenY};
			};
			
			
			var init = function(i){
				
				
				var moveimg_x = 0;
				var movestatus = '';
				
				items = new Array;
				current = i;
				screen_width = $(window).width();
				screen_height = $(window).height();
				container.find('li').remove();
				
				container.css({
					left:0,
					width : screen_width * count
				});
				
				btn_container.html('');
				img.each(function(i){
					var item = $(item_html);
					var loading = $(loading_html);
					item.width( screen_width );
					item.append(loading);
					container.append(item);
					items.push(item);
					btn_container.append( btn_html );
				});

				$(document.body).append( layer );
				to(true);
				
				container.bind({
					
					dragstart : function(){
						return false;
					},
					
					mousewheel : function(e){
						if( e.deltaY > 0 ){
							left();
						}else{
							right();
						}
						e.preventDefault();
					},
					
					mousedown : function(e){
						var event = e?e:event;
						mouse_status = true;
						taptime = new Date().getTime();
						endX = 0;
						startX = event.pageX;
					},
					
					mousemove : function(e){
						if( !mouse_status )
							return ;
						var event = e?e:event;
						var x = event.pageX;
						endX = x - startX;
						container.css({'left':currentX+ endX});
					},
					
					mouseup : function(e){
						mouse_status = false;
						if( (endX > -5 && endX < 5)  && new Date().getTime() - taptime < 300 ){
							close();
							return ;
						}
						var w = screen_width * 0.15;
						if( endX > -w && endX < w ){
							to();
						}else if( endX > 0 ){
							left();
						}else if( endX < 0 ){
							right();
						}
					},
					
					touchstart : function(e){
						var event = e?e:event;
						currentImg = items[current].find('img');
						taptime = new Date().getTime();
						moveimg_x = 0;
						gesture = '';
						movestatus = '';
						prevImg = null;
						
						if( event.touches.length == 1 ){
							prevX = startX = event.touches[0].pageX;
							prevY = startY = event.touches[0].pageY;
							endX = 0;
							currentImgX = parseInt( currentImg.css('left') );
							currentImgY = parseInt( currentImg.css('top') );
						}
						
						if( event.touches.length == 2 ){
							scale_status = true;
							start_distance = get_distance( event.touches[0].pageX,event.touches[0].pageY, event.touches[1].pageX, event.touches[1].pageY );
							yw = items[current].width();
							yh = items[current].height();
						}
						
						e.preventDefault();
					},
					
					touchmove : function(e){
						var event = e?e:event;
						if( gesture == '' ){
							if(event.touches.length == 1){
								endX = event.touches[0].pageX - startX;
								if( (endX < -5 || event.touches[0].pageY - startY < -5 ) || (endX > 5 || event.touches[0].pageY - startY > 5 ) ){
									gesture = 'move';
								}
							}
							if(event.touches.length == 2){
								gesture = 'scale';
							}
						}
						
						if( gesture == 'move' ){
							var cl = parseInt( currentImg.css('left') ),ct = parseInt( currentImg.css('top') );
							var x = event.touches[0].pageX, y = event.touches[0].pageY;
							var arrow;
							var angle = Math.atan2( Math.abs(y-prevY), Math.abs(x-prevX) ) / Math.PI * 180 ;
							
							
							//判断方向
							if( prevY != y && angle > 10){
								
								arrow = 'updown';
								
							}else{
								if( prevX > x ){
									arrow = 'left';
								}
								if( prevX < x ){
									arrow = 'right';
								}
							}
								
							if( movestatus == '' || movestatus == 'scale' ){
								if(arrow == 'updown' && currentImg.height() > currentImg.attr('init-height') ){
									movestatus = 'scale';
								}else if(  (arrow == 'right' && cl < 0) || (arrow == 'left' && cl + currentImg.width() > screen_width)  ){
									movestatus = 'scale';
								}else{
									movestatus = 'switch';
								}
							}
							
							if( movestatus == 'scale' ){
								var l1,t1;
								if( arrow == 'right' ){
									l1 = currentImgX + ( x - startX ) > 0 ? 0 : currentImgX + ( x - startX );
								}
								if( arrow == 'left' ){
									l1 = currentImgX + ( x - startX ) < -(currentImg.width() - screen_width) ? -(currentImg.width() - screen_width) :currentImgX + ( x - startX )
								}
								if( arrow == 'updown' ){
									l1 = currentImgX + ( x - startX );
									if( l1 > 0 ){
										l1 = 0;
									}
									if( l1 < -(currentImg.width() - screen_width) ){
										l1 = -(currentImg.width() - screen_width);
									}
								}
								
//								if( ct < 0 || ct+currentImg.height() > screen_height ){
									t1 = currentImgY + ( y - startY );
//									
//									if( t1 > 150 ) t1 = ct;
//									if( t1 < screen_height - currentImg.height() - 150 ) t1 = ct;
//								}else{
//									t1 = currentImgY;
//								}
								currentImg.css({
									left : l1,
									top : t1
								});
								moveimg_x = x - startX;
							}
							
							if( movestatus == 'switch' ){
								endX = x - startX - moveimg_x;
								container.css({'left':currentX+ endX});
							}
							
							prevX = x;
							prevY = y;
							
						}
						
						if( gesture == 'scale' && scale_status ){
							var srcw = currentImg.attr('src-width'),srch = currentImg.attr('src-height');
							var current_distance = get_distance( event.touches[0].pageX,event.touches[0].pageY, event.touches[1].pageX, event.touches[1].pageY );
							var b = Math.ceil( current_distance - start_distance ) / 100;
							var cw = currentImg.width(),ch = currentImg.height(),cl = parseInt( currentImg.css('left') ),ct = parseInt( currentImg.css('top') );
							var w = cw + cw * b >= srcw ? srcw : cw + cw * b, h = ch + ch * b >= srch ? srch : ch + ch * b;
							var cx = (event.touches[1].pageX - event.touches[0].pageX) / 2 + event.touches[0].pageX ,cy = (event.touches[1].pageY - event.touches[0].pageY) / 2 + event.touches[0].pageY - $(window).scrollTop();
							
							
							var pos = translateScreenPosToImagePos( cx, cy );
							pos.x = pos.x>0?pos.x:0;
							pos.x = pos.x>cw?cw:pos.x;
							pos.y = pos.y>0?pos.y:0;
							pos.y = pos.y>ch?ch:pos.y;
							
							var screenPos = translateImagePosToScreenPos(pos.x,pos.y);
							var p = translateLevelPos( pos.x,pos.y, cw,ch,w,h );
							
							currentImg.css({
								width : w,
								height : h,
								maxWidth : w,
								maxHeight : h,
								minWidth : w,
								minHeight : h
							});
							
							if( srcw != w ){
								currentImg.css({
									left : cl + ( screenPos.x - (p.x + cl)),
									top : ct + (screenPos.y - (p.y + ct) )
								});
							}
							
							start_distance = current_distance;
							yw = items[current].width();
							yh = items[current].height(); 
						}
						
						
						e.preventDefault();
					},
					touchend : function(e){
						
						if( gesture == '' ){
							
							if( new Date().getTime() - taptime < 250 ){
								close();
								return ;
							}
						}
						
						if( gesture == 'scale' ){
							scale_status = false;
							
							if( currentImg.width() < currentImg.attr('init-width') || currentImg.height() < currentImg.attr('init-height') ){
								
								var img_width = currentImg.attr('init-width');
								var img_height = currentImg.attr('init-height');
								
								currentImg.animate({
									width : img_width,
									height: img_height,
									maxWidth : img_width,
									maxHeight : img_height,
									minWidth : img_width,
									minHeight : img_height,
									left : ( screen_width - img_width ) / 2,
									top : ( screen_height - img_height ) / 2
								},'fast');
								
							}
							
						}
						
						if( gesture == 'move'){
							var w = screen_width * 0.15;
							if( endX > -w && endX < w ){
								to();
							}else if( endX > 0 ){
								prevImg = currentImg; 
								left();
							}else if( endX < 0 ){
								prevImg = currentImg;
								right();
							}
						}
						e.preventDefault();
					}
					
				});
				
//				if(!$.is_touch()){
//					container.bind({
//						click : function(){
//							close();
//						}
//					})
//				}
				
			};
			
			var init_image = function(img_item){
				var img_width,img_height;
				ci_w = img_item.attr('src-width');
				ci_h = img_item.attr('src-height');
				
				
				if( ci_w > screen_width || ci_h > screen_height ){
					
 					if( screen_width / ci_w < screen_height /ci_h ){
						img_width = screen_width;
    					img_height = screen_width / ci_w * ci_h;
					}else{
						img_width = screen_height / ci_h * ci_w;
    					img_height = screen_height;
					}
 					
				}else{
					img_width = ci_w;
					img_height = ci_h;
				}
				
				img_item.attr('init-width',img_width);
				img_item.attr('init-height',img_height);
				
				img_item.css({
					width : img_width,
					height: img_height,
					maxWidth : img_width,
					maxHeight : img_height,
					minWidth : img_width,
					minHeight : img_height,
					left : ( screen_width - img_width ) / 2,
					top : ( screen_height - img_height ) / 2
				});
			};
			
			var load_img = function(){
				var item = img.eq(current);
				var cont = items[current];
				
				
				if( cont.find('.room_img_loading').size() == 0 )
					return ;
				
				var src = item.attr('data-room-src');
				var image = new Image;
				
				image.onload = function(){
					
					var img_item = $('<img src="'+src+'" style="position:absolute;" />');
					
					img_item.attr('src-width',this.width);
					img_item.attr('src-height',this.height);
					
					cont.find('*').remove();
					init_image(img_item);
					cont.append(img_item);
				};
				image.src = src;
			};
			
			var to = function(init){
				currentX = -current * screen_width;
				if(init){
					container.css({
						left : currentX
					});
				}else{
					container.stop().animate({
						left : currentX
					},'fast');
				}
				load_img();
				btn_container.find('div').css('background','#ccc').eq(current).css('background','#666');
				
			};
			
			var left = function(){
				current--;
				if( current < 0 )
					current = 0;
				else{
					if(prevImg)
						init_image(prevImg);
				}
				to();
			};
			var right = function(){
				current++;
				if( current == count )
					current = count - 1;
				else{
					if(prevImg)
						init_image(prevImg);
				}
				to();
			};
			var close = function(){
				layer.remove();
			};
			
			img.each(function(i){
				
				$(this).click(function(){
					init(i);
				});
				
			});
			
			
		}
		
	});
	
})(jQuery);
