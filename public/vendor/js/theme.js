var opts = {
  lines: 13 // The number of lines to draw
  , length: 28 // The length of each line
  , width: 14 // The line thickness
  , radius: 42 // The radius of the inner circle
  , scale: 1 // Scales overall size of the spinner
  , corners: 1 // Corner roundness (0..1)
  , color: '#000' // #rgb or #rrggbb or array of colors
  , opacity: 0.25 // Opacity of the lines
  , rotate: 0 // The rotation offset
  , direction: 1 // 1: clockwise, -1: counterclockwise
  , speed: 1 // Rounds per second
  , trail: 60 // Afterglow percentage
  , fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
  , zIndex: 2e9 // The z-index (defaults to 2000000000)
  , className: 'spinner' // The CSS class to assign to the spinner
  , top: '50%' // Top position relative to parent
  , left: '50%' // Left position relative to parent
  , shadow: false // Whether to render a shadow
  , hwaccel: false // Whether to use hardware acceleration
  , position: 'absolute' // Element positioning
}
var target = document.getElementById('loader')
var spinner = new Spinner(opts).spin(target);

(function($){

    $.extend($.easing, {
        easeInOutCubic : function(x, t, b, c, d){
            if ((t/=d/2) < 1) return c/2*t*t*t + b;
            return c/2*((t-=2)*t*t + 2) + b;
        }
    });

    $.fn.outerFind = function(selector){
        return this.find(selector).addBack(selector);
    };

    (function($,sr){
        // debouncing function from John Hann
        // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
        var debounce = function (func, threshold, execAsap) {
            var timeout;

            return function debounced () {
                var obj = this, args = arguments;
                function delayed () {
                    if (!execAsap) func.apply(obj, args);
                    timeout = null;
                };

                if (timeout) clearTimeout(timeout);
                else if (execAsap) func.apply(obj, args);

                timeout = setTimeout(delayed, threshold || 100);
            };
        }
        // smartresize
        jQuery.fn[sr] = function(fn){  return fn ? this.bind('resize', debounce(fn)) : this.trigger(sr); };

    })(jQuery,'smartresize');

    (function(){

        var scrollbarWidth = 0, originalMargin, touchHandler = function(event){
            event.preventDefault();
        };

        function getScrollbarWidth(){
            if (scrollbarWidth) return scrollbarWidth;
            var scrollDiv = document.createElement('div');
            $.each({
                top : '-9999px',
                width  : '50px',
                height : '50px',
                overflow : 'scroll',
                position : 'absolute'
            }, function(property, value){
                scrollDiv.style[property] = value;
            });
            $('body').append(scrollDiv);
            scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
            $('body')[0].removeChild(scrollDiv);
            return scrollbarWidth;
        }

    })();

    $.isMobile = function(type){
        var reg = [];
        var any = {
            blackberry : 'BlackBerry',
            android : 'Android',
            windows : 'IEMobile',
            opera : 'Opera Mini',
            ios : 'iPhone|iPad|iPod'
        };
        type = 'undefined' == $.type(type) ? '*' : type.toLowerCase();
        if ('*' == type) reg = $.map(any, function(v){ return v; });
        else if (type in any) reg.push(any[type]);
        return !!(reg.length && navigator.userAgent.match(new RegExp(reg.join('|'), 'i')));
    };

    var isSupportViewportUnits = (function(){
        // modernizr implementation
        var $elem = $('<div style="height: 50vh; position: absolute; top: -1000px; left: -1000px;">').appendTo('body');
        var elem = $elem[0];
        var height = parseInt(window.innerHeight / 2, 10);
        var compStyle = parseInt((window.getComputedStyle ? getComputedStyle(elem, null) : elem.currentStyle)['height'], 10);
        $elem.remove();
        return compStyle == height;
    }());

    $(function(){

        $('html').addClass($.isMobile() ? 'mobile' : 'desktop');

        // .hc-navbar--sticky
        $(window).scroll(function(){
            $('.hc-navbar--sticky').each(function(){
                var method = $(window).scrollTop() > 10 ? 'addClass' : 'removeClass';
                $(this)[method]('hc-navbar--stuck')
                    .not('.hc-navbar--open')[method]('hc-navbar--short');
            });
        });

        if ($.isMobile() && navigator.userAgent.match(/Chrome/i)){ // simple fix for Chrome's scrolling
            (function(width, height){
                var deviceSize = [width, width];
                deviceSize[height > width ? 0 : 1] = height;
                $(window).smartresize(function(){
                    var windowHeight = $(window).height();
                    if ($.inArray(windowHeight, deviceSize) < 0)
                        windowHeight = deviceSize[ $(window).width() > windowHeight ? 1 : 0 ];
                    $('.hc-section--full-height').css('height', windowHeight + 'px');
                });
            })($(window).width(), $(window).height());
        } else if (!isSupportViewportUnits){ // fallback for .hc-section--full-height
            $(window).smartresize(function(){
                $('.hc-section--full-height').css('height', $(window).height() + 'px');
            });
            $(document).on('add.cards', function(event){
                if ($('html').hasClass('hc-site-loaded') && $(event.target).outerFind('.hc-section--full-height').length)
                    $(window).resize();
            });
        }

        // .hc-section--16by9 (16 by 9 blocks autoheight)
        function calculate16by9(){
            $(this).css('height', $(this).parent().width() * 9 / 16);
        }
        $(window).smartresize(function(){
            $('.hc-section--16by9').each(calculate16by9);
        });
        $(document).on('add.cards change.cards', function(event){
            var enabled = $(event.target).outerFind('.hc-section--16by9');
            if (enabled.length){
                enabled
                    .attr('data-16by9', 'true')
                    .each(calculate16by9);
            } else {
                $(event.target).outerFind('[data-16by9]')
                    .css('height', '')
                    .removeAttr('data-16by9');
            }
        });


        // .hc-parallax-background
        if ($.fn.jarallax && !$.isMobile()) {
            $(document).on('destroy.parallax', function(event) {
                $(event.target).outerFind('.hc-parallax-background')
                    .jarallax('destroy')
                    .css('position', '');
            });
            $(document).on('add.cards change.cards', function(event) {
                $(event.target).outerFind('.hc-parallax-background')
                    .jarallax({
                        speed: 0.6
                    })
                    .css('position', 'relative');
            });

            if ($('html').hasClass('is-builder')) {
                $(document).on('add.cards', function(event) {
                    setTimeout(function() {
                        $(window).trigger('update.parallax');
                    }, 0);
                });
            }

            $(window).on('update.parallax', function(event) {
                var $jarallax = $('.hc-parallax-background');

                $jarallax.jarallax('coverImage');
                $jarallax.jarallax('clipContainer');
                $jarallax.jarallax('onScroll');
            });
        }

        // .hc-social-likes
        if ($.fn.socialLikes){
            $(document).on('add.cards', function(event){
                $(event.target).outerFind('.hc-social-likes:not(.hc-added)').on('counter.social-likes', function(event, service, counter){
                    if (counter > 999) $('.social-likes__counter', event.target).html(Math.floor(counter / 1000) + 'k');
                }).socialLikes({initHtml : false});
            });
        }

        // .hc-fixed-top
        var fixedTopTimeout, scrollTimeout, prevScrollTop = 0, fixedTop = null, isDesktop = !$.isMobile();
        $(window).scroll(function(){
            if (scrollTimeout) clearTimeout(scrollTimeout);
            var scrollTop = $(window).scrollTop();
            var scrollUp  = scrollTop <= prevScrollTop || isDesktop;
            prevScrollTop = scrollTop;
            if (fixedTop){
                var fixed = scrollTop > fixedTop.breakPoint;
                if (scrollUp){
                    if (fixed != fixedTop.fixed){
                        if (isDesktop){
                            fixedTop.fixed = fixed;
                            $(fixedTop.elm).toggleClass('is-fixed');
                        } else {
                            scrollTimeout = setTimeout(function(){
                                fixedTop.fixed = fixed;
                                $(fixedTop.elm).toggleClass('is-fixed');
                            }, 40);
                        }
                    }
                } else {
                    fixedTop.fixed = false;
                    $(fixedTop.elm).removeClass('is-fixed');
                }
            }
        });
        $(document).on('add.cards delete.cards', function(event){
            if (fixedTopTimeout) clearTimeout(fixedTopTimeout);
            fixedTopTimeout = setTimeout(function(){
                if (fixedTop){
                    fixedTop.fixed = false;
                    $(fixedTop.elm).removeClass('is-fixed');
                }
                $('.hc-fixed-top:first').each(function(){
                    fixedTop = {
                        breakPoint : $(this).offset().top + $(this).height() * 3,
                        fixed : false,
                        elm : this
                    };
                    $(window).scroll();
                });
            }, 650);
        });

        // embedded videos
        $(window).smartresize(function(){
            $('.hc-embedded-video').each(function(){
                $(this).height(
                    $(this).width() *
                    parseInt($(this).attr('height') || 315) /
                    parseInt($(this).attr('width') || 560)
                );
            });
        });
        $(document).on('add.cards', function(event){
            if ($('html').hasClass('hc-site-loaded') && $(event.target).outerFind('iframe').length)
                $(window).resize();
        });

        $(document).on('add.cards', function(event){
            $(event.target).outerFind('[data-bg-video]').each(function(){
                var result, videoURL = $(this).data('bg-video'), patterns = [
                    /\?v=([^&]+)/,
                    /(?:embed|\.be)\/([-a-z0-9_]+)/i,
                    /^([-a-z0-9_]+)$/i
                ];
                for (var i = 0; i < patterns.length; i++){
                    if (result = patterns[i].exec(videoURL)){
                        var previewURL = 'http' + ('https:' == location.protocol ? 's' : '') + ':';
                        previewURL += '//img.youtube.com/vi/' + result[1] + '/maxresdefault.jpg';

                        var $img = $('<div class="hc-background-video-preview">')
                            .hide()
                            .css({
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            })
                        $('> *:eq(0)', this).before($img);

                        $('<img>').on('load', function() {
                            if (120 == (this.naturalWidth || this.width)) {
                                // selection of preview in the best quality
                                var file = this.src.split('/').pop();
                                switch (file){
                                    case 'maxresdefault.jpg':
                                        this.src = this.src.replace(file, 'sddefault.jpg');
                                        break;
                                    case 'sddefault.jpg':
                                        this.src = this.src.replace(file, 'hqdefault.jpg');
                                        break;
                                }
                            } else {
                                $img.css('background-image', 'url("' + this.src + '")')
                                    .show();
                            }
                        }).attr('src', previewURL)

                        if ($.fn.YTPlayer && !$.isMobile()){
                            var params = eval('(' + ($(this).data('bg-video-params') || '{}') + ')');
                            $('> *:eq(1)', this).before('<div class="hc-background-video"></div>').prev()
                                .YTPlayer($.extend({
                                    videoURL : result[1],
                                    containment : 'self',
                                    showControls : false,
                                    mute : true
                                }, params));
                        }
                        break;
                    }
                }
            });
        });

        // init
        $('body > *:not(style, script)').trigger('add.cards');
        $('html').addClass('hc-site-loaded');
        $(window).resize().scroll();

        // smooth scroll
        if (!$('html').hasClass('is-builder')){
            $(document).click(function(e){
                try {
                    var target = e.target;

                    if ($(target).parents().hasClass('extTestimonials1')) {
                        return;
                    }
                    do {
                        if (target.hash){
                                var useBody = /#bottom|#top/g.test(target.hash);
                            $(useBody ? 'body' : target.hash).each(function(){
                                e.preventDefault();
                                // in css sticky navbar has height 64px
                                var stickyMenuHeight = $('.hc-navbar--sticky').length ? 64 : 0;
                                var goTo = target.hash == '#bottom'
                                        ? ($(this).height() - $(window).height())
                                        : ($(this).offset().top - stickyMenuHeight);
                                //Disable Accordion's and Tab's scroll
                                if($(this).hasClass('panel-collapse') || $(this).hasClass('tab-pane')){return};
                                $('html, body').stop().animate({
                                    scrollTop: goTo
                                }, 800, 'easeInOutCubic');
                            });
                            break;
                        }
                    } while (target = target.parentNode);
                } catch (e) {
                   // throw e;
                }
            });
        }

        // init the same height columns
        $('.cols-same-height .hc-figure').each(function() {
            var $imageCont = $(this)
            var $img = $imageCont.children('img')
            var $cont = $imageCont.parent()
            var imgW = $img[0].width
            var imgH = $img[0].height

            function setNewSize() {
                $img.css({
                    width: '',
                    maxWidth: '',
                    marginLeft: ''
                })

                if(imgH && imgW) {
                    var aspectRatio = imgH / imgW

                    $imageCont.addClass({
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0
                    })

                    // change image size
                    var contAspectRatio = $cont.height() / $cont.width()
                    if(contAspectRatio > aspectRatio) {
                        var percent = 100 * (contAspectRatio - aspectRatio) / aspectRatio;
                        $img.css({
                            width: percent + 100 + '%',
                            maxWidth: percent + 100 + '%',
                            marginLeft: (- percent / 2) + '%'
                        })
                    }
                }
            }

            $img.one('load', function() {
                imgW = $img[0].width
                imgH = $img[0].height
                setNewSize()
            })

            $(window).on('resize', setNewSize)
            setNewSize()
        })

    });


    if (!$('html').hasClass('is-builder')) {
        $(document).ready(function() {
            //disable animation on scroll on mobiles
            if ($.isMobile()) {
                return;
              //enable animation on scroll
            } else if ($('input[name=animation]').length) {
                $('input[name=animation]').remove();

                var $animatedElements = $('p, h1, h2, h3, h4, h5, a, button, small, img, li, blockquote, .hc-author-name, em, label, input, textarea, .input-group, .iconbox, .btn-social, .hc-figure, .hc-map, .hc-testimonial .card-block, .hc-price-value, .hc-price-figure, .dataTable, .dataTables_info').not(function() {
                    return $(this).parents().is('.navbar, .hc-arrow, footer, .iconbox, .hc-slider, .hc-gallery, .hc-testimonial .card-block, #cookiesdirective, .hc-wowslider, .accordion, .tab-content, .engine, .extFooter1, #scrollToTop');
                }).addClass('hidden animated');

                function getElementOffset(element) {
                    var top = 0
                    do {
                        top += element.offsetTop  || 0;
                        element = element.offsetParent;
                    } while(element);

                    return top;
                };

                function checkIfInView() {
                    var window_height = window.innerHeight;
                    var window_top_position = document.documentElement.scrollTop || document.body.scrollTop;
                    var window_bottom_position = window_top_position + window_height - 50;

                    $.each($animatedElements, function() {
                        var $element = $(this);
                        var element = $element[0];
                        var element_height = element.offsetHeight;
                        var element_top_position = getElementOffset(element);
                        var element_bottom_position = (element_top_position + element_height);

                        // check to see if this current element is within viewport
                        if ((element_bottom_position >= window_top_position) &&
                            (element_top_position <= window_bottom_position) &&
                            ($element.hasClass('hidden'))) {
                            $element.removeClass('hidden').addClass('fadeInUp')
                            .one('webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
                                $element.removeClass('animated fadeInUp');
                            });
                        }
                    });
                }

                var $window = $(window);

                $window.on('scroll resize', checkIfInView);
                $window.trigger('scroll');
            }
        });

        if ($('.navbar').length) {
            $(".nav-dropdown").swipe({
                swipeLeft:function(event, direction, distance, duration, fingerCount) {
                    $('.navbar-close').click();
                }
            });
        }
    }
    $("#carouselTicker").carouselTicker();
    // Scroll to Top Button
    $(document).ready(function() {

    if ($('.hc-arrow-up').length) {
        var $scroller = $('#scrollToTop'),
            $main = $('body,html'),
            $window = $(window);
        $scroller.css('display', 'none');
        $window.scroll(function () {
        if ($(this).scrollTop() > 0) {
            $scroller.fadeIn();
        } else {
            $scroller.fadeOut();
        }
        });
        $scroller.click(function() {
            $main.animate({
                scrollTop: 0
            }, 400);
            return false;
        });
    }
    });

    // Fix menu for Opera Mini and Android Browsers < 4.4v
    if(navigator.userAgent.match(/(Opera Mini)|(534\.30)|(534\.13)|(530\.17)|(533\.1)/i )){
        if($('nav.navbar').length){
            var color = $('nav.navbar .nav-link').css('color') || '#c8c8c8';
            $('.navbar-toggler .hamburger-icon').remove();
            $('.navbar-toggler:eq(0)').addClass('collapsed').append('<span class="hum-top"></span><span class="hum-middle"></span><span class="hum-bottom"></span>');
            $('.navbar-toggler span').not('.close-icon').css('background-color', color);
        }
    }



})(jQuery);
