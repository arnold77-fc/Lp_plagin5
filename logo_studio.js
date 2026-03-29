(function () {
    'use strict';

    // 1. Регистрация настроек в меню Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'main') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings"><div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg></div><div class="settings-folder__name">Логотипы студий</div></div>');
            item.on('hover:enter', function () {
                Lampa.Component.add('studio_logos_settings', StudioSettings);
                Lampa.Activity.push({
                    url: '',
                    title: 'Логотипы студий',
                    component: 'studio_logos_settings',
                    page: 1
                });
            });
            e.body.find('.settings-list').append(item);
        }
    });

    // 2. Компонент панели настроек
    function StudioSettings(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            {
                title: 'Увімкнути плагін',
                subtitle: 'Відображати логотипи студій',
                type: 'select',
                name: 'studio_logos_enabled',
                values: { 'true': 'Да', 'false': 'Нет' },
                default: 'true'
            },
            {
                title: 'Підложка',
                subtitle: 'Напівпрозорий фон за логотипом',
                type: 'select',
                name: 'studio_logos_bg',
                values: { 'true': 'Да', 'false': 'Нет' },
                default: 'true'
            },
            {
                title: 'Розмір лого',
                subtitle: 'Висота іконок',
                type: 'select',
                name: 'studio_logos_size',
                values: { '0.5em': '0.5em', '0.7em': '0.7em (Стандарт)', '1.0em': '1.0em', '1.2em': '1.2em' },
                default: '0.7em'
            },
            {
                title: 'Відступ між лого',
                type: 'select',
                name: 'studio_logos_margin',
                values: { '0.1em': '0.1em', '0.2em': '0.2em', '0.5em': '0.5em' },
                default: '0.2em'
            },
            {
                title: 'Насиченість',
                type: 'select',
                name: 'studio_logos_sat',
                values: { '0': 'ЧБ', '0.5': '50%', '1': '100%', '1.5': 'Ярко' },
                default: '1'
            }
        ];

        this.create = function () {
            var _this = this;
            this.active = function () {
                scroll.active();
            };
            this.render = function () {
                var body = $('<div class="settings-list"></div>');
                items.forEach(function (item) {
                    var val = Lampa.Storage.get(item.name, item.default);
                    var html = $(`<div class="settings-item selector" data-name="${item.name}">
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
                return body;
            };
            return scroll.render().append(this.render());
        };
    }

    // 3. Основная логика отображения
    var styles = `.plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
                  .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
                  .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 6px; }
                  .rate--studio.studio-logo img { max-width: 150px; width: auto; object-fit: contain; }`;
    $('head').append('<style>' + styles + '</style>');

    function renderStudiosTitle(render, movie) {
        if (Lampa.Storage.get('studio_logos_enabled', 'true') === 'false') return;

        var showBg = Lampa.Storage.get('studio_logos_bg', 'true') === 'true';
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm = Lampa.Storage.get('studio_logos_margin', '0.2em');
        var saturation = Lampa.Storage.get('studio_logos_sat', '1');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? `<img src="https://image.tmdb.org/t/p/h100${co.logo_path}" style="height:${sizeEm} !important">` 
                    : `<span style="font-size:0.8em; font-weight:bold;">${co.name}</span>`;
                
                var bgStyle = showBg ? `background: rgba(255,255,255,0.1); padding: 4px 8px; margin-right: ${gapEm};` : `margin-right: ${gapEm};`;
                html += `<div class="rate--studio studio-logo" style="${bgStyle} filter: saturate(${saturation});">${content}</div>`;
            });
        }

        if (html) {
            $(".plugin-uk-title-combined", render).remove();
            var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
            $(".full-start-new__title, .full-start__title", render).after(wrap);
        }
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            Lampa.Api.sources.tmdb.get((e.data.movie.first_air_date ? "tv" : "movie") + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });

})();
