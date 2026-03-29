(function () {
    'use strict';

    // 1. Создаем объект настроек в памяти Lampa
    Lampa.Storage.setDefault('studio_logos_enabled', 'true');
    Lampa.Storage.setDefault('studio_logos_bg', 'true');
    Lampa.Storage.setDefault('studio_logos_size', '0.7em');
    Lampa.Storage.setDefault('studio_logos_margin', '0.2em');
    Lampa.Storage.setDefault('studio_logos_sat', '1');

    // 2. Описание компонента настроек
    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            { title: 'Увімкнути плагін', name: 'studio_logos_enabled', subtitle: 'Відображати логотипи студій', values: {'true': 'Да', 'false': 'Нет'} },
            { title: 'Підложка', name: 'studio_logos_bg', subtitle: 'Напівпрозорий фон за логотипом', values: {'true': 'Да', 'false': 'Нет'} },
            { title: 'Розмір лого', name: 'studio_logos_size', subtitle: 'Висота іконок', values: {'0.5em': '0.5em', '0.7em': '0.7em (Стандарт)', '1.0em': '1.0em'} },
            { title: 'Відступ між лого', name: 'studio_logos_margin', values: {'0.1em': '0.1em', '0.2em': '0.2em', '0.5em': '0.5em'} },
            { title: 'Насиченість', name: 'studio_logos_sat', values: {'0': 'ЧБ', '1': '100%', '1.5': 'Ярко'} }
        ];

        this.create = function () {
            var body = $('<div class="settings-list"></div>');
            items.forEach(function (item) {
                var val = Lampa.Storage.get(item.name);
                var html = $(`<div class="settings-item selector">
                    <div class="settings-item__name">${item.title}</div>
                    <div class="settings-item__value">${item.values[val] || val}</div>
                    ${item.subtitle ? `<div class="settings-item__descr">${item.subtitle}</div>` : ''}
                </div>`);

                html.on('hover:enter', function () {
                    Lampa.Select.show({
                        title: item.title,
                        items: Object.keys(item.values).map(k => ({ title: item.values[k], value: k })),
                        onSelect: function (a) {
                            Lampa.Storage.set(item.name, a.value);
                            html.find('.settings-item__value').text(a.title);
                        }
                    });
                });
                body.append(html);
            });
            return scroll.render().append(body);
        };
        this.active = function () { scroll.active(); };
        this.render = function () { return this.create(); };
        this.destroy = function () { scroll.destroy(); };
    }

    // 3. Регистрация компонента в системе
    Lampa.Component.add('studio_logos_comp', StudioSettings);

    // 4. Добавление кнопки в Настройки -> Плагины (или основное меню)
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            Lampa.Settings.listener.follow('open', function (s) {
                if (s.name === 'main') {
                    var btn = $(`<div class="settings-folder selector">
                        <div class="settings-folder__icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 12h10M12 7v10"/></svg></div>
                        <div class="settings-folder__name">Логотипы студий</div>
                    </div>`);
                    
                    btn.on('hover:enter', function () {
                        Lampa.Activity.push({
                            title: 'Логотипы студий',
                            component: 'studio_logos_comp',
                            page: 1
                        });
                    });
                    s.body.find('.settings-list').append(btn);
                }
            });
        }
    });

    // 5. Логика отрисовки на странице фильма
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete' && Lampa.Storage.get('studio_logos_enabled') === 'true') {
            var movie = e.data.movie;
            var type = movie.first_air_date ? "tv" : "movie";

            Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                if (data.production_companies && data.production_companies.length) {
                    var render = e.object.activity.render();
                    $(".plugin-studio-logos", render).remove();

                    var bg = Lampa.Storage.get('studio_logos_bg') === 'true' ? 'background:rgba(255,255,255,0.1);padding:5px;border-radius:4px;' : '';
                    var size = Lampa.Storage.get('studio_logos_size');
                    var gap = Lampa.Storage.get('studio_logos_margin');
                    var sat = Lampa.Storage.get('studio_logos_sat');

                    var html = $('<div class="plugin-studio-logos" style="display:flex; gap:'+gap+'; margin-top:10px; filter:saturate('+sat+')"></div>');
                    
                    data.production_companies.slice(0, 3).forEach(function(co) {
                        if (co.logo_path) {
                            html.append(`<img src="https://image.tmdb.org/t/p/h100${co.logo_path}" style="height:${size}; ${bg}">`);
                        }
                    });

                    $(".full-start-new__title, .full-start__title", render).after(html);
                }
            });
        }
    });

})();
