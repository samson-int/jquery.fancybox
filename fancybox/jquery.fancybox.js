/*
 * Copyright (c) 2008 - 2010 Janis Skarnelis
 * Updated by Sergei Vasilev (https://github.com/Ser-Gen)
 *
 * Version: 1.6.4
 *
 * Dual licensed under the MIT and GPL licenses:
 *	 http://www.opensource.org/licenses/mit-license.php
 *	 http://www.gnu.org/licenses/gpl.html
 */

;(function($) {

	var actionEvent;

	if ( 'ontouchstart' in window ) {
		actionEvent = 'touchstart';
	}
	else {
		actionEvent = 'click';
	};

	var tmp, loading, overlay, wrap, outer, content, close, title, nav_left, nav_right, SCROLLBAR_WIDTH, bodyScrollCache = 0,

		selectedIndex = 0, selectedOpts = {}, selectedArray = [], currentIndex = 0, currentOpts = {}, currentArray = [],

		ajaxLoader = null, imgPreloader = new Image(), imgRegExp = /\.(jpg|gif|png|bmp|jpeg)(.*)?$/i, swfRegExp = /[^\.]\.(swf)\s*$/i,

		loadingTimer, loadingFrame = 1,

		initalWidth, initalHeight, initalAutoDimensions = false,

		titleHeight = 0, titleStr = '', start_pos, final_pos, busy = false, fx = $.extend($('<div/>')[0], { prop: 0 }),

		/*
		 * Private methods 
		 */

		_scrollBarCheck = function() {
			if ($('html').hasScrollBarY() || $('html').css('overflow') === 'scroll' || $('html').css('overflow-y') === 'scroll') {
				$('html').addClass('fancybox__shift');
			}
			else {
				$('html').removeClass('fancybox__shift');
			};

			if (actionEvent === 'touchstart') {
				if (!$('html').hasClass('fancybox__touch')) {
					bodyScrollCache = $(window).scrollTop();
				};
				$('html').addClass('fancybox__touch');
			};

			$('html').addClass('fancybox__lock');
		},

		_abort = function() {
			loading.hide();

			imgPreloader.onerror = imgPreloader.onload = null;

			if (ajaxLoader) {
				ajaxLoader.abort();
			}

			tmp.empty();
		},

		_error = function() {
			$.event.trigger('fancybox-onError', [
				currentArray,
				currentIndex,
				currentOpts
			]);

			if (false === selectedOpts.onError(selectedArray, selectedIndex, selectedOpts)) {
				loading.hide();
				busy = false;
				return;
			}

			selectedOpts.titleShow = false;

			selectedOpts.width = 'auto';
			selectedOpts.height = 'auto';

			tmp.html( '<p id="fancybox-error">The requested content cannot be loaded.<br />Please try again later.</p>' );

			_process_inline();
		},

		_fitWindowHeight = function () {
			if (actionEvent !== 'touchstart' || !selectedOpts.fitWindowHeight) {
				return;
			}

			var focus = $(':focus');

			// iOS - отменить ресайз из-за открытой клавиатуры
			if (focus.length && focus.is('input, textarea, [contenteditable=true]')) {
				return;
			}

			$(':root')[0].style.setProperty('--modal-max-height', window.innerHeight + 'px');
		},

		_isReadyType = function (type) {
			return ['html', 'inline', 'ajax'].indexOf(type) > -1;
		},

		_start = function() {
			var obj = selectedArray[ selectedIndex ],
				href, 
				type, 
				title,
				str,
				emb,
				ret;

			_abort();

			selectedOpts = $.extend(
				{},
				$.fn.fancybox.defaults,
				window.fancybox,
				(typeof $(obj).data('fancybox') == 'undefined' ? selectedOpts : $(obj).data('fancybox')));

			setTimeout(_fitWindowHeight, 500);

			$.event.trigger('fancybox-onStart', [
				selectedArray,
				selectedIndex,
				selectedOpts
			]);

			ret = selectedOpts.onStart(selectedArray, selectedIndex, selectedOpts);

			_scrollBarCheck();

			if (ret === false) {
				busy = false;
				return;
			} else if (typeof ret == 'object') {
				selectedOpts = $.extend(selectedOpts, ret);
			}

			title = selectedOpts.title || (obj.nodeName ? $(obj).attr('title') : obj.title) || '';

			if (obj.nodeName && !selectedOpts.orig) {
				selectedOpts.orig = $(obj).children("img:first").length ? $(obj).children("img:first") : $(obj);
			}

			if (title === '' && selectedOpts.orig && selectedOpts.titleFromAlt) {
				title = selectedOpts.orig.attr('alt');
			}

			href = selectedOpts.href || (obj.nodeName ? $(obj).attr('href') : obj.href) || null;

			if ((/^(?:javascript)/i).test(href) || href == '#') {
				href = null;
			}

			if (selectedOpts.fancyClass) {
				overlay.addClass(selectedOpts.fancyClass);
				wrap.addClass(selectedOpts.fancyClass);
				loading.addClass(selectedOpts.fancyClass);
				tmp.addClass(selectedOpts.fancyClass);
			};

			if (selectedOpts.type) {
				type = selectedOpts.type;

				if (!href) {
					href = selectedOpts.content;
				}

			} else if (selectedOpts.content) {
				type = 'html';

			} else if (href) {
				if (href.match(imgRegExp)) {
					type = 'image';

				} else if (href.match(swfRegExp)) {
					type = 'swf';

				} else if ($(obj).hasClass("iframe")) {
					type = 'iframe';

				} else if (href.indexOf("#") === 0) {
					type = 'inline';

				} else {
					type = 'ajax';
				}
			}

			if (!type) {
				_error();
				return;
			}

			if (type == 'inline') {
				obj	= href.substr(href.indexOf("#"));
				type = $(obj).length > 0 ? 'inline' : 'ajax';
			}

			selectedOpts.type = type;
			selectedOpts.href = href;
			selectedOpts.title = title;

			if (selectedOpts.autoDimensions) {
				if (_isReadyType(selectedOpts.type)) {
					initalAutoDimensions = true;
					selectedOpts.width = 'auto';
					selectedOpts.height = 'auto';
				} else {
					initalAutoDimensions = false;
					selectedOpts.autoDimensions = false;
				}
			}

			// Сохраняем начальные размеры для обновления при ресайзе,
			// т.к. размеры заменяются в ходе выполнения скрипта.
			// Это нужно для отключенного `autoDimensions`
			initalWidth = selectedOpts.width;
			initalHeight = selectedOpts.height;

			if (selectedOpts.modal) {
				selectedOpts.overlayShow = true;
				selectedOpts.hideOnOverlayClick = false;
				selectedOpts.hideOnContentClick = false;
				selectedOpts.enableEscapeButton = false;
				selectedOpts.showCloseButton = false;
			}

			selectedOpts.padding = parseInt(selectedOpts.padding, 10);
			selectedOpts.margin = parseInt(selectedOpts.margin, 10);

			tmp.css('padding', (selectedOpts.padding + selectedOpts.margin));

			$('.fancybox-inline-tmp').unbind('fancybox-cancel').bind('fancybox-change', function() {
				$(this).replaceWith(content.children());
			});

			switch (type) {
				case 'html' :
					tmp.html( selectedOpts.content );
					_process_inline();
				break;

				case 'inline' :
					if ( $(obj).parent().is('#fancybox-content') === true) {
						busy = false;
						return;
					}

					$('<div class="fancybox-inline-tmp" />')
						.hide()
						.insertBefore( $(obj) )
						.bind('fancybox-cleanup', function() {
							$(this).replaceWith(content.children());
						}).bind('fancybox-cancel', function() {
							$(this).replaceWith(tmp.children());
						});

					tmp.append($(obj).clone(true));

					_process_inline();
				break;

				case 'image':
					busy = false;

					$.fancybox.showActivity();

					imgPreloader = new Image();

					imgPreloader.onerror = function() {
						_error();
					};

					imgPreloader.onload = function() {
						busy = true;

						imgPreloader.onerror = imgPreloader.onload = null;

						_process_image();
					};

					imgPreloader.src = href;
				break;

				case 'swf':
					selectedOpts.scrolling = 'no';

					str = '<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" width="' + selectedOpts.width + '" height="' + selectedOpts.height + '"><param name="movie" value="' + href + '"></param>';
					emb = '';

					$.each(selectedOpts.swf, function(name, val) {
						str += '<param name="' + name + '" value="' + val + '"></param>';
						emb += ' ' + name + '="' + val + '"';
					});

					str += '<embed src="' + href + '" type="application/x-shockwave-flash" width="' + selectedOpts.width + '" height="' + selectedOpts.height + '"' + emb + '></embed></object>';

					tmp.html(str);

					_process_inline();
				break;

				case 'ajax':
					busy = false;

					$.fancybox.showActivity();

					selectedOpts.ajax.win = selectedOpts.ajax.success;

					ajaxLoader = $.ajax($.extend({}, selectedOpts.ajax, {
						url	: href,
						data : selectedOpts.ajax.data || {},
						error : function(XMLHttpRequest, textStatus, errorThrown) {
							if ( XMLHttpRequest.status > 0 ) {
								_error();
							}
						},
						success : function(data, textStatus, XMLHttpRequest) {
							var o = typeof XMLHttpRequest == 'object' ? XMLHttpRequest : ajaxLoader;
							if (o.status == 200) {
								if ( typeof selectedOpts.ajax.win == 'function' ) {
									ret = selectedOpts.ajax.win(href, data, textStatus, XMLHttpRequest);

									if (ret === false) {
										loading.hide();
										return;
									} else if (typeof ret == 'string' || typeof ret == 'object') {
										data = ret;
									}
								}

								tmp.html( data );
								_process_inline();
							}
						}
					}));

				break;

				case 'iframe':
					_show();
				break;
			}
		},

		__process_inline = function () {
			var
				w = selectedOpts.width,
				h = selectedOpts.height;

			if (w.toString().indexOf('%') > -1) {
				w = parseInt( ($(window).width() - (selectedOpts.margin * 2)) * parseFloat(w) / 100, 10) + 'px';

			} else {
				w = w == 'auto' ? 'auto' : w + 'px';
			}

			if (h.toString().indexOf('%') > -1) {
				h = parseInt( ($(window).height() - (selectedOpts.margin * 2)) * parseFloat(h) / 100, 10) + 'px';

			} else {
				h = h == 'auto' ? 'auto' : h + 'px';
			}

			tmp.wrapInner('<div style="width:' + w + ';height:' + h + ';overflow: ' + (selectedOpts.scrolling == 'auto' ? 'auto' : (selectedOpts.scrolling == 'yes' ? 'scroll' : 'hidden')) + ';position:relative;"></div>');

			selectedOpts.width = tmp.width();
			selectedOpts.height = tmp.height();
		},

		_process_inline = function() {
			__process_inline();
			_show();
		},

		_process_image = function() {
			selectedOpts.width = imgPreloader.width;
			selectedOpts.height = imgPreloader.height;

			$("<img />").attr({
				'id' : 'fancybox-img',
				'src' : imgPreloader.src,
				'alt' : selectedOpts.title
			}).appendTo( tmp );

			_show();
		},

		_update = function () {
			if (wrap.is(':visible')) {
				tmp.empty();

				if (initalAutoDimensions) {
					if (_isReadyType(selectedOpts.type)) {
						selectedOpts.width = 'auto';
						selectedOpts.height = 'auto';
					}
				} else if (selectedOpts.type !== 'image') {
					selectedOpts.width = initalWidth;
					selectedOpts.height = initalHeight;
				}

				if (_isReadyType(selectedOpts.type)) {
					tmp.html(content.children().contents().clone());
					__process_inline();

					if (!initalAutoDimensions) {
						content.children().css({
							width: selectedOpts.width,
							height: selectedOpts.height,
						});
					}
				}

				var pos = outer.position();

				final_pos = _get_zoom_to();

				if (!title.is(':empty')) {
					_title_type_handler(false);
				}

				start_pos = {
					top: pos.top,
					left: pos.left,
					width: outer.width(),
					height: outer.height(),
				};

				var equal = (
					start_pos.width === final_pos.width
					&& start_pos.height === final_pos.height
				);

				var finishUpdating = function() {
					if (initalAutoDimensions) {
						content.css('height', 'auto');
					}

					wrap.css({
						'height': 'auto',
						'position': 'static'
					});

					$.event.trigger('fancybox-onUpdate', [
						currentArray,
						currentIndex,
						currentOpts
					]);

					currentOpts.onUpdate(currentArray, currentIndex, currentOpts);
				};

				if (equal) {
					finishUpdating();
				} else {
					fx.prop = 0;

					$(fx).stop(true, true).animate({prop: 1}, {
						duration : currentOpts.changeSpeed,
						step : _draw,
						complete : finishUpdating,
					});
				}
			}
		},

		_debounce = function (func, wait, immediate) {
			var timeout;

			return function() {
				var context = this;
				var args = arguments;
				var later = function() {
					timeout = null;
					if (!immediate) func.apply(context, args);
				};
				var callNow = immediate && !timeout;

				clearTimeout(timeout);
				timeout = setTimeout(later, wait);
				if (callNow) func.apply(context, args);
			};
		},

		_show = function() {
			var pos, equal;

			if (actionEvent === 'touchstart') {
				$('body').css({
					top: -bodyScrollCache
				});
			};

			loading.hide();

			if (wrap.is(":visible") && false === currentOpts.onCleanup(currentArray, currentIndex, currentOpts)) {
				$.event.trigger('fancybox-cancel');

				busy = false;
				return;
			}

			busy = true;

			$(content.add( overlay )).unbind();

			$(window).unbind("resize.fb scroll.fb orientationchange.fb");
			$(document).unbind('keydown.fb');

			if (wrap.is(":visible") && currentOpts.titlePosition !== 'outside') {
				wrap.css('height', wrap.height());
			}

			currentArray = selectedArray;
			currentIndex = selectedIndex;
			currentOpts = selectedOpts;

			if (currentOpts.overlayShow) {
				var overlayCss = {
					'cursor' : currentOpts.hideOnOverlayClick ? 'pointer' : 'auto',
					'height' : $(window).height()
				};

				if (currentOpts.overlayColor) {
					var colorConverter = $('<div></div>'), overlayColor;

					$('body').append(colorConverter);
					colorConverter.css('background-color', currentOpts.overlayColor);
					overlayColor = colorConverter.css('background-color');
					overlayCss.backgroundColor = overlayColor;
					colorConverter.remove();

					if (currentOpts.overlayOpacity){
						overlayCss.backgroundColor = overlayColor.replace(')', ', 0.75)').replace('rgb', 'rgba');
					};
				};
				overlay.css(overlayCss);

				if (!overlay.is(':visible')) {
					overlay.show();
				}
			} else {
				overlay.hide();
			}

			final_pos = _get_zoom_to();

			_process_title();

			var cbOnBeforeShow = function () {
				$.event.trigger('fancybox-onBeforeShow', [
					currentArray,
					currentIndex,
					currentOpts
				]);

				currentOpts.onBeforeShow(currentArray, currentIndex, currentOpts);
			};

			if (wrap.is(":visible")) {
				$( close.add( nav_left ).add( nav_right ) ).hide();

				pos = wrap.position();

				start_pos = {
					top	 : pos.top,
					left : pos.left,
					width : wrap.width(),
					height : wrap.height()
				};

				equal = (start_pos.width == final_pos.width && start_pos.height == final_pos.height);

				content.fadeTo(currentOpts.changeFade, 0.3, function() {
					var finish_resizing = function() {
						overlay.scrollTop(0);
						content.html( tmp.contents() );

						cbOnBeforeShow();

						content.fadeTo(currentOpts.changeFade, 1, _finish);
					};

					$.event.trigger('fancybox-change');

					content
						.empty()
						.css({
							'padding' : currentOpts.padding,
							'width'	: final_pos.width - currentOpts.padding * 2,
							'height' : selectedOpts.autoDimensions ? 'auto' : final_pos.height - titleHeight - currentOpts.padding * 2
						});

					if (equal) {
						finish_resizing();
					}
					else {
						fx.prop = 0;

						$(fx).animate({prop: 1}, {
							duration : currentOpts.changeSpeed,
							easing : currentOpts.easingChange,
							step : _draw,
							complete : finish_resizing
						});
					}
				});

				return;
			};

			if (currentOpts.type !== 'iframe' && currentOpts.transitionIn !== 'elastic') {
				final_pos.height = 'auto';
			};

			wrap.removeAttr("style");

			content.css('padding', currentOpts.padding);

			if (currentOpts.transitionIn == 'elastic') {
				start_pos = _get_zoom_from();

				content.html( tmp.contents() );

				cbOnBeforeShow();

				overlay.show();
				wrap.css({
					'display': 'inline-block',
					'position': 'absolute'
				});

				if (currentOpts.opacity) {
					final_pos.opacity = 0;
				}

				fx.prop = 0;

				$(fx).animate({prop: 1}, {
					duration : currentOpts.speedIn,
					easing : currentOpts.easingIn,
					step : _draw,
					complete : _finish
				});

				return;
			}

			if (currentOpts.titlePosition == 'inside' && titleHeight > 0) {	
				title.show();
			}

			content
				.css({
					'width' : final_pos.width - currentOpts.padding * 2,
					'height' : selectedOpts.autoDimensions ? 'auto' : final_pos.height - titleHeight - currentOpts.padding * 2
				})
				.html( tmp.contents() );

			cbOnBeforeShow();

			wrap.css(final_pos);

			if (currentOpts.transitionIn !== 'none') {
				wrap.css('display', 'inline-block');
				wrap.css('opacity', 0);
				wrap.animate({'opacity': 1}, currentOpts.speedIn, _finish);
			}
			else {
				_finish();
			};
		},

		_format_title = function(title) {
			if (title && title.length) {
				if (currentOpts.titlePosition == 'float') {
					return '<table id="fancybox-title-float-wrap" cellpadding="0" cellspacing="0"><tr><td id="fancybox-title-float-left"></td><td id="fancybox-title-float-main">' + title + '</td><td id="fancybox-title-float-right"></td></tr></table>';
				}

				return '<div id="fancybox-title-' + currentOpts.titlePosition + '">' + title + '</div>';
			}

			return false;
		},

		_title_type_handler = function (needInsert) {
			needInsert = needInsert || true;

			if (currentOpts.titleShow) {
				switch (currentOpts.titlePosition) {
					case 'inside':
						title.css({
							width: final_pos.width - (currentOpts.padding * 2),
							marginLeft: currentOpts.padding,
							marginRight: currentOpts.padding,
						});

						titleHeight = title.outerHeight(true);

						if (needInsert) {
							title.appendTo( outer );
						}

						final_pos.height += titleHeight;
						break;

					case 'over':
						title.css({
							marginLeft: currentOpts.padding,
							width: final_pos.width - (currentOpts.padding * 2),
							bottom: currentOpts.padding,
						});

						if (needInsert) {
							title.appendTo( outer );
						}
						break;

					case 'float':
						title.css('left', parseInt((title.width() - final_pos.width - 40) / 2, 10) * -1);

						if (needInsert) {
							title.appendTo( wrap );
						}
						break;

					default:
						title.css({
							width: final_pos.width - (currentOpts.padding * 2),
							paddingLeft: currentOpts.padding,
							paddingRight: currentOpts.padding,
						});

						if (needInsert) {
							title.appendTo( wrap );
						}
						break;
				}
			}
		}

		_process_title = function() {
			titleStr = currentOpts.title || '';
			titleHeight = 0;

			title
				.empty()
				.removeAttr('style')
				.removeClass();

			if (currentOpts.titleShow === false) {
				title.hide();
				return;
			}

			titleStr = $.isFunction(currentOpts.titleFormat) ? currentOpts.titleFormat(titleStr, currentArray, currentIndex, currentOpts) : _format_title(titleStr);

			if (!titleStr || titleStr === '') {
				title.hide();
				return;
			}

			title
				.addClass('fancybox-title-' + currentOpts.titlePosition)
				.html( titleStr )
				.appendTo( 'body' )
				.show();

			_title_type_handler();

			title.hide();
		},

		_set_navigation = function() {
			if (currentOpts.enableEscapeButton || currentOpts.enableKeyboardNav) {
				$(document).bind('keydown.fb', function(e) {
					if (e.keyCode == 27 && currentOpts.enableEscapeButton) {
						e.preventDefault();
						$.fancybox.close();

					} else if ((e.keyCode == 37 || e.keyCode == 39) && currentOpts.enableKeyboardNav && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'SELECT') {
						e.preventDefault();
						$.fancybox[ e.keyCode == 37 ? 'prev' : 'next']();
					}
				});
			}

			if (!currentOpts.showNavArrows) { 
				nav_left.hide();
				nav_right.hide();
				return;
			}

			if ((currentOpts.cyclic && currentArray.length > 1) || currentIndex !== 0) {
				nav_left.show();
			}

			if ((currentOpts.cyclic && currentArray.length > 1) || currentIndex != (currentArray.length -1)) {
				nav_right.show();
			}
		},

		_finish = function () {
			if (selectedOpts.autoDimensions) {
				content.css('height', 'auto');
			}

			wrap.css({
				'height': 'auto',
				'position': 'static'
			});

			if (titleStr && titleStr.length) {
				title.show();
			}

			if (currentOpts.showCloseButton) {
				close.show();
			}

			_set_navigation();
	
			if (currentOpts.hideOnContentClick)	{
				content.bind('click.fb', $.fancybox.close);
			}

			if (currentOpts.hideOnOverlayClick)	{
				overlay.bind('click.fb', function (e) {
					if ($(e.target).attr('id') === 'fancybox-overlay') {
						$.fancybox.close();
					};
				});
			}

			if (actionEvent === 'click') {
				$(window).on("resize.fb", _debounce($.fancybox.resize, 500));
			}
			else {
				$(window).on("orientationchange.fb", _debounce($.fancybox.resize, 500));
			};

			if (currentOpts.type == 'iframe') {
				$('<iframe id="fancybox-frame" name="fancybox-frame' + new Date().getTime() + '" frameborder="0" hspace="0" ' + (window.navigator.userAgent.indexOf("MSIE") >= 0 ? 'allowtransparency="true""' : '') + ' scrolling="' + selectedOpts.scrolling + '" src="' + currentOpts.href + '"></iframe>').appendTo(content);
			}

			wrap.css('display', 'inline-block');

			busy = false;

			$.event.trigger('fancybox-onComplete', [
				currentArray,
				currentIndex,
				currentOpts
			]);

			currentOpts.onComplete(currentArray, currentIndex, currentOpts);

			_preload_images();
		},

		_preload_images = function() {
			var href, 
				objNext;

			if ((currentArray.length -1) > currentIndex) {
				href = currentArray[ currentIndex + 1 ].href;

				if (typeof href !== 'undefined' && href.match(imgRegExp)) {
					objNext = new Image();
					objNext.src = href;
				}
			}

			if (currentIndex > 0) {
				href = currentArray[ currentIndex - 1 ].href;

				if (typeof href !== 'undefined' && href.match(imgRegExp)) {
					objNext = new Image();
					objNext.src = href;
				}
			}
		},

		_draw = function(pos) {
			var dim = {
				width : parseInt(start_pos.width + (final_pos.width - start_pos.width) * pos, 10),
				height : parseInt(start_pos.height + (final_pos.height - start_pos.height) * pos, 10),

				top : parseInt(start_pos.top + (final_pos.top - start_pos.top) * pos, 10),
				left : parseInt(start_pos.left + (final_pos.left - start_pos.left) * pos, 10)
			};

			if (typeof final_pos.opacity !== 'undefined') {
				dim.opacity = pos < 0.5 ? 0.5 : pos;
			}

			wrap.css(dim);

			content.css({
				'width' : dim.width - currentOpts.padding * 2,
				'height' : dim.height - (titleHeight * pos) - currentOpts.padding * 2
			});
		},

		_get_viewport = function() {
			return [
				$(window).width() - (currentOpts.margin * 2),
				$(window).height() - (currentOpts.margin * 2),
				$(document).scrollLeft() + currentOpts.margin,
				$(document).scrollTop() + currentOpts.margin
			];
		},

		_get_zoom_to = function () {
			var view = _get_viewport(),
				to = {},
				resize = currentOpts.autoScale,
				double_padding = currentOpts.padding * 2,
				ratio;

			if (currentOpts.width.toString().indexOf('%') > -1) {
				to.width = parseInt((view[0] * parseFloat(currentOpts.width)) / 100, 10);
			} else {
				to.width = currentOpts.width + double_padding;
			}

			if (currentOpts.height.toString().indexOf('%') > -1) {
				to.height = parseInt((view[1] * parseFloat(currentOpts.height)) / 100, 10);
			} else {
				to.height = currentOpts.height + double_padding;
			}

			if (!_isReadyType(currentOpts.type) && resize && (to.width > view[0] || to.height > view[1])) {
				if (selectedOpts.type == 'image' || selectedOpts.type == 'swf') {
					ratio = (currentOpts.width ) / (currentOpts.height );

					if ((to.width ) > view[0]) {
						to.width = view[0];
						to.height = parseInt(((to.width - double_padding) / ratio) + double_padding, 10);
					}

					if ((to.height) > view[1]) {
						to.height = view[1];
						to.width = parseInt(((to.height - double_padding) * ratio) + double_padding, 10);
					}

				} else {
					to.width = Math.min(to.width, view[0]);
					to.height = Math.min(to.height, view[1]);
				}
			}

			if (actionEvent === 'touchstart') {
				to.top = 0;
			}
			else {
				to.top = parseInt(Math.max(view[3], view[3] + ((view[1] - to.height) * 0.5)), 10) - $(window).scrollTop();
			};

			to.left = parseInt(Math.max(view[2], view[2] + ((view[0] - to.width) * 0.5)), 10);

			if ($('html').hasClass('fancybox__shift')) {
				to.left -= SCROLLBAR_WIDTH  / 2;
			};

			return to;
		},

		_get_obj_pos = function(obj) {
			var pos = obj.offset();

			pos.left += parseInt( obj.css('paddingLeft'), 10 ) || 0;
			pos.left += parseInt( obj.css('border-left-width'), 10 ) || 0;

			pos.width = obj.width();
			pos.height = obj.height();

			return pos;
		},

		_get_zoom_from = function() {
			var orig = selectedOpts.orig ? $(selectedOpts.orig) : false,
				from = {},
				pos,
				view;

			if (orig && orig.length) {
				pos = _get_obj_pos(orig);

				from = {
					width : pos.width + (currentOpts.padding * 2),
					height : pos.height + (currentOpts.padding * 2),
					top	: pos.top - currentOpts.padding - $(window).scrollTop(),
					left : pos.left - currentOpts.padding
				};

			} else {
				view = _get_viewport();

				from = {
					width : currentOpts.padding * 2,
					height : currentOpts.padding * 2,
					top	: parseInt(view[3] + view[1] * 0.5, 10),
					left : parseInt(view[2] + view[0] * 0.5, 10)
				};
			}

			return from;
		},

		_animate_loading = function() {
			if (!loading.is(':visible')){
				clearInterval(loadingTimer);
				return;
			}

			$('div', loading).css('top', (loadingFrame * -40) + 'px');

			loadingFrame = (loadingFrame + 1) % 12;
		};

	/*
	 * Public methods 
	 */

	$.fn.fancybox = function(options) {
		if (!$(this).length) {
			return this;
		}

		var obj = $(this);

		$(this)
			.data('fancybox', $.extend({}, options, ($.metadata ? $(this).metadata() : {})))
			.unbind('click.fb')
			.bind('click.fb', function(e) {
				e.preventDefault();

				if (busy) {
					return;
				}

				busy = true;

				$(this).blur();

				selectedArray = [];
				selectedIndex = 0;

				var rel = $(this).attr('rel') || '';

				if (!rel || rel == '' || rel === 'nofollow') {
					selectedArray.push(this);

				} else {
					selectedArray = $("a[rel=" + rel + "], area[rel=" + rel + "]");
					selectedIndex = selectedArray.index( this );
				}

				_start();

				return;
			});

		return this;
	};

	$.fancybox = function(obj) {
		var opts;

		if (busy) {
			return;
		}

		busy = true;
		opts = typeof arguments[1] !== 'undefined' ? arguments[1] : {};

		selectedArray = [];
		selectedIndex = parseInt(opts.index, 10) || 0;

		if ($.isArray(obj)) {
			for (var i = 0, j = obj.length; i < j; i++) {
				if (typeof obj[i] == 'object') {
					$(obj[i]).data('fancybox', $.extend({}, opts, obj[i]));
				} else {
					obj[i] = $({}).data('fancybox', $.extend({content : obj[i]}, opts));
				}
			}

			selectedArray = jQuery.merge(selectedArray, obj);

		} else {
			if (typeof obj == 'object') {
				$(obj).data('fancybox', $.extend({}, opts, obj));
			} else {
				obj = $({}).data('fancybox', $.extend({content : obj}, opts));
			}

			selectedArray.push(obj);
		}

		if (selectedIndex > selectedArray.length || selectedIndex < 0) {
			selectedIndex = 0;
		}

		_start();
	};

	$.fancybox.showActivity = function() {
		clearInterval(loadingTimer);

		loading.show();
		loadingTimer = setInterval(_animate_loading, 66);
	};

	$.fancybox.hideActivity = function() {
		loading.hide();
	};

	$.fancybox.next = function() {
		return $.fancybox.pos( currentIndex + 1);
	};

	$.fancybox.prev = function() {
		return $.fancybox.pos( currentIndex - 1);
	};

	$.fancybox.pos = function(pos) {
		if (busy) {
			return;
		}

		pos = parseInt(pos);

		selectedArray = currentArray;

		if (pos > -1 && pos < currentArray.length) {
			selectedIndex = pos;
			_start();

		} else if (currentOpts.cyclic && currentArray.length > 1) {
			selectedIndex = pos >= currentArray.length ? 0 : currentArray.length - 1;
			_start();
		}

		return;
	};

	$.fancybox.cancel = function() {
		if (busy) {
			return;
		}

		busy = true;

		$.event.trigger('fancybox-cancel');

		_abort();

		$.event.trigger('fancybox-onCancel', [
			selectedArray,
			selectedIndex,
			selectedOpts
		]);

		selectedOpts.onCancel(selectedArray, selectedIndex, selectedOpts);

		busy = false;
	};

	// Note: within an iframe use - parent.$.fancybox.close();
	$.fancybox.close = function() {
		if (busy || wrap.is(':hidden')) {
			return;
		}

		busy = true;

		$.event.trigger('fancybox-onCleanup', [
			currentArray,
			currentIndex,
			currentOpts
		]);

		if (currentOpts && false === currentOpts.onCleanup(currentArray, currentIndex, currentOpts)) {
			busy = false;
			return;
		}

		_abort();

		$(close.add( nav_left ).add( nav_right )).hide();

		$(content.add( overlay )).unbind();

		$(window).unbind("resize.fb scroll.fb orientationchange.fb");
		$(document).unbind('keydown.fb');

		content.find('iframe').attr('src', /^https/i.test(window.location.href || '') ? 'javascript:void(false)' : 'about:blank');

		if (currentOpts.titlePosition !== 'inside') {
			title.empty();
		}

		wrap.stop();

		function _cleanup() {
			overlay.fadeOut('fast');

			title.empty().hide();
			wrap.hide();

			$.event.trigger('fancybox-cleanup');

			content.attr('style', '').empty();

			$.event.trigger('fancybox-onClosed', [
				currentArray,
				currentIndex,
				currentOpts
			]);

			currentOpts.onClosed(currentArray, currentIndex, currentOpts);

			$('html').removeClass('fancybox__shift fancybox__lock fancybox__touch');

			if (actionEvent === 'touchstart') {
				$('body').css({
					top: 0
				});
				$('html, body').scrollTop(bodyScrollCache);
			};

			if (currentOpts.fancyClass) {
				overlay.removeClass(currentOpts.fancyClass);
				wrap.removeClass(currentOpts.fancyClass);
				loading.removeClass(currentOpts.fancyClass);
				tmp.removeClass(currentOpts.fancyClass);
			};

			currentArray = selectedOpts	= [];
			currentIndex = selectedIndex = 0;
			currentOpts = selectedOpts	= {};

			busy = false;
		}

		if (currentOpts.transitionOut == 'elastic') {
			start_pos = _get_zoom_from();

			var pos = wrap.position();

			wrap.css('position', 'absolute');

			final_pos = {
				top	 : pos.top,
				left : pos.left,
				width :	wrap.width(),
				height : wrap.height()
			};

			if (currentOpts.opacity) {
				final_pos.opacity = 1;
			}

			title.empty().hide();

			fx.prop = 1;

			$(fx).animate({ prop: 0 }, {
				duration : currentOpts.speedOut,
				easing : currentOpts.easingOut,
				step : _draw,
				complete : _cleanup
			});

		} else {
			wrap.fadeOut( currentOpts.transitionOut == 'none' ? 0 : currentOpts.speedOut, _cleanup);
		}
	};

	$.fancybox.update = function() {
		_update();
	};

	$.fancybox.resize = function() {
		if (overlay.is(':visible')) {
			overlay.css('height', $(window).height());
		}

		_fitWindowHeight();
		$.fancybox.update();
		_scrollBarCheck();
	};

	$.fancybox.center = function() {
		// центрирование с версии 1.5.0 производится стилями
	};

	$.fancybox.init = function() {
		if ($("#fancybox-wrap").length) {
			return;
		}

		overlay = $('<div id="fancybox-overlay"></div>');

		wrap = $('<div id="fancybox-wrap"></div>')
			.appendTo( overlay );

		outer = $('<div id="fancybox-outer"></div>')
			.appendTo( wrap );

		outer.append(
			content = $('<div id="fancybox-content"></div>'),
			title = $('<div id="fancybox-title"></div>'),

			nav_left = $('<a href="javascript:;" id="fancybox-left"><span class="fancy-ico" id="fancybox-left-ico"></span></a>'),
			nav_right = $('<a href="javascript:;" id="fancybox-right"><span class="fancy-ico" id="fancybox-right-ico"></span></a>')
		);

		close = $('<a id="fancybox-close"></a>').insertBefore(outer);

		$('body').append(
			tmp	= $('<div id="fancybox-tmp"></div>'),
			loading	= $('<div id="fancybox-loading"><div></div></div>'),
			overlay
		);

		close.bind('click.fb', $.fancybox.close);
		loading.bind('click.fb', $.fancybox.cancel);

		nav_left.bind('click.fb', function(e) {
			e.preventDefault();
			$.fancybox.prev();
		});

		nav_right.bind('click.fb', function(e) {
			e.preventDefault();
			$.fancybox.next();
		});

		if ($.fn.mousewheel) {
			wrap.bind('mousewheel.fb', function(e, delta) {
				if (currentArray.length > 1) {
					if (busy) {
						e.preventDefault();

					} else if ($(e.target).get(0).clientHeight == 0 || $(e.target).get(0).scrollHeight === $(e.target).get(0).clientHeight) {
						e.preventDefault();
						$.fancybox[ delta > 0 ? 'prev' : 'next']();
					}
				};
			});
		}
	};


	// работа с полосой прокрутки
	(function(){

		// определение ширины полосы прокрутки
		var obj = document.createElement("div");

		obj.style.cssText = ' \
		width: 100px; \
		height: 100px; \
		overflow: scroll; \
		position: absolute; \
		top: -9999px; \
		visibility: hidden;';

		document.documentElement.appendChild(obj);

		SCROLLBAR_WIDTH = obj.offsetWidth - obj.clientWidth;
		obj.parentNode.removeChild(obj);

		// добавление стиля в шапку
		// http://stackoverflow.com/questions/524696/how-to-create-a-style-tag-with-javascript#answer-524721
		var css = '.fancybox__shift{margin-right: '+ SCROLLBAR_WIDTH +'px !important;}';
		var head = document.head || document.getElementsByTagName('head')[0];
		var style = document.createElement('style');

		style.type = 'text/css';

		if (style.styleSheet){
			style.styleSheet.cssText = css;
		}
		else {
			style.appendChild(document.createTextNode(css));
		};

		head.appendChild(style);
	})();


	// определение наличия полосы прокрутки
	// http://stackoverflow.com/questions/4814398/how-can-i-check-if-a-scrollbar-is-visible
	$.fn.hasScrollBarY = function() {
		return this.get(0) ? this.get(0).offsetHeight > this.get(0).clientHeight : false;
	};

	// ~ работа с полосой прокрутки


	$.fn.fancybox.defaults = {
		padding : 10,
		margin : 40,
		opacity : false,
		modal : false,
		cyclic : false,
		scrolling : 'auto',	// 'auto', 'yes' or 'no'

		fancyClass: '',

		width : 560,
		height : 340,

		autoScale : true,
		autoDimensions : true,

		fitWindowHeight: true,

		// не используется с 1.5.1,
		// центрируется всегда
		centerOnScroll : false,

		ajax : {},
		swf : { wmode: 'transparent' },

		hideOnOverlayClick : true,
		hideOnContentClick : false,

		overlayShow : true,
		overlayOpacity : 0.7,
		overlayColor : '#777',

		titleShow : true,
		titlePosition : 'float', // 'float', 'outside', 'inside' or 'over'
		titleFormat : null,
		titleFromAlt : false,

		transitionIn : 'fade', // 'elastic', 'fade' or 'none'
		transitionOut : 'fade', // 'elastic', 'fade' or 'none'

		speedIn : 300,
		speedOut : 300,

		changeSpeed : 300,
		changeFade : 'fast',

		easingIn : 'swing',
		easingOut : 'swing',

		showCloseButton	 : true,
		showNavArrows : true,
		enableEscapeButton : true,
		enableKeyboardNav : true,

		onStart : function(){},
		onCancel : function(){},
		onBeforeShow : function(){},
		onComplete : function(){},
		onCleanup : function(){},
		onClosed : function(){},
		onError : function(){},
		onUpdate : function(){},
	};


	$(document).ready(function() {
		$.fancybox.init();
	});

})(jQuery);
