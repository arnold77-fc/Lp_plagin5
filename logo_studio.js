(function () {
    'use strict';

    var L_MOD = 'studio_mod_';

    // Стили с повышенными приоритетами !important
    var styles = `
        .studio-logos-container { 
            display: flex !important; 
            align-items: center !important; 
            flex-wrap: wrap !important; 
            margin: 15px 0 !important;
            gap: 10px !important;
            width: 100% !important;
            position: relative !important;
        }
        .rate--studio.studio-logo { 
            display: inline-flex !important; 
            background: rgba(255,255,255,0.1) !important;
            padding: 8px 12px !important;
            border-radius: 10px !important;
        }
        .rate--studio.studio-logo.focus { 
            background: #fff !important; 
            color: #000 !important;
        }
        .rate--studio.studio-logo img { 
            height: 25px !important;
            object-fit: contain !important; 
        }
        .rate--studio.studio-logo.focus img { filter: invert(1) !important; }
        .studio-logo-text { font-size: 14px !important; color: inherit !important; font-weight: bold; }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    function render(e) {
        var movie = e.data.movie;
        var activity = e.object.activity;
        var render = activity.render();
        
        // 1. Проверка ID
        var id = movie.id;
        if (!id) return;

        // 2. Формируем URL (используем прокси, если он есть в Лампе)
        var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
        var api_key = Lampa.TMDB.key();
        var url = 'https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + api_key + '&language=ru';

        // 3. Запрос через нативный метод Lampa (обходим CORS на Android)
        Lampa.Network.native(url, function(data) {
            if (data && data.production_companies && data.production_companies.length) {
                
                // Удаляем старые контейнеры, если они есть
                render.find('.studio-logos-container').remove();

                var container = $('<div class="studio-logos-container"></div>');

                data.production_companies.slice(0, 4).forEach(function(co) {
                    var item = $('<div class="rate--studio studio-logo selector"></div>');
                    
                    if (co.logo_path) {
                        item.append('<img src="https://image.tmdb.org/t/p/w300' + co.logo_path + '">');
                    } else {
                        item.append('<span class="studio-logo-text">' + co.name + '</span>');
                    }

                    // Клик
                    item.on('hover:enter', function() {
                        Lampa.Activity.push({
                            url: '', 
                            title: co.name, 
                            component: 'category_full', 
                            id: co.id,
                            source: 'tmdb', 
                            card_type: 'company',
                            page: 1
                        });
                    });

                    container.append(item);
                });

                // 4. Поиск места вставки (пробуем все варианты)
                var target = render.find('.full-start__buttons, .full-start-new__buttons, .full-start__details, .full-info__content').first();
                
                if (target.length) {
                    target.before(container);
                    
                    // 5. Перезапуск контроллера для Android
                    Lampa.Controller.add('full_start', {
                        toggle: function() {
                            Lampa.Controller.collection(render[0]);
                        }
                    });
                    Lampa.Controller.toggle('full_start');
                }
            }
        }, function() {
            // Ошибка сети
        });
    }

    // Слушатель
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complete') {
            // На Android 1.12.4 нужно подождать чуть дольше
            setTimeout(function() {
                render(e);
            }, 500);
        }
    });

    // Регистрация настроек
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'studio_logos_mod',
            name: 'Логотипы студий',
            icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" fill="white"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM17.99 9l-3.14-4.21-1.32 1.77L15.41 9l-3.88 5.19-1.75-2.1L7.11 15.5l10.88 0z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos_mod',
            param: { name: L_MOD + 'enabled', type: 'trigger', default: true },
            field: { name: 'Включить', description: 'Показывать логотипы компаний' }
        });
    }

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();
