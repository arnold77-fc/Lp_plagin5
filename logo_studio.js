(function () {
    'use strict';

    function startPlugin() {
        // 1. Инициализация настроек
        Lampa.Storage.setDefault('studio_logos_enabled', true);
        Lampa.Storage.setDefault('studio_logos_bg', true);
        Lampa.Storage.setDefault('studio_logos_size', '0.7em');
        Lampa.Storage.setDefault('studio_logos_margin', '0.2em');
        Lampa.Storage.setDefault('studio_logos_saturation', '100%');

        // 2. Регистрация в меню настроек
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'appearance') {
                var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                    '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm0-2a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM10.622 8.415l4.879 3.252a.4.4 0 0 1 0 .666l-4.88 3.252a.4.4 0 0 1-.621-.333V8.748a.4.4 0 0 1 .622-.333z" fill="currentColor"/></svg></div>' +
                    '<div class="settings-folder__name">Логотипы студий</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    Lampa.Component.add('studio_logos_settings', StudioSettings);
                    Lampa.Activity.push({
                        url: '',
                        title: 'Логотипы студий',
                        component: 'studio_logos_settings',
                        page: 1
                    });
                });
                e.body.append(item);
            }
        });

        // 3. Стили
        var styles = `
            .plugin-uk-title-combined { margin-top: 10px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
            .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; height: auto; }
            .rate--studio.studio-logo img { max-width: 200px; width: auto; object-fit: contain; }
            @media screen and (orientation: portrait), screen and (max-width: 767px) {
                .plugin-uk-title-combined { align-items: center !important; }
                .studio-logos-container { justify-content: center !important; }
            }
        `;
        if (!$('#studio-logos-style').length) {
            $('head').append('<style id="studio-logos-style">' + styles + '</style>');
        }

        // 4. Логика отрисовки
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complete' || e.type === 'complite') {
                if (!Lampa.Storage.get('studio_logos_enabled', true)) return;

                var movie = e.data.movie;
                var render = e.object.activity.render();
                var type = (movie.number_of_seasons || movie.first_air_date) ? "tv" : "movie";

                Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                    if (data && data.production_companies) {
                        renderStudios(render, data);
                    }
                });
            }
        });
    }

    function renderStudios(render, movie) {
        $(".plugin-uk-title-combined", render).remove();

        var showBg = Lampa.Storage.get('studio_logos_bg', true);
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm = Lampa.Storage.get('studio_logos_margin', '0.2em');
        var saturation = Lampa.Storage.get('studio_logos_saturation', '100%');

        var html = '';
        movie.production_companies.slice(0, 3).forEach(function (co) {
            var content = co.logo_path
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">'
                : '<span style="font-size:0.8em; font-weight:bold; color:#fff">' + co.name + '</span>';

            html += '<div class="rate--studio studio-logo" style="margin-right:' + gapEm + '">' + content + '</div>';
        });

        if (!html) return;

        var bgCSS = showBg ? 'background: rgba(255,255,255,0.08); padding: 5px 12px;' : 'background: transparent; padding: 5px 0;';
        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');

        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).css('cssText', bgCSS + ' filter: saturate(' + saturation + ');');
        $('.rate--studio img', render).css('cssText', 'height: ' + sizeEm + ' !important;');
    }

    // Компонент настроек (внутренний)
    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({ mask: true, over: true });
        var items = [
            { title: 'Увімкнути плагін', name: 'studio_logos_enabled', type: 'switch', default: true },
            { title: 'Підложка', name: 'studio_logos_bg', type: 'switch', default: true },
            { title: 'Розмір лого', name: 'studio_logos_size', type: 'select', values: { '0.5em': '0.5em', '0.7em': '0.7em', '0.9em': '0.9em' }, default: '0.7em' },
            { title: 'Відступ', name: 'studio_logos_margin', type: 'select', values: { '0.1em': '0.1em', '0.2em': '0.2em', '0.4em': '0.4em' }, default: '0.2em' },
            { title: 'Насиченість', name: 'studio_logos_saturation', type: 'select', values: { '0%': '0%', '50%': '50%', '100%': '100%' }, default: '100%' }
        ];

        this.create = function () {
            var _this = this;
            items.forEach(function (item) {
                var value = Lampa.Storage.get(item.name, item.default);
                var field = Lampa.Template.get('settings_field', item);
                
                field.find('.settings-param__value').text(item.type === 'switch' ? (value ? 'Да' : 'Нет') : value);
                field.on('hover:enter', function () {
                    if (item.type === 'switch') {
                        value = !value;
                        Lampa.Storage.set(item.name, value);
                        field.find('.settings-param__value').text(value ? 'Да' : 'Нет');
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(k => ({ title: item.values[k], value: k })),
                            onSelect: function (sel) {
                                Lampa.Storage.set(item.name, sel.value);
                                field.find('.settings-param__value').text(sel.value);
                            }
                        });
                    }
                });
                scroll.append(field);
            });
            return scroll.render();
        };
        this.render = function () { return this.create(); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { scroll.destroy(); };
    }

    // Запуск плагина после готовности Lampa
    if (window.appready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
