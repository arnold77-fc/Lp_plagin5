(function () {
    'use strict';

    function startPlugin() {
        var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30';

        // Функция вставки
        function injectLogos(data, container) {
            if (container.find('.studio-logos-container').length) return; // Чтобы не дублировать

            var companies = data.movie.production_companies || [];
            if (!companies.length) return;

            var html = $('<div class="studio-logos-container"></div>');
            
            companies.forEach(function (co) {
                var item;
                if (co.logo_path) {
                    item = $('<div class="selector studio-logo-badge" data-id="' + co.id + '" data-name="' + co.name + '"><img src="' + TMDB_IMAGE_URL + co.logo_path + '"></div>');
                } else {
                    item = $('<div class="selector studio-logo-badge text-badge" data-id="' + co.id + '" data-name="' + co.name + '"><span>' + co.name + '</span></div>');
                }

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
                html.append(item);
            });

            // Вставляем В НАЧАЛО блока с кнопками или после инфо
            container.append(html);
        }

        Lampa.Listener.follow('full', function (e) {
            if (e.type !== 'complete') return;

            // Ждем появления любого базового контейнера карточки
            var timer = setInterval(function(){
                var render = e.object.activity.render();
                // Ищем или блок кнопок, или блок деталей
                var target = render.find('.full-start__buttons, .full-start__details').first();
                
                if (target.length) {
                    clearInterval(timer);
                    injectLogos(e.data, target.parent());
                }
            }, 100);

            // Ограничим поиск 5 секундами, чтобы не вешать систему
            setTimeout(function(){ clearInterval(timer); }, 5000);
        });

        // Стили (в Android версии важен z-index)
        if (!$('#studio-style').length) {
            $('body').append('<style id="studio-style">\
                .studio-logos-container { display: flex; flex-wrap: wrap; gap: 8px; margin: 15px 0; position: relative; z-index: 10; }\
                .studio-logo-badge { background: rgba(255,255,255,0.1); padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; }\
                .studio-logo-badge.focus { background: #fff; outline: none; transform: scale(1.1); }\
                .studio-logo-badge img { height: 1.2em; filter: brightness(0) invert(1); }\
                .studio-logo-badge.focus img { filter: none; }\
                .studio-logo-badge.text-badge span { font-size: 1.1rem; color: #fff; }\
                .studio-logo-badge.focus span { color: #000; font-weight: bold; }\
            </style>');
        }
    }

    // Запуск через стандартный механизм Lampa
    if (window.Lampa) {
        startPlugin();
    } else {
        Lampa.Events.on('app:ready', startPlugin);
    }
})();
