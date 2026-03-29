(function () {
    'use strict';

    function StartPlugin() {
        // 1. Стили
        var style = '.plugin-studio { margin: 10px 0; display: flex; flex-wrap: wrap; }\n' +
            '.studio-item { display: inline-flex; align-items: center; background: rgba(255,255,255,0.1); border-radius: 6px; margin-right: 8px; padding: 4px 10px; cursor: pointer; }\n' +
            '.studio-item.focus { background: #fff !important; color: #000 !important; }\n' +
            '.studio-item img { height: 0.7em; }';

        if (!$('#studio-style').length) $('head').append('<style id="studio-style">' + style + '</style>');

        // 2. Добавляем пункт в официальное меню настроек Lampa
        Lampa.Settings.add({
            title: 'Логотипы студий',
            type: 'select',
            name: 'studio_logos_enabled',
            value: 'true',
            values: {
                'true': 'Включено',
                'false': 'Выключено'
            },
            full: true // Появится в общем списке настроек
        });

        // 3. Логика отрисовки
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complete') {
                var render = e.object.activity.render();
                var movie = e.data.movie;
                
                if (Lampa.Storage.get('studio_logos_enabled') === 'false') return;

                // Запрашиваем детали из TMDB
                var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
                Lampa.Api.sources.tmdb.get(type + '/' + movie.id, {}, function (data) {
                    if (data.production_companies && data.production_companies.length) {
                        $('.plugin-studio', render).remove();
                        
                        var container = $('<div class="plugin-studio"></div>');
                        
                        data.production_companies.slice(0, 4).forEach(function (co) {
                            var item = $('<div class="studio-item selector">' + (co.logo_path ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '">' : '<span>' + co.name + '</span>') + '</div>');
                            
                            item.on('hover:enter', function () {
                                Lampa.Activity.push({
                                    url: 'company/' + co.id,
                                    title: co.name,
                                    component: 'category_full',
                                    source: 'tmdb',
                                    card_type: 0
                                });
                            });
                            container.append(item);
                        });

                        var title = render.find('.full-start__title, .full-start-new__title');
                        if (title.length) title.after(container);
                        
                        // Заставляем Lampa увидеть новые кнопки ("селекторы")
                        Lampa.Controller.enable('full');
                    }
                });
            }
        });
    }

    // Запуск с задержкой, чтобы Lampa успела загрузить свои функции
    var waitLampa = setInterval(function() {
        if (typeof Lampa !== 'undefined' && Lampa.Settings) {
            clearInterval(waitLampa);
            StartPlugin();
        }
    }, 500);
})();
