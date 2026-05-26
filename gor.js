(function () {
    'use strict';

    function initDynamicCleanPoster() {
        if (window.dynamicCleanPosterLoaded) return;
        window.dynamicCleanPosterLoaded = true;

        // 1. Создаем HTML для нашего чистого постера
        var posterHTML = `
            <div id="dynamic-clean-poster">
                <img class="dcp-image" src="" alt="">
                <div class="dcp-mask"></div>
            </div>
        `;
        $('body').prepend(posterHTML);

        // 2. Добавляем стили
        var css = `
            /* Стили для самого постера */
            #dynamic-clean-poster {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 55vh; /* Высота постера */
                z-index: 0;   /* Находится позади интерфейса Apple TV и карточек */
                pointer-events: none;
            }
            .dcp-image {
                width: 100%;
                height: 100%;
                object-fit: cover;
                object-position: center 20%;
                opacity: 0;
                transition: opacity 0.6s ease-in-out; /* Плавная смена */
            }
            /* Градиент снизу, чтобы постер плавно уходил в цвет фона */
            .dcp-mask {
                position: absolute;
                inset: 0;
                background: linear-gradient(to top, #141414 0%, rgba(20,20,20,0.4) 20%, transparent 100%);
            }

            /* 3. Скрываем стандартный текст, но ТОЛЬКО в лентах, не ломая страницу фильма */
            body:not(.is-movie-page) .full-start > *,
            body:not(.is-movie-page) .full-start-new > * {
                display: none !important;
            }
            
            /* Оставляем блок как невидимую "распорку", чтобы карточки были внизу */
            body:not(.is-movie-page) .full-start,
            body:not(.is-movie-page) .full-start-new {
                height: 55vh !important;
                background: transparent !important;
            }
        `;
        var style = document.createElement('style');
        style.innerHTML = css;
        document.head.appendChild(style);

        // 3. Отслеживаем, открыта ли страница самого фильма, чтобы не скрывать там текст
        Lampa.Listener.follow('activity', function (e) {
            if (e.type === 'start' || e.type === 'activity') {
                var comp = e.object && e.object.component;
                if (comp === 'full') {
                    $('body').addClass('is-movie-page');
                    $('#dynamic-clean-poster').hide(); // Прячем наш постер на странице фильма
                } else {
                    $('body').removeClass('is-movie-page');
                    $('#dynamic-clean-poster').show();
                }
            }
        });

        // 4. Логика смены картинок при перемещении по карточкам
        var lastImage = '';
        Lampa.Listener.follow('target', function (e) {
            // Если мы не на странице фильма и фокус на карточке
            if (!$('body').hasClass('is-movie-page') && e.type === 'set' && e.target && e.target.data) {
                var data = e.target.data;
                var img = data.backdrop_path ? Lampa.TMDB.image('t/p/original' + data.backdrop_path) : '';
                
                // Если картинка есть и она новая
                if (img && img !== lastImage) {
                    lastImage = img;
                    var $imgElement = $('.dcp-image');
                    
                    // Затухание старой картинки
                    $imgElement.css('opacity', 0); 
                    
                    // Предзагрузка и показ новой
                    var temp = new Image();
                    temp.onload = function () {
                        $imgElement.attr('src', img).css('opacity', 1);
                    };
                    temp.src = img;
                }
            }
        });

        console.log('✅ Dynamic Clean Poster Plugin успешно загружен!');
    }

    // Запуск после инициализации Lampa
    if (window.appready) {
        initDynamicCleanPoster();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initDynamicCleanPoster();
        });
    }
})();
