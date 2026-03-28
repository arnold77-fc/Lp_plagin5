(function () {
    'use strict';

    function startPlugin() {
        // 1. Добавляем пункт в настройки интерфейса
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') {
                var item = $('<div class="settings-param selector" data-name="studio_logos_settings" data-type="open">' +
                    '<div class="settings-param__name">Настройки логотипов</div>' +
                    '<div class="settings-param__value">Размер, фон и насыщенность</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    var options = [
                        {
                            name: 'Размер логотипа',
                            type: 'select',
                            list: {
                                '0.5em': 'Очень маленький',
                                '0.7em': 'Стандартный',
                                '1em': 'Средний',
                                '1.3em': 'Большой'
                            },
                            value: Lampa.Storage.get('studio_logo_size', '0.7em'),
                            onSelect: function (v) {
                                Lampa.Storage.set('studio_logo_size', v);
                            }
                        },
                        {
                            name: 'Подложка (фон)',
                            type: 'select',
                            list: {
                                'true': 'Включена',
                                'false': 'Выключена'
                            },
                            value: Lampa.Storage.get('studio_logo_bg', 'true'),
                            onSelect: function (v) {
                                Lampa.Storage.set('studio_logo_bg', v);
                            }
                        },
                        {
                            name: 'Насыщенность',
                            type: 'select',
                            list: {
                                '0': 'Чёрно-белый',
                                '0.5': 'Приглушенный',
                                '1': 'Оригинал',
                                '1.5': 'Яркий'
                            },
                            value: Lampa.Storage.get('studio_logo_saturation', '1'),
                            onSelect: function (v) {
                                Lampa.Storage.set('studio_logo_saturation', v);
                            }
                        }
                    ];

                    Lampa.Settings.create({
                        title: 'Настройки логотипов',
                        onBack: function () {
                            Lampa.Settings.update();
                        }
                    }, function (files) {
                        options.forEach(function(opt) {
                            files.append(Lampa.Settings.template(opt));
                        });
                    });
                });

                // Безопасная вставка в меню
                var container = e.body.find('.settings-list');
                if (container.length) container.append(item);
                else e.body.append(item);
                
                // Обновляем навигацию пульта
                Lampa.Controller.add('settings_interface', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(e.body);
                        Lampa.Controller.collectionFocus(item[0], e.body);
                    }
                });
            }
        });

        // 2. Стили (адаптировано под Android WebView)
        var styles = `
            .plugin-uk-title-combined { margin-top: 8px; margin-bottom: 8px; width: 100%; display: block; clear: both; }
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 6px; overflow: hidden; cursor: pointer; }
            .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.25) !important; outline: 2px solid #fff; }
            .rate--studio.studio-logo img { width: auto; max-width: 150px; }
        `;
        if (!$('#ymod-studio-styles').length) {
            $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');
        }

        // 3. Логика работы с карточкой
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var render = e.object.activity.render();
                var type = (movie.number_of_seasons || movie.first_air_date) ? "tv" : "movie";
                
                Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                    if (data && data.production_companies && data.production_companies.length) {
                        renderStudios(render, data.production_companies);
                    }
                }, function(){
                    console.log('Studio Plugin: TMDB Error');
                });
            }
        });

        function renderStudios(render, companies) {
            $(".plugin-uk-title-combined", render).remove();
            
            var showBg = Lampa.Storage.get('studio_logo_bg', 'true') === 'true';
            var sizeEm = Lampa.Storage.get('studio_logo_size', '0.7em');
            var saturation = Lampa.Storage.get('studio_logo_saturation', '1');

            var html = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container"></div></div>');
            
            companies.slice(0, 3).forEach(function (co) {
                if (!co.logo_path && !co.name) return;

                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">' 
                    : '<span style="font-size:0.8em; padding: 2px 5px;">' + co.name + '</span>';
                
                var item = $('<div class="rate--studio studio-logo selector" data-id="' + co.id + '">' + content + '</div>');
                
                item.css({
                    'filter': 'saturate(' + saturation + ')',
                    'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
                    'padding': showBg ? '4px 10px' : '0'
                });
                item.find('img').css('height', sizeEm);

                item.on('hover:enter', function() {
                    Lampa.Activity.push({ 
                        url: '', 
                        id: co.id, 
                        title: co.name, 
                        component: 'company', 
                        source: 'tmdb', 
                        page: 1 
                    });
                });

                html.find('.studio-logos-container').append(item);
            });

            // Вставка после заголовка (стандарт для Lampa)
            var target = render.find('.full-start-new__title, .full-start__title');
            if(target.length) target.after(html);
        }
    }

    // Ожидание инициализации Lampa
    var wait = setInterval(function(){
        if(typeof Lampa !== 'undefined' && Lampa.Settings){
            clearInterval(wait);
            try {
                startPlugin();
            } catch(e) {
                console.log('Studio Plugin Error:', e);
            }
        }
    }, 200);
})();
