(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // Стили только для большого постера (не трогаем карточки Apple TV)
    var style = `
    <style>
        .ni-poster-container {
            position: relative;
            width: 100%;
            height: 45vh; /* Высота под большой постер */
            overflow: hidden;
            display: flex;
            align-items: flex-end;
            padding: 20px 60px;
            background: #000;
        }
        .ni-poster-bg {
            position: absolute;
            top: 0; left: 0; width: 100%; height: 100%;
            background-size: cover;
            background-position: center;
            transition: background-image 0.5s ease;
            mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
        }
        .ni-poster-info {
            position: relative;
            z-index: 2;
            color: #fff;
            max-width: 600px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.8);
        }
        .ni-poster-title {
            font-size: 3.5rem;
            font-weight: bold;
            margin-bottom: 10px;
            line-height: 1.1;
        }
        .ni-poster-desc {
            font-size: 1.2rem;
            line-height: 1.4;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            opacity: 0.9;
        }
        /* Убираем лишние отступы, которые могут двигать интерфейс Apple TV */
        .full-cards-grid { margin-top: 0 !important; }
    </style>`;

    function init() {
        $('body').append(style);

        var container = $('<div class="ni-poster-container"><div class="ni-poster-bg"></div><div class="ni-poster-info"><div class="ni-poster-title"></div><div class="ni-poster-desc"></div></div></div>');
        
        // Следим за фокусом на карточках
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                // Пытаемся вставить постер над основным контентом
                var activity = Lampa.Activity.active();
                if (activity && activity.component === 'main') {
                    if (!$('.ni-poster-container').length) {
                        $('.content__body').prepend(container);
                    }
                }
            }
        });

        // Главный хак: слушаем смену фокуса в Lampa
        Lampa.Focus.listener.follow('change', function (e) {
            if (e && e.data && e.data.backdrop_path) {
                var data = e.data;
                $('.ni-poster-bg').css('background-image', 'url(' + Lampa.Api.img(data.backdrop_path, 'w1280') + ')');
                $('.ni-poster-title').text(data.title || data.name);
                $('.ni-poster-desc').text(data.overview || '');
            }
        });
    }

    // Запуск после прогрузки Lampa
    if (window.appready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
