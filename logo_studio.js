(function () {
    'use strict';

    function startPlugin() {
        // Проверка инициализации хранилища
        if (!Lampa.Storage.get('studio_logos_enabled')) Lampa.Storage.set('studio_logos_enabled', true);
        if (!Lampa.Storage.get('studio_logos_bg')) Lampa.Storage.set('studio_logos_bg', true);
        if (!Lampa.Storage.get('studio_logos_size')) Lampa.Storage.set('studio_logos_size', '0.7em');
        if (!Lampa.Storage.get('studio_logos_margin')) Lampa.Storage.set('studio_logos_margin', '0.2em');
        if (!Lampa.Storage.get('studio_logos_saturation')) Lampa.Storage.set('studio_logos_saturation', '100%');

        // Добавляем стили
        var style = `
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; margin-top: 10px; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 6px; margin-bottom: 5px; }
            .rate--studio.studio-logo img { max-width: 180px; width: auto; object-fit: contain; }
            .settings-param-custom { padding: 10px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; }
            .settings-param-custom:hover { background: rgba(255,255,255,0.1); }
            .settings-param-custom__value { color: #2196f3; font-weight: bold; }
        `;
        $('head').append('<style id="studio-style">' + style + '</style>');

        // Регистрация в настройках (Интерфейс)
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'interface' || e.name === 'appearance') {
                var btn = $('<div class="settings-folder selector"><div class="settings-folder__name">Логотипы студий (Настройки)</div></div>');
                btn.on('hover:enter', function () {
                    Lampa.Component.add('studio_settings_comp', StudioSettingsComp);
                    Lampa.Activity.push({
                        title: 'Настройки логотипов',
                        component: 'studio_settings_comp'
                    });
                });
                e.body.append(btn);
            }
        });

        // Слушатель карточки фильма
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complete' || e.type === 'complite') {
                if (Lampa.Storage.get('studio_logos_enabled') === false) return;
                
                var movie = e.data.movie;
                var render = e.object.activity.render();
                var type = (movie.number_of_seasons || movie.first_air_date) ? "tv" : "movie";

                Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                    if (data && data.production_companies) {
                        drawLogos(render, data.production_companies);
                    }
                });
            }
        });
    }

    function drawLogos(render, companies) {
        $(".studio-logos-container", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_bg');
        var size = Lampa.Storage.get('studio_logos_size');
        var margin = Lampa.Storage.get('studio_logos_margin');
        var sat = Lampa.Storage.get('studio_logos_saturation');

        var html = $('<div class="studio-logos-container"></div>');
        
        companies.slice(0, 3).forEach(function(co) {
            var item = $('<div class="rate--studio studio-logo"></div>');
            if (co.logo_path) {
                var img = $('<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">');
                img.css('height', size);
                item.append(img);
            } else {
                item.append('<span style="font-size:0.7em; color:#fff">' + co.name + '</span>');
            }
            
            item.css({
                'margin-right': margin,
                'filter': 'saturate(' + sat + ')',
                'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
                'padding': showBg ? '4px 8px' : '2px 0'
            });
            html.append(item);
        });

        var target = render.find(".full-start-new__title, .full-start__title");
        target.after(html);
    }

    // Кастомный компонент настроек без использования шаблонов Лампы
    function StudioSettingsComp(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        
        this.create = function () {
            var _this = this;
            var menu = [
                { title: 'Включить плагин', name: 'studio_logos_enabled', type: 'bool' },
                { title: 'Подложка (фон)', name: 'studio_logos_bg', type: 'bool' },
                { title: 'Размер (em)', name: 'studio_logos_size', type: 'list', values: ['0.5em', '0.7em', '0.9em', '1.1em'] },
                { title: 'Насыщенность', name: 'studio_logos_saturation', type: 'list', values: ['0%', '50%', '100%'] }
            ];

            menu.forEach(function(item) {
                var val = Lampa.Storage.get(item.name);
                var row = $('<div class="settings-param-custom selector">' +
                                '<div class="settings-param-custom__name">' + item.title + '</div>' +
                                '<div class="settings-param-custom__value">' + (item.type === 'bool' ? (val ? 'Да' : 'Нет') : val) + '</div>' +
                            '</div>');

                row.on('hover:enter', function() {
                    if (item.type === 'bool') {
                        val = !val;
                        Lampa.Storage.set(item.name, val);
                        row.find('.settings-param-custom__value').text(val ? 'Да' : 'Нет');
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: item.values.map(v => ({title: v, value: v})),
                            onSelect: function(res) {
                                Lampa.Storage.set(item.name, res.value);
                                row.find('.settings-param-custom__value').text(res.value);
                            }
                        });
                    }
                });
                scroll.append(row);
            });
            return scroll.render();
        };

        this.render = function () { return this.create(); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { scroll.destroy(); };
    }

    // Безопасный запуск
    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
