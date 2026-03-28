(function () {
    'use strict';

    var L_MOD = 'studio_mod_';

    var styles = `
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            margin: 10px 0;
            gap: 8px;
            width: 100%;
            z-index: 10;
        }
        .rate--studio.studio-logo { 
            display: inline-flex !important; 
            align-items: center; 
            background: rgba(255,255,255,0.1);
            padding: 5px 10px;
            border-radius: 6px;
            cursor: pointer;
        }
        .rate--studio.studio-logo.focus { 
            background: #fff !important; 
            color: #000 !important;
            transform: scale(1.05); 
        }
        .rate--studio.studio-logo img { 
            height: 1em; 
            max-width: 100px; 
            object-fit: contain; 
        }
        .rate--studio.studio-logo.focus img { filter: invert(1); }
        .studio-logo-text { font-weight: bold; font-size: 12px; color: inherit; }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    function renderStudios(e) {
        if (!Lampa.Storage.get(L_MOD + 'enabled', true)) return;
        
        var movie = e.data.movie;
        var render = e.object.activity.render();
        
        // В версии 1.12.4 иногда ID запрятан глубже
        var movie_id = movie.id;
        if (!movie_id) return;

        var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
        
        // Используем прокси или прямой запрос через встроенный метод Lampa
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movie_id + '?api_key=' + Lampa.TMDB.key() + '&language=ru';

        Lampa.Network.silent(url, function(data) {
            if (data && data.production_companies && data.production_companies.length) {
                $('.studio-logos-container').remove();
                
                var container = $('<div class="studio-logos-container"></div>');
                var size = Lampa.Storage.get(L_MOD + 'size', '1em');

                data.production_companies.slice(0, 4).forEach(function(co) {
                    var item = $('<div class="rate--studio studio-logo selector"></div>');
                    
                    if (co.logo_path) {
                        item.append('<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:'+size+'">');
                    } else {
                        item.append('<span class="studio-logo-text">' + co.name + '</span>');
                    }

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

                // Универсальный поиск места вставки для Android v1.12.4
                var target = render.find('.full-start__buttons, .full-start-new__buttons, .full-info__content, .full-start__title').first();
                
                if (target.length) {
                    target.after(container);
                    
                    // Регистрация кнопок для пульта
                    Lampa.Controller.add('full_start', {
                        toggle: function() {
                            Lampa.Controller.collection(render[0]);
                        }
                    });
                    Lampa.Controller.toggle('full_start');
                }
            }
        }, function() {
            console.log('Studio Mod: Network error');
        });
    }

    // Настройки
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'studio_logos',
            name: 'Логотипы студий',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { name: L_MOD + 'enabled', type: 'trigger', default: true },
            field: { name: 'Включить плагин', description: 'Показывать логотипы компаний' }
        });
    }

    // Слушаем событие открытия карточки
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complete') {
            // Увеличиваем задержку для Android, так как карточка рендерится дольше
            setTimeout(function() {
                renderStudios(e);
            }, 300);
        }
    });

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();
