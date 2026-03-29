(function () {
    'use strict';

    // 1. Регистрация настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" fill="currentColor"/></svg></div>' +
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

    // 2. Компонент панели настроек
    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var html = $('<div class="settings-list"></div>');
        
        this.create = function () {
            var menu = [
                { title: 'Увімкнути плагін', param: 'studio_logos_enabled', values: { 'true': 'Да', 'false': 'Нет' }, default: 'true' },
                { title: 'Підложка', param: 'studio_logos_bg', values: { 'true': 'Да', 'false': 'Нет' }, default: 'true' },
                { title: 'Розмір лого', param: 'studio_logos_size', values: { '0.5em': '0.5em', '0.7em': '0.7em', '1.1em': '1.1em' }, default: '0.7em' },
                { title: 'Відступ між лого', param: 'studio_logos_gap', values: { '0.1em': '0.1em', '0.2em': '0.2em', '0.4em': '0.4em' }, default: '0.2em' },
                { title: 'Насиченість', param: 'studio_logos_saturation', values: { '0': '0%', '0.5': '50%', '1': '100%', '1.5': '150%' }, default: '1' }
            ];

            menu.forEach(function(m){
                var val = Lampa.Storage.get(m.param, m.default);
                var item = $('<div class="settings-param selector" data-type="select"><div class="settings-param__name">' + m.title + '</div><div class="settings-param__value">' + (m.values[val] || val) + '</div></div>');
                item.on('hover:enter', function(){
                    Lampa.Select.show({
                        title: m.title,
                        items: Object.keys(m.values).map(k => ({title: m.values[k], value: k})),
                        onSelect: function(a){
                            Lampa.Storage.set(m.param, a.value);
                            item.find('.settings-param__value').text(a.title);
                            Lampa.Controller.toggle('settings_studio'); 
                        },
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
                up: function() { Lampa.Navigator.move('up'); },
                down: function() { Lampa.Navigator.move('down'); },
                back: function() { Lampa.Activity.backward(); }
            });
            Lampa.Controller.toggle('settings_studio');
        };

        this.render = function () { return scroll.render(); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { scroll.destroy(); html.remove(); };
    }

    // 3. Стили
    var styles = `.plugin-uk-title-combined { margin-bottom: 10px; display: block; width: 100%; }.studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 5px; }.rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 4px; overflow: hidden; }.rate--studio.studio-logo img { height: 1em; width: auto; object-fit: contain; }`;
    $('head').append('<style>' + styles + '</style>');

    // 4. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (Lampa.Storage.get('studio_logos_enabled', 'true') === 'false') return;

        var showBg = Lampa.Storage.get('studio_logos_bg', 'true') === 'true';
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm = Lampa.Storage.get('studio_logos_gap', '0.2em');
        var saturation = Lampa.Storage.get('studio_logos_saturation', '1');

        $(".plugin-uk-title-combined", render).remove();

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.filter(c => c.logo_path).slice(0, 4).forEach(function (co) {
                var style = (showBg ? 'background: rgba(255,255,255,0.15); padding: 3px 6px;' : '') + 'margin-right:'+gapEm+'; filter: saturate('+saturation+');';
                html += '<div class="rate--studio studio-logo" style="'+style+'"><img src="https://image.tmdb.org/t/p/w200' + co.logo_path + '" style="height:'+sizeEm+'" /></div>';
            });
        }

        if (html) {
            var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
            // Пытаемся найти заголовок в разных версиях интерфейса
            var target = render.find('.full-start-new__title, .full-start__title, .full-info__title').first();
            if (target.length) target.after(wrap);
            else render.find('.full-start-new__info, .full-start__info').prepend(wrap);
        }
    }

    // 5. Инициализация
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var type = (e.data.movie.number_of_seasons || e.data.movie.first_air_date) ? "tv" : "movie";
            // Используем стандартный API Lampa
            Lampa.Api.sources.tmdb.get(type + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            }, function(){ console.log('Studio Logos: TMDB Error'); });
        }
    });
})();
