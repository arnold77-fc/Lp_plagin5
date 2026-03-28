(function () {
    'use strict';

    var L_MOD = 'studio_mod_';

    // Стили
    var styles = `
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            margin: 15px 0;
            gap: 12px;
            width: 100%;
            clear: both;
        }
        .rate--studio.studio-logo { 
            display: inline-flex !important; 
            align-items: center; 
            justify-content: center;
            border-radius: 8px; 
            background: rgba(255,255,255,0.1);
            padding: 6px 12px;
            cursor: pointer;
            border: 2px solid transparent;
        }
        .rate--studio.studio-logo.focus { 
            background: #fff !important; 
            border-color: #ffde1a;
            transform: scale(1.1); 
        }
        .rate--studio.studio-logo img { 
            max-width: 120px; 
            object-fit: contain; 
        }
        .rate--studio.studio-logo.focus img { filter: invert(1); }
        .studio-logo-text { font-weight: bold; color: #fff; font-size: 14px; }
        .rate--studio.studio-logo.focus .studio-logo-text { color: #000; }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    function renderStudios(e) {
        if (!Lampa.Storage.get(L_MOD + 'enabled', true)) return;
        
        var movie = e.data.movie;
        var render = e.object.activity.render();
        
        // Проверка на наличие ID и ключа TMDB
        if (!movie.id || !Lampa.TMDB.key()) {
            console.log('Studio Mod: No ID or TMDB Key');
            return;
        }

        var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&language=ru';

        $.ajax({
            url: url,
            method: 'GET',
            success: function(data) {
                if (data && data.production_companies && data.production_companies.length) {
                    $('.studio-logos-container').remove(); // Чистим старые, если были
                    
                    var container = $('<div class="studio-logos-container"></div>');
                    var size = Lampa.Storage.get(L_MOD + 'size', '0.8em');

                    data.production_companies.slice(0, 5).forEach(function(co) {
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

                    // Пробуем разные варианты вставки в зависимости от версии интерфейса
                    var placeholders = [
                        render.find('.full-start__buttons'),
                        render.find('.full-start-new__buttons'),
                        render.find('.full-start__details'),
                        render.find('.full-start__title')
                    ];

                    var placed = false;
                    for (var i = 0; i < placeholders.length; i++) {
                        if (placeholders[i].length) {
                            placeholders[i].before(container);
                            placed = true;
                            break;
                        }
                    }
                    
                    // Если вставили, обновляем контроллер навигации
                    if (placed) {
                        Lampa.Controller.add('full_start', {
                            toggle: function() {
                                Lampa.Controller.collection(render[0]);
                            }
                        });
                        // Принудительно обновляем текущую навигацию
                        Lampa.Controller.toggle('full_start');
                    }
                }
            },
            error: function(e) {
                console.log('Studio Mod Error:', e);
            }
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

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { 
                name: L_MOD + 'size', 
                type: 'select', 
                values: { '0.6em': 'Мелкий', '0.9em': 'Средний', '1.2em': 'Крупный' }, 
                default: '0.9em' 
            },
            field: { name: 'Размер логотипов' }
        });
    }

    // Слушатель событий
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complete') {
            // Ждем отрисовки DOM
            setTimeout(function() {
                renderStudios(e);
            }, 200);
        }
    });

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();

