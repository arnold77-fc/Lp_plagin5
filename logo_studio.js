(function () {
    'use strict';

    // 1. Инициализация настроек в памяти Lampa
    Lampa.Storage.setDefault('studio_logos_enabled', true);
    Lampa.Storage.setDefault('studio_logos_background', true);
    Lampa.Storage.setDefault('studio_logos_size', '0.7');
    Lampa.Storage.setDefault('studio_logos_margin', '0.2');
    Lampa.Storage.setDefault('studio_logos_saturation', '100');

    // 2. Создание меню в "Настройках"
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M17.66 11.57l-4.46 4.46a.997.997 0 0 1-1.41 0L7.33 11.57a.997.997 0 0 1 0-1.41l4.46-4.46c.39-.39 1.02-.39 1.41 0l4.46 4.46c.39.39.39 1.02 0 1.41z" fill="currentColor"/></svg>',
        component: 'studio_logos_settings'
    });

    // Компонент страницы настроек
    Lampa.Component.add('studio_logos_settings', function (object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            {
                title: 'Увімкнути плагін',
                subtitle: 'Відображати логотипи студій',
                type: 'bool',
                name: 'studio_logos_enabled'
            },
            {
                title: 'Підложка',
                subtitle: 'Напівпрозорий фон за логотипом',
                type: 'bool',
                name: 'studio_logos_background'
            },
            {
                title: 'Розмір лого',
                subtitle: Lampa.Storage.get('studio_logos_size') + 'em',
                type: 'select',
                name: 'studio_logos_size',
                values: { '0.5': '0.5em', '0.7': '0.7em (Стандарт)', '0.9': '0.9em', '1.1': '1.1em' }
            },
            {
                title: 'Відступ між лого',
                subtitle: Lampa.Storage.get('studio_logos_margin') + 'em',
                type: 'select',
                name: 'studio_logos_margin',
                values: { '0.1': '0.1em', '0.2': '0.2em', '0.4': '0.4em' }
            },
            {
                title: 'Насиченість',
                subtitle: Lampa.Storage.get('studio_logos_saturation') + '%',
                type: 'select',
                name: 'studio_logos_saturation',
                values: { '0': '0%', '50': '50%', '100': '100%', '150': '150%' }
            }
        ];

        this.create = function () {
            var _this = this;
            items.forEach(function (item) {
                var field = Lampa.Template.get('settings_field', item);
                field.on('hover:enter', function () {
                    if (item.type === 'bool') {
                        var v = !Lampa.Storage.get(item.name);
                        Lampa.Storage.set(item.name, v);
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(k => ({title: item.values[k], value: k})),
                            onSelect: function (sel) {
                                Lampa.Storage.set(item.name, sel.value);
                                Lampa.Activity.replace(); 
                            }
                        });
                    }
                    Lampa.Activity.replace();
                });
                scroll.append(field);
            });
            return scroll.render();
        };
        this.render = function () { return this.create(); };
    });

    // 3. Стили и логика отображения
    var styles = `.plugin-uk-title-combined { margin-top: 10px; display: flex; flex-wrap: wrap; } 
                  .studio-logo { border-radius: 6px; display: inline-flex; align-items: center; margin-bottom: 5px; }
                  .studio-logo img { object-fit: contain; }`;
    $('head').append('<style>' + styles + '</style>');

    function renderStudios(render, movie) {
        if (!Lampa.Storage.get('studio_logos_enabled') || !movie.production_companies) return;

        $('.plugin-uk-title-combined', render).remove();

        var showBg = Lampa.Storage.get('studio_logos_background');
        var size = Lampa.Storage.get('studio_logos_size') + 'em';
        var gap = Lampa.Storage.get('studio_logos_margin') + 'em';
        var sat = Lampa.Storage.get('studio_logos_saturation') / 100;

        var html = $('<div class="plugin-uk-title-combined"></div>');
        
        movie.production_companies.slice(0, 3).forEach(function (co) {
            var bg = showBg ? 'background: rgba(255,255,255,0.1); padding: 4px 8px; margin-right:' + gap : 'margin-right:' + gap;
            var item = $('<div class="studio-logo" style="' + bg + '; filter: saturate(' + sat + ')"></div>');
            
            if (co.logo_path) {
                item.append('<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:' + size + '">');
            } else {
                item.append('<span style="font-size:0.7em">' + co.name + '</span>');
            }
            html.append(item);
        });

        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(html);
    }

    // Слушатель открытия карточки
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var movie = e.data.movie;
            var type = movie.number_of_seasons ? 'tv' : 'movie';
            Lampa.Api.sources.tmdb.get(type + '/' + movie.id, {}, function (data) {
                renderStudios(e.object.activity.render(), data);
            }, function(){});
        }
    });
})();
