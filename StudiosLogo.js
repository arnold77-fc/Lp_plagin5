(function () {
    'use strict';

    function startPlugin() {
        var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30';

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complete') return;

            var render = e.object.activity.render();
            var infoBlock = render.find('.full-start__details');

            if (infoBlock.length) {
                // 1. Очистка старого
                render.find('.studio-logos-container').remove();

                // 2. Сборка данных
                var companies = e.data.movie.production_companies || [];
                if (companies.length === 0) return;

                var cont = $('<div class="studio-logos-container"></div>');
                
                companies.forEach(function (co) {
                    var item;
                    if (co.logo_path) {
                        item = $('<div class="selector studio-logo-badge" data-id="' + co.id + '" data-name="' + co.name + '"><img src="' + TMDB_IMAGE_URL + co.logo_path + '"></div>');
                    } else {
                        item = $('<div class="selector studio-logo-badge text-badge" data-id="' + co.id + '" data-name="' + co.name + '"><span>' + co.name + '</span></div>');
                    }

                    // 3. Обработка клика/ОК на пульте
                    item.on('hover:enter', function () {
                        Lampa.Activity.push({
                            url: 'company/' + $(this).data('id'),
                            title: 'Студия: ' + $(this).data('name'),
                            component: 'category_full',
                            source: 'tmdb',
                            card_type: 0,
                            page: 1
                        });
                    });

                    cont.append(item);
                });

                infoBlock.append(cont);

                // --- КРИТИЧЕСКИЙ МОМЕНТ ДЛЯ ANDROID ---
                // Сообщаем контроллеру карточки, что появились новые элементы .selector
                e.object.activity.loader.toggle(false); // На всякий случай скрываем лоадер
                
                // Если в Lampa открыта карточка, обновляем навигацию
                if (Lampa.Controller.enabled().name === 'full_start') {
                    Lampa.Controller.add('full_start', {
                        toggle: function () {},
                        up: function () {},
                        down: function () {},
                        right: function () {},
                        left: function () {},
                        gone: function () {}
                    });
                }
            }
        });

        // Стили
        if (!$('#studio-style').length) {
            $('body').append('<style id="studio-style">\
                .studio-logos-container { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 15px; }\
                .studio-logo-badge { background: rgba(255,255,255,0.08); padding: 5px 10px; border-radius: 6px; cursor: pointer; }\
                .studio-logo-badge.focus { background: #fff; transform: scale(1.1); }\
                .studio-logo-badge img { height: 1.2em; filter: brightness(0) invert(1); display: block; }\
                .studio-logo-badge.focus img { filter: none; }\
                .studio-logo-badge.text-badge span { font-size: 1.1rem; color: #fff; font-weight: bold; }\
                .studio-logo-badge.focus span { color: #000; }\
            </style>');
        }
    }

    // Запуск
    if (window.Lampa) {
        startPlugin();
    } else {
        Lampa.Events.on('app:ready', startPlugin);
    }
})();
