(function () {
    'use strict';

    // 1. Инициализация настроек в хранилище Lampa
    Lampa.Storage.setDefault('studio_logos_enabled', true);
    Lampa.Storage.setDefault('studio_logos_bg', true);
    Lampa.Storage.setDefault('studio_logos_size', '0.7em');
    Lampa.Storage.setDefault('studio_logos_margin', '0.2em');
    Lampa.Storage.setDefault('studio_logos_saturation', '100%');

    // 2. Добавление пункта в меню настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'appearance') { // Добавляем в раздел "Внешний вид"
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

    // Конструктор компонента настроек
    function StudioSettings(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            {
                title: 'Увімкнути плагін',
                description: 'Відображати логотипи студій',
                type: 'switch',
                name: 'studio_logos_enabled',
                default: true
            },
            {
                title: 'Підложка',
                description: 'Напівпрозорий фон за логотипом',
                type: 'switch',
                name: 'studio_logos_bg',
                default: true
            },
            {
                title: 'Розмір лого',
                description: 'Наприклад: 0.7em',
                type: 'select',
                name: 'studio_logos_size',
                values: {'0.5em':'0.5em', '0.7em':'0.7em (Стандарт)', '0.9em':'0.9em', '1.1em':'1.1em'},
                default: '0.7em'
            },
            {
                title: 'Відступ між лого',
                type: 'select',
                name: 'studio_logos_margin',
                values: {'0.1em':'0.1em', '0.2em':'0.2em', '0.4em':'0.4em'},
                default: '0.2em'
            },
            {
                title: 'Насиченість',
                type: 'select',
                name: 'studio_logos_saturation',
                values: {'0%':'0%', '50%':'50%', '100%':'100%'},
                default: '100%'
            }
        ];

        this.create = function () {
            var _this = this;
            this.active_item = 0;
            items.forEach(function (item) {
                var html = Lampa.Template.get('settings_field', item);
                var value = Lampa.Storage.get(item.name, item.default);

                if (item.type === 'switch') {
                    html.find('.settings-param__value').text(value ? 'Да' : 'Нет');
                } else {
                    html.find('.settings-param__value').text(item.values[value] || value);
                }

                html.on('hover:enter', function () {
                    if (item.type === 'switch') {
                        var new_val = !Lampa.Storage.get(item.name, item.default);
                        Lampa.Storage.set(item.name, new_val);
                        html.find('.settings-param__value').text(new_val ? 'Да' : 'Нет');
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(v => ({title: item.values[v], value: v})),
                            onSelect: function (sel) {
                                Lampa.Storage.set(item.name, sel.value);
                                html.find('.settings-param__value').text(sel.title);
                            }
                        });
                    }
                });
                scroll.append(html);
            });
            return scroll.render();
        };

        this.render = function () { return this.create(); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { scroll.destroy(); network.clear(); };
    }

    // 3. Стили (остаются прежними)
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
    $('head').append('<style>' + styles + '</style>');

    function analyzeAndInvert(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                total++;
                if ((data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000 < 120) dark++;
            }
            if (total > 0 && (dark / total) >= 0.85) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка с учетом настроек
    function renderStudiosTitle(render, movie) {
        if (!Lampa.Storage.get('studio_logos_enabled', true)) return;
        
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_bg', true);
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm = Lampa.Storage.get('studio_logos_margin', '0.2em');
        var saturation = Lampa.Storage.get('studio_logos_saturation', '100%');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span style="font-size:0.8em; font-weight:bold; color:#fff">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo" data-id="'+co.id+'" style="margin-right:'+gapEm+'">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgCSS = showBg ? 'background: rgba(255,255,255,0.08); padding: 5px 12px;' : 'background: transparent; padding: 5px 0;';
        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        
        $(".full-start-new__title, .full-start__title", render).after(wrap);

        $('.rate--studio', render).css('cssText', bgCSS + ' filter: saturate(' + saturation + ');');
        $('.rate--studio img', render).css('cssText', 'height: ' + sizeEm + ' !important;');

        $('.studio-img-check', render).each(function() {
            if (this.complete) analyzeAndInvert(this);
            else this.onload = function() { analyzeAndInvert(this); };
        });
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            Lampa.Api.sources.tmdb.get((e.data.movie.number_of_seasons ? "tv" : "movie") + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });
})();
