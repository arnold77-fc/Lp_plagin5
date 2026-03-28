(function () {
    'use strict';

    function startPlugin() {
        // 1. Функция принудительной вставки пункта в меню
        function injectSettings() {
            // Проверяем, открыто ли меню настроек и конкретно раздел интерфейса
            var body = $('.settings--opened');
            var list = body.find('.settings-list');
            
            // Если мы внутри настроек интерфейса и нашего пункта еще нет
            if (list.length && !list.find('[data-name="studio_logos_settings"]').length) {
                // Проверяем, что это именно раздел "Интерфейс" (по наличию характерных пунктов)
                if (list.find('[data-name="interface_size"], [data-name="title_style"]').length) {
                    
                    var item = $('<div class="settings-param selector" data-name="studio_logos_settings" data-type="open">' +
                        '<div class="settings-param__name">Настройки логотипов</div>' +
                        '<div class="settings-param__value">Изменить размер, фон и насыщенность</div>' +
                        '</div>');

                    item.on('hover:enter', function () {
                        openLogoSettings();
                    });

                    // Вставляем в начало списка
                    list.prepend(item);
                    
                    // Обновляем контроллер, чтобы навигация пульта подхватила новый элемент
                    if (window.Lampa && Lampa.Controller) {
                        Lampa.Controller.add('settings_interface', {
                            toggle: function () {
                                Lampa.Controller.collectionSet(list);
                                Lampa.Controller.collectionFocus(item[0], list);
                            }
                        });
                    }
                }
            }
        }

        // Запускаем постоянную проверку (раз в 500мс), когда открыты настройки
        setInterval(injectSettings, 500);

        // 2. Функция открытия окна настроек
        function openLogoSettings() {
            Lampa.Settings.create({
                title: 'Настройки логотипов',
                onBack: function () {
                    Lampa.Settings.update();
                }
            }, function (files) {
                var items = [
                    { name: 'Размер логотипа', param: 'studio_logo_size', default: '0.7em', list: { '0.5em': 'Очень маленький', '0.7em': 'Стандартный', '1em': 'Средний', '1.3em': 'Большой' } },
                    { name: 'Подложка (фон)', param: 'studio_logo_bg', default: 'true', list: { 'true': 'Включена', 'false': 'Выключена' } },
                    { name: 'Насыщенность', param: 'studio_logo_saturation', default: '1', list: { '0': 'Чёрно-белый', '0.5': 'Приглушенный', '1': 'Оригинал', '1.5': 'Яркий' } },
                    { name: 'Количество', param: 'studio_logo_count', default: '3', list: { '1': '1 шт.', '3': '3 шт.', '5': '5 шт.', '10': '10 шт.' } }
                ];

                items.forEach(function (opt) {
                    var current = Lampa.Storage.get(opt.param, opt.default);
                    var field = Lampa.Settings.template({ name: opt.name, type: 'select', value: opt.list[current] || current });

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
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 6px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.05); }
            .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.25) !important; outline: 2px solid #fff; }
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
                                'padding': showBg ? '5px 10px' : '0',
                                'margin-right': '5px'
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

    // Запуск
    if (window.Lampa) startPlugin();
    else {
        var wait = setInterval(function(){
            if(window.Lampa){ clearInterval(wait); startPlugin(); }
        }, 500);
    }
})();
