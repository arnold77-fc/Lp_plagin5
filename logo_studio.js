(function () {
    'use strict';

    // 1. Инициализация настроек в Storage
    Lampa.Storage.setDefault('studio_logos_enabled', true);
    Lampa.Storage.setDefault('studio_logos_background', true);
    Lampa.Storage.setDefault('studio_logos_size', '0.7');
    Lampa.Storage.setDefault('studio_logos_margin', '0.2');
    Lampa.Storage.setDefault('studio_logos_saturation', '100');

    // 2. Добавление пункта в меню настроек Lampa
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5z" fill="currentColor"/></svg>',
        component: 'studio_logos_settings'
    });

    // Создание компонента окна настроек
    Lampa.Component.add('studio_logos_settings', function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var files = new Lampa.Files(object);
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
                values: {
                    '0.5': '0.5em',
                    '0.7': '0.7em (Стандарт)',
                    '0.9': '0.9em',
                    '1.1': '1.1em'
                }
            },
            {
                title: 'Відступ між лого',
                subtitle: Lampa.Storage.get('studio_logos_margin') + 'em',
                type: 'select',
                name: 'studio_logos_margin',
                values: {
                    '0.1': '0.1em',
                    '0.2': '0.2em',
                    '0.4': '0.4em'
                }
            },
            {
                title: 'Насиченість',
                subtitle: Lampa.Storage.get('studio_logos_saturation') + '%',
                type: 'select',
                name: 'studio_logos_saturation',
                values: {
                    '0': '0%',
                    '50': '50%',
                    '100': '100%',
                    '150': '150%'
                }
            }
        ];

        this.create = function () {
            var _this = this;
            this.active_item = 0;
            
            items.forEach(function(item){
                var body = Lampa.Template.get('settings_field', item);
                
                // Обработка переключателей и выбора
                body.on('hover:enter', function(){
                    if(item.type === 'bool'){
                        var v = !Lampa.Storage.get(item.name);
                        Lampa.Storage.set(item.name, v);
                        _this.update();
                    } else if(item.type === 'select'){
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(k => ({title: item.values[k], value: k})),
                            onSelect: function(sel){
                                Lampa.Storage.set(item.name, sel.value);
                                _this.update();
                            }
                        });
                    }
                });
                scroll.append(body);
            });
            return scroll.render();
        };

        this.update = function() {
            Lampa.Activity.replace(); // Перерисовываем меню для обновления субтитров
        };

        this.render = function () {
            return this.create();
        };
    });

    // 3. Стили
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; }
    `;
    $('head').append('<style>' + styles + '</style>');

    // 4. Логика отрисовки (изменена для использования Storage)
    function renderStudiosTitle(render, movie) {
        if (!Lampa.Storage.get('studio_logos_enabled')) return;
        
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_background');
        var sizeEm = Lampa.Storage.get('studio_logos_size') + 'em';
        var gapEm = Lampa.Storage.get('studio_logos_margin') + 'em';
        var saturation = Lampa.Storage.get('studio_logos_saturation') / 100;

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo" data-id="'+co.id+'" data-name="'+co.name+'">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgCSS = showBg 
            ? 'background: rgba(255,255,255,0.08) !important; padding: 5px 12px !important; margin-right: ' + gapEm + ' !important;' 
            : 'background: transparent !important; margin-right: ' + gapEm + ' !important;';

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        $(".full-start-new__title, .full-start__title", render).after(wrap);

        $('.rate--studio', render).css('cssText', bgCSS + ' filter: saturate(' + saturation + ');');
        $('.rate--studio img', render).css('cssText', 'height: ' + sizeEm + ' !important;');
        
        // ... (анализ яркости из вашего кода) ...
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            Lampa.Api.sources.tmdb.get((e.data.movie.first_air_date ? "tv" : "movie") + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });
})();
