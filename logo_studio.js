(function () {
    'use strict';

    // 1. Настройки
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');
            item.on('hover:enter', function () {
                Lampa.Component.add('studio_logos_settings', StudioSettings);
                Lampa.Activity.push({ title: 'Логотипы студий', component: 'studio_logos_settings', page: 1 });
            });
            e.body.append(item);
        }
    });

    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var html = $('<div class="settings-list"></div>');
        this.create = function () {
            var menu = [{ title: 'Увімкнути', param: 'studio_logos_enabled', values: { 'true': 'Да', 'false': 'Нет' }, default: 'true' }];
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

    // 2. Стили
    $('head').append('<style>.plugin-studio-logos { margin: 10px 0; display: block; clear: both; }.studio-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }.studio-item { background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; display: inline-flex; }.studio-item img { height: 18px; width: auto; }.studio-text { font-size: 12px; color: #fff; font-weight: bold; }</style>');

    // 3. Отрисовка
    function draw(render, companies) {
        if (Lampa.Storage.get('studio_logos_enabled', 'true') === 'false') return;
        render.find('.plugin-studio-logos').remove();

        var items = '';
        companies.forEach(function(co) {
            if (co.logo_path) {
                items += '<div class="studio-item"><img src="https://image.tmdb.org/t/p/w200' + co.logo_path + '" onerror="$(this).replaceWith(\'<span class=\\\'studio-text\\\'>'+co.name+'</span>\')"/></div>';
            } else {
                items += '<div class="studio-item"><span class="studio-text">' + co.name + '</span></div>';
            }
        });

        if (items) {
            var html = $('<div class="plugin-studio-logos"><div class="studio-container">' + items + '</div></div>');
            // Пробуем все возможные варианты вставки
            var containers = ['.full-start__title', '.full-start-new__title', '.full-info__title', '.full-start__info', '.full-info__content', 'h1'];
            var found = false;
            for (var i = 0; i < containers.length; i++) {
                var t = render.find(containers[i]).first();
                if (t.length) {
                    t.after(html);
                    found = true;
                    break;
                }
            }
            if(!found) render.prepend(html); // Если ничего не нашли, кидаем в самый верх
        }
    }

    // 4. Логика получения данных
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complete') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            var id = movie.id;

            // Если зашли через другой источник, ID может быть не от TMDB. Пытаемся найти TMDB ID.
            var tmdb_id = movie.tmdb_id || (movie.source === 'tmdb' ? movie.id : false);
            
            if (tmdb_id || id) {
                var target_id = tmdb_id || id;
                var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
                
                // Делаем прямой запрос к API TMDB, игнорируя локальные данные
                $.ajax({
                    url: 'https://api.themoviedb.org/3/' + type + '/' + target_id + '?api_key=4ef0d359654458cfde28733903876d73&language=ru-RU',
                    method: 'GET',
                    success: function(res) {
                        if (res.production_companies && res.production_companies.length) {
                            draw(render, res.production_companies.slice(0, 4));
                        }
                    }
                });
            }
        }
    });
})();
