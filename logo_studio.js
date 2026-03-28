(function () {
    'use strict';

    function startPlugin() {
        // 1. Прямая регистрация в ГЛАВНОМ списке настроек
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'main') { // Если открыто главное меню настроек
                var item = $('<div class="settings-folder selector" data-name="studio_logos_settings">' +
                    '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2l-5.5 9h11L12 2zm0 3.84L13.93 9h-3.87L12 5.84zM17.5 13c-2.49 0-4.5 2.01-4.5 4.5s2.01 4.5 4.5 4.5 4.5-2.01 4.5-4.5-2.01-4.5-4.5-4.5zm0 7c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5zM3 21.5h8v-8H3v8zm2-6h4v4H5v-4z" fill="white"/></svg></div>' +
                    '<div class="settings-folder__name">Настройки логотипов</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    openLogoSettings();
                });

                // Вставляем сразу после пункта "Интерфейс" или в начало
                var interface_btn = e.body.find('[data-name="interface"]');
                if (interface_btn.length) interface_btn.after(item);
                else e.body.find('.settings-list').prepend(item);
                
                Lampa.Controller.add('settings_main', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(e.body);
                        Lampa.Controller.collectionFocus(item[0], e.body);
                    }
                });
            }
        });

        // 2. Функция отрисовки окна настроек
        function openLogoSettings() {
            Lampa.Settings.create({
                title: 'Настройки логотипов',
                onBack: function () {
                    Lampa.Settings.update();
                }
            }, function (files) {
                var items = [
                    { name: 'Размер логотипа', param: 'studio_logo_size', default: '0.7em', list: { '0.5em': 'Очень маленький', '0.7em': 'Стандартный', '1.1em': 'Средний', '1.4em': 'Большой' } },
                    { name: 'Подложка (фон)', param: 'studio_logo_bg', default: 'true', list: { 'true': 'Включена', 'false': 'Выключена' } },
                    { name: 'Насыщенность', param: 'studio_logo_saturation', default: '1', list: { '0': 'Чёрно-белый', '0.5': 'Приглушенный', '1': 'Оригинал', '1.5': 'Яркий' } },
                    { name: 'Количество логотипов', param: 'studio_logo_count', default: '3', list: { '1': '1 шт.', '3': '3 шт.', '5': '5 шт.', '10': '10 шт.' } }
                ];

                items.forEach(function (opt) {
                    var current = Lampa.Storage.get(opt.param, opt.default);
                    var field = Lampa.Settings.template({
                        name: opt.name,
                        type: 'select',
                        value: opt.list[current] || current
                    });

                    field.on('hover:enter', function () {
                        Lampa.Select.show({
                            title: opt.name,
                            items: Object.keys(opt.list).map(function(k){ return {title: opt.list[k], value: k} }),
                            onSelect: function (v) {
                                Lampa.Storage.set(opt.param, v.value);
                                field.find('.settings-param__value').text(v.title);
                                Lampa.Settings.update();
                                Lampa.Controller.toggle();
                            },
                            onBack: Lampa.Controller.toggle
                        });
                    });
                    files.append(field);
                });
            });
        }

        // 3. Стили
        var styles = `
            .plugin-uk-title-combined { margin: 10px 0; width: 100%; display: block; }
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; overflow: hidden; cursor: pointer; }
            .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.3) !important; outline: 2px solid #fff; transform: scale(1.05); }
            .rate--studio.studio-logo img { width: auto; max-width: 180px; }
        `;
        if (!$('#ymod-studio-styles').length) $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

        // 4. Отрисовка в карточке
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var render = e.object.activity.render();
                var type = (movie.number_of_seasons || movie.first_air_date) ? "tv" : "movie";
                
                Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                    if (data && data.production_companies && data.production_companies.length) {
                        render.find(".plugin-uk-title-combined").remove();
                        
                        var count = parseInt(Lampa.Storage.get('studio_logo_count', '3'));
                        var showBg = Lampa.Storage.get('studio_logo_bg', 'true') === 'true';
                        var sizeEm = Lampa.Storage.get('studio_logo_size', '0.7em');
                        var saturation = Lampa.Storage.get('studio_logo_saturation', '1');

                        var html = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container"></div></div>');
                        
                        data.production_companies.slice(0, count).forEach(function (co) {
                            var content = co.logo_path 
                                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">' 
                                : '<span style="font-size:0.8em; font-weight:bold; padding: 2px 5px;">' + co.name + '</span>';
                            
                            var item = $('<div class="rate--studio studio-logo selector" data-id="' + co.id + '">' + content + '</div>');
                            item.css({
                                'filter': 'saturate(' + saturation + ')',
                                'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
                                'padding': showBg ? '5px 12px' : '0',
                                'margin-right': '8px'
                            });
                            item.find('img').css('height', sizeEm);

                            item.on('hover:enter', function() {
                                Lampa.Activity.push({ url: '', id: co.id, title: co.name, component: 'company', source: 'tmdb', page: 1 });
                            });

                            html.find('.studio-logos-container').append(item);
                        });

                        var target = render.find('.full-start-new__title, .full-start__title');
                        if (target.length) target.after(html);
                    }
                });
            }
        });
    }

    if (window.Lampa) startPlugin();
    else {
        var wait = setInterval(function(){
            if(window.Lampa && Lampa.Settings){ clearInterval(wait); startPlugin(); }
        }, 300);
    }
})();
