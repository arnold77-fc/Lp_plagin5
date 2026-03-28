(function () {
    'use strict';

    var L_MOD = 'studio_mod_';

    var styles = `
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            margin: 15px 0;
            gap: 12px;
            width: 100%;
            position: relative;
            z-index: 10;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            justify-content: center;
            border-radius: 8px; 
            transition: all 0.2s ease; 
            cursor: pointer;
            background: rgba(255,255,255,0.08);
            padding: 6px 14px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .rate--studio.studio-logo.focus { 
            background: #fff !important; 
            transform: scale(1.1); 
            border-color: #fff;
        }
        .rate--studio.studio-logo.focus img {
            filter: brightness(0); /* Черный лого на белом фоне при фокусе */
        }
        .rate--studio.studio-logo.focus .studio-logo-text {
            color: #000;
        }
        .rate--studio.studio-logo img { 
            max-width: 140px; 
            object-fit: contain; 
            display: block;
        }
        .studio-logo-text { 
            font-weight: bold; 
            color: #fff; 
            font-size: 14px;
            text-transform: uppercase;
        }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    function renderStudios(e) {
        if (!Lampa.Storage.get(L_MOD + 'enabled', true)) return;

        var movie = e.data.movie;
        var render = e.object.activity.render();
        // Определяем тип контента для корректного запроса к TMDB
        var type = (movie.number_of_seasons || movie.first_air_date || e.object.method === 'tv') ? 'tv' : 'movie';
        
        var size = Lampa.Storage.get(L_MOD + 'size', '0.8em');

        var url = 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&language=ru-RU';

        $.getJSON(url, function(data) {
            if (data && data.production_companies && data.production_companies.length) {
                var container = $('<div class="studio-logos-container"></div>');
                
                data.production_companies.slice(0, 4).forEach(function(co) {
                    var item = $('<div class="rate--studio studio-logo selector"></div>');
                    
                    if (co.logo_path) {
                        item.append('<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:'+size+'">');
                    } else {
                        item.append('<span class="studio-logo-text">' + co.name + '</span>');
                    }

                    // --- ГЛАВНОЕ: ПЕРЕХОД ПО КЛИКУ ---
                    item.on('hover:enter', function() {
                        Lampa.Activity.push({
                            url: '', 
                            title: 'Студия: ' + co.name, 
                            component: 'category_full', 
                            id: co.id,
                            source: 'tmdb', 
                            card_type: 'company',
                            page: 1
                        });
                    });

                    container.append(item);
                });

                // Вставляем перед кнопками или после заголовка
                var target = render.find('.full-start__buttons, .full-start-new__buttons, .full-start__details').first();
                if (target.length) target.before(container);
                else render.find('.full-start__title').after(container);
                
                // Обновляем контроллер, чтобы "увидеть" новые кнопки
                Lampa.Controller.add('full_start', {
                    toggle: function() {
                        Lampa.Controller.collection(render[0]);
                    },
                    right: function() { Lampa.Controller.move('right'); },
                    left: function() { Lampa.Controller.move('left'); },
                    down: function() { Lampa.Controller.move('down'); },
                    up: function() { Lampa.Controller.move('up'); }
                });
            }
        });
    }

    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'studio_logos',
            name: 'Логотипы студий',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 17V7l5 5-5 5z"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { name: L_MOD + 'enabled', type: 'trigger', default: true },
            field: { name: 'Включить плагин', description: 'Показывать студии в карточке' }
        });
        
        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { 
                name: L_MOD + 'size', 
                type: 'select', 
                values: { '0.6em': 'Мелкий', '0.8em': 'Средний', '1.1em': 'Крупный' }, 
                default: '0.8em' 
            },
            field: { name: 'Размер', description: 'Высота логотипа' }
        });
    }

    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complete') {
            setTimeout(function() {
                renderStudios(e);
            }, 100);
        }
    });

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();
