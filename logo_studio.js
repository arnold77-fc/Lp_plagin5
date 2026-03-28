(function () {
    'use strict';

    function startPlugin() {
        // 1. Постоянный монитор меню (каждые 300мс проверяем, не открыты ли настройки)
        setInterval(function() {
            var settings_list = $('.settings-list'); // Список внутри настроек
            if (settings_list.length && !settings_list.find('[data-name="studio_logos_custom"]').length) {
                
                // Создаем кнопку
                var item = $('<div class="settings-param selector" data-name="studio_logos_custom" data-type="open">' +
                    '<div class="settings-param__name">⚙️ Настройки логотипов</div>' +
                    '<div class="settings-param__value">Размер, фон, насыщенность</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    openLogoSettings();
                });

                // Вставляем кнопку в САМЫЙ ВЕРХ любого открытого раздела настроек
                settings_list.prepend(item);
                
                // Перерегистрируем контроллер, чтобы пульт видел кнопку
                if (window.Lampa && Lampa.Controller) {
                    Lampa.Controller.add('settings_interface', {
                        toggle: function () {
                            Lampa.Controller.collectionSet(settings_list);
                            Lampa.Controller.collectionFocus(item[0], settings_list);
                        }
                    });
                }
            }
        }, 300);

        // 2. Окно настроек
        function openLogoSettings() {
            Lampa.Settings.create({
                title: 'Настройки логотипов',
                onBack: function () { Lampa.Settings.update(); }
            }, function (files) {
                var config = [
                    { name: 'Размер логотипа', param: 'studio_logo_size', def: '0.7em', list: { '0.5em': 'Мини', '0.7em': 'Норма', '1.1em': 'Средний', '1.4em': 'Макс' } },
                    { name: 'Подложка (фон)', param: 'studio_logo_bg', def: 'true', list: { 'true': 'Да', 'false': 'Нет' } },
                    { name: 'Насыщенность', param: 'studio_logo_saturation', def: '1', list: { '0': 'Ч/Б', '1': 'Цвет', '1.5': 'Ярко' } },
                    { name: 'Количество', param: 'studio_logo_count', def: '3', list: { '1': '1', '3': '3', '5': '5', '10': '10' } }
                ];

                config.forEach(function (opt) {
                    var val = Lampa.Storage.get(opt.param, opt.def);
                    var field = Lampa.Settings.template({ name: opt.name, type: 'select', value: opt.list[val] || val });

                    field.on('hover:enter', function () {
                        Lampa.Select.show({
                            title: opt.name,
                            items: Object.keys(opt.list).map(function(k){ return {title: opt.list[k], value: k} }),
                            onSelect: function (v) {
                                Lampa.Storage.set(opt.param, v.value);
                                field.find('.settings-param__value').text(v.title);
                                Lampa.Settings.update();
                            },
                            onBack: Lampa.Controller.toggle
                        });
                    });
                    files.append(field);
                });
            });
        }

        // 3. Стили логотипов
        var styles = `
            .plugin-uk-title-combined { margin: 10px 0; width: 100%; display: block; }
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 6px; overflow: hidden; cursor: pointer; background: rgba(255,255,255,0.05); }
            .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; outline: 2px solid #fff; }
            .rate--studio.studio-logo img { width: auto; max-width: 180px; }
        `;
        if (!$('#ymod-studio-styles').length) $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

        // 4. Логика в карточке
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
                                : '<span style="font-size:0.8em; padding: 2px 5px;">' + co.name + '</span>';
                            
                            var item = $('<div class="rate--studio studio-logo selector" data-id="' + co.id + '">' + content + '</div>');
                            item.css({
                                'filter': 'saturate(' + saturation + ')',
                                'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
                                'padding': showBg ? '4px 10px' : '0',
                                'margin-right': '6px'
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

    // Старт
    if (window.Lampa) startPlugin();
    else {
        var wait = setInterval(function(){
            if(window.Lampa){ clearInterval(wait); startPlugin(); }
        }, 500);
    }
})();
