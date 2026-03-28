(function () {
    'use strict';

    function startPlugin() {
        console.log('Studio Logos: Plugin Started');

        var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30';

        function getStudioLogos(movie) {
            var html = '';
            var companies = movie.production_companies || [];
            
            if (companies.length) {
                companies.forEach(function (co) {
                    if (co.logo_path) {
                        html += '<div class="selector studio-logo-badge" data-id="' + co.id + '" data-name="' + co.name + '">' +
                                    '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" alt="' + co.name + '">' +
                                '</div>';
                    } else {
                        html += '<div class="selector studio-logo-badge text-badge" data-id="' + co.id + '" data-name="' + co.name + '">' +
                                    '<span>' + co.name + '</span>' +
                                '</div>';
                    }
                });
            }
            return html;
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complete') return;

            // Находим основной блок описания фильма
            var render = e.object.activity.render();
            var infoBlock = render.find('.full-start__details');

            if (infoBlock.length) {
                // Удаляем старый контейнер, если он был (при переключении серий/фильмов)
                render.find('.studio-logos-container').remove();

                var cont = $('<div class="studio-logos-container"></div>');
                cont.html(getStudioLogos(e.data.movie));
                
                // Добавляем ПЕРЕД описанием или после основной инфы
                infoBlock.append(cont);

                // Обработка клика
                cont.find('.selector').on('hover:enter', function () {
                    var id = $(this).data('id');
                    var name = $(this).data('name');
                    if (id) {
                        Lampa.Activity.push({
                            url: 'company/' + id,
                            title: 'Студия: ' + name,
                            component: 'category_full',
                            source: 'tmdb',
                            card_type: 0,
                            page: 1
                        });
                    }
                });
            }
        });

        // Стили адаптированные под Android TV
        var style = '<style>\
            .studio-logos-container { \
                display: flex; \
                flex-wrap: wrap; \
                gap: 10px; \
                margin-top: 15px; \
                margin-bottom: 10px; \
                width: 100%; \
            }\
            .studio-logo-badge { \
                background: rgba(255, 255, 255, 0.08); \
                padding: 6px 12px; \
                border-radius: 6px; \
                display: flex; \
                align-items: center; \
                justify-content: center; \
                border: 2px solid transparent; \
            }\
            .studio-logo-badge.focus { \
                background: #fff; \
                border-color: #fff; \
                transform: scale(1.05); \
            }\
            .studio-logo-badge img { \
                height: 1.4em; \
                filter: brightness(0) invert(1); \
            }\
            .studio-logo-badge.focus img { \
                filter: none; \
            }\
            .studio-logo-badge.text-badge span { \
                font-size: 1.3rem; \
                color: #fff; \
                font-weight: bold; \
            }\
            .studio-logo-badge.focus span { \
                color: #000; \
            }\
        </style>';
        
        if (!$('style#studio-logos-style').length) {
            $('body').append('<div id="studio-logos-style">' + style + '</div>');
        }
    }

    // Запуск с проверкой готовности
    if (window.Lampa) {
        startPlugin();
    } else {
        Lampa.Events.on('app:ready', startPlugin);
    }
})();
