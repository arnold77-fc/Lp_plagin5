(function () {
    'use strict';

    // 1. Регистрация в меню
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg></div>' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');

            item.on('hover:enter', function () {
                Lampa.Component.add('studio_logos_settings', StudioSettings);
                Lampa.Activity.push({ title: 'Логотипы студий', component: 'studio_logos_settings', page: 1 });
            });
            e.body.append(item);
        }
    });

    // 2. Компонент настроек
    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var html = $('<div class="settings-list"></div>');
        this.create = function () {
            var menu = [
                { title: 'Увімкнути плагін', param: 'studio_logos_enabled', values: { 'true': 'Да', 'false': 'Нет' }, default: 'true' },
                { title: 'Підложка', param: 'studio_logos_bg', values: { 'true': 'Да', 'false': 'Нет' }, default: 'true' },
                { title: 'Розмір лого', param: 'studio_logos_size', values: { '0.6em': 'Маленький', '0.8em': 'Средний', '1.1em': 'Большой' }, default: '0.8em' }
            ];
            menu.forEach(function(m){
                var val = Lampa.Storage.get(m.param, m.default);
                var item = $('<div class="settings-param selector"><div class="settings-param__name">' + m.title + '</div><div class="settings-param__value">' + (m.values[val] || val) + '</div></div>');
                item.on('hover:enter', function(){
                    Lampa.Select.show({
                        title: m.title, items: Object.keys(m.values).map(k => ({title: m.values[k], value: k})),
                        onSelect: function(a){ Lampa.Storage.set(m.param, a.value); item.find('.settings-param__value').text(a.title); Lampa.Controller.toggle('settings_studio'); },
                        onBack: function(){ Lampa.Controller.toggle('settings_studio'); }
                    });
                });
                html.append(item);
            });
            scroll.append(html);
        };
        this.start = function () {
            Lampa.Controller.add('settings_studio', {
                toggle: function () { Lampa.Controller.collectionSet(scroll.render()); Lampa.Controller.collectionFocus(false, scroll.render()); },
                up: function() { Lampa.Navigator.move('up'); }, down: function() { Lampa.Navigator.move('down'); }, back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('settings_studio');
        };
        this.render = function () { return scroll.render(); };
        this.destroy = function () { scroll.destroy(); html.remove(); };
    }

    // 3. Стили (добавлен принудительный z-index)
    $('head').append('<style>.plugin-studio-logos { margin: 10px 0; display: block; position: relative; z-index: 10; }.studio-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.studio-item { display: inline-flex; align-items: center; border-radius: 4px; background: rgba(255,255,255,0.1); padding: 4px 8px; }.studio-item img { height: 1em; width: auto; display: block; }.studio-text { font-size: 0.7em; font-weight: bold; color: #fff; text-transform: uppercase; letter-spacing: 1px; }</style>');

    // 4. Функция отрисовки
    function draw(render, companies) {
        if (Lampa.Storage.get('studio_logos_enabled', 'true') === 'false') return;
        render.find('.plugin-studio-logos').remove();

        var size = Lampa.Storage.get('studio_logos_size', '0.8em');
        var bg = Lampa.Storage.get('studio_logos_bg', 'true') === 'true' ? '' : 'background:none;padding:0;';
        var items = '';

        companies.slice(0, 4).forEach(function(co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/w200' + co.logo_path + '" style="height:'+size+'" onerror="$(this).replaceWith(\'<span class=\\\'studio-text\\\'>'+co.name+'</span>\')"/>' 
                : '<span class="studio-text">' + co.name + '</span>';
            items += '<div class="studio-item" style="'+bg+'">' + content + '</div>';
        });

        if (items) {
            var html = $('<div class="plugin-studio-logos"><div class="studio-container">' + items + '</div></div>');
            var title = render.find('.full-start__title, .full-start-new__title, .full-info__title, h1').first();
            if (title.length) title.after(html);
        }
    }

    // 5. Инициализация
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complete') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            
            // Пытаемся взять данные из уже загруженного объекта
            if (movie.production_companies && movie.production_companies.length) {
                draw(render, movie.production_companies);
            } else {
                // Если в объекте нет, делаем запрос
                var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
                Lampa.Api.sources.tmdb.get(type + '/' + movie.id, {}, function (data) {
                    if (data.production_companies) draw(render, data.production_companies);
                });
            }
        }
    });
})();
