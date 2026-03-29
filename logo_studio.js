(function () {
    'use strict';

    // Ключ для хранения настроек
    var STORAGE_KEY = 'studio_logos_plugin_';

    // Стили интерфейса
    var styles = `
        .plugin-studio-logos {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 10px;
            margin-bottom: 5px;
        }
        .studio-logo-item {
            display: inline-flex;
            align-items: center;
            vertical-align: middle;
            border-radius: 6px;
            transition: all 0.2s ease;
            height: auto;
            cursor: pointer;
        }
        .studio-logo-item.focus {
            background: rgba(255,255,255,0.25) !important;
            transform: scale(1.05);
            outline: none;
        }
        .studio-logo-item img {
            max-width: 180px;
            width: auto;
            object-fit: contain;
        }
        .studio-logo-text {
            font-size: 0.85em;
            font-weight: bold;
            color: #fff;
            white-space: nowrap;
        }
        @media screen and (max-width: 767px) {
            .plugin-studio-logos { justify-content: center; }
        }
    `;
    $('head').append('<style id="studio-logos-styles">' + styles + '</style>');

    // Автоматическая инверсия черных логотипов для темной темы Lampa
    function invertDarkLogo(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i+3] > 20) { // Пропускаем прозрачные пиксели
                    total++;
                    var brightness = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
                    if (brightness < 128) dark++;
                }
            }
            if (dark / total > 0.7) img.style.filter += " brightness(0) invert(1)";
        } catch(e) {}
    }

    // Отрисовка блока студий
    function renderStudios(renderTarget, movie) {
        if (!renderTarget || !movie.production_companies || movie.production_companies.length === 0) return;
        
        $(".plugin-studio-logos", renderTarget).remove();

        var useBg = Lampa.Storage.get(STORAGE_KEY + "use_bg", true);
        var logoHeight = Lampa.Storage.get(STORAGE_KEY + "height", '0.8em');
        var saturation = Lampa.Storage.get(STORAGE_KEY + "sat", '1');

        var container = $('<div class="plugin-studio-logos"></div>');
        
        movie.production_companies.slice(0, 3).forEach(function(company) {
            var bgStyle = useBg ? 'background: rgba(255,255,255,0.1); padding: 5px 12px;' : 'padding: 5px 0;';
            var item = $('<div class="studio-logo-item" style="' + bgStyle + ' filter: saturate(' + saturation + ');"></div>');
            
            if (company.logo_path) {
                var img = $('<img src="https://image.tmdb.org/t/p/h100' + company.logo_path + '" crossorigin="anonymous" style="height:' + logoHeight + '">');
                img.on('load', function() { invertDarkLogo(this); });
                item.append(img);
            } else {
                item.append('<span class="studio-logo-text">' + company.name + '</span>');
            }

            // Обработка нажатия
            item.on('hover:enter click', function (e) {
                e.preventDefault();
                Lampa.Activity.push({
                    url: 'discover/movie',
                    title: 'Студия: ' + company.name,
                    component: 'category_full',
                    with_companies: company.id,
                    source: 'tmdb',
                    card_type: 0,
                    page: 1
                });
            });

            container.append(item);
        });

        var titleBlock = renderTarget.find('.full-start-new__title, .full-start__title');
        if (titleBlock.length) titleBlock.after(container);
    }

    // Подписка на событие открытия карточки
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            if (Lampa.Storage.get(STORAGE_KEY + 'enabled', true)) {
                var type = (e.data.movie.number_of_seasons || e.data.movie.first_air_date) ? 'tv' : 'movie';
                Lampa.Network.silent(Lampa.TMDB.api(type + '/' + e.data.movie.id + '?api_key=' + Lampa.TMDB.key()), function(fullData) {
                    render(e.object.activity.render(), fullData);
                });
            }
        }
    });

    function render(target, data) {
        renderStudios(target, data);
        // Делаем элементы доступными для выбора пультом
        setTimeout(function() {
            var items = target.find('.studio-logo-item:not(.selector)');
            if (items.length) {
                items.addClass('selector');
                var ctrl = Lampa.Controller.enabled();
                if (ctrl && (ctrl.name === 'full_start' || ctrl.name === 'full_descr')) {
                    ctrl.collection = target.find('.selector');
                }
            }
        }, 500);
    }

    // Регистрация настроек
    function initSettings() {
        Lampa.SettingsApi.addComponent({ component: 'studio_logos_settings', name: 'Логотипы студий' });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos_settings',
            param: { name: STORAGE_KEY + 'enabled', type: "trigger", default: true },
            field: { name: "Показывать логотипы", description: "Отображать студии производства в описании" }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos_settings',
            param: { name: STORAGE_KEY + "use_bg", type: "trigger", default: true },
            field: { name: "Фоновая подложка", description: "Выделять логотипы серым фоном" }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos_settings',
            param: { 
                name: STORAGE_KEY + "height", 
                type: "select", 
                values: { '0.6em': 'Мини', '0.8em': 'Стандарт', '1.2em': 'Крупный', '1.6em': 'Огромный' }, 
                default: '0.8em' 
            },
            field: { name: "Размер иконок" }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos_settings',
            param: { 
                name: STORAGE_KEY + "sat", 
                type: "select", 
                values: { '1': 'Цветные', '0.5': 'Приглушенные', '0': 'Черно-белые' }, 
                default: '1' 
            },
            field: { name: "Цветовая гамма" }
        });
    }

    if (window.appready) initSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") initSettings(); });

})();
