(function () {
    'use strict';

    var L_MOD = 'studio_mod_';

    // 1. Стили с поддержкой динамических настроек
    var styles = `
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            margin-top: 10px;
            gap: 10px;
            width: 100%;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            vertical-align: middle; 
            border-radius: 6px; 
            transition: all 0.2s ease; 
            cursor: pointer;
            box-sizing: border-box;
        }
        .rate--studio.studio-logo.has-bg {
            background: rgba(255,255,255,0.1);
            padding: 5px 12px;
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.25) !important; 
            outline: 2px solid #fff;
            transform: scale(1.05); 
        }
        .rate--studio.studio-logo img { 
            max-width: 180px; 
            object-fit: contain; 
            display: block;
        }
        .studio-logo-text { 
            font-weight: bold; 
            color: #fff; 
            white-space: nowrap; 
        }
        @media screen and (max-width: 767px) {
            .studio-logos-container { justify-content: center; }
        }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    // 2. Функция анализа яркости для инверсии
    function analyzeAndInvert(img) {
        img.onload = function() {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                var darkPixels = 0, totalPixels = 0;
                for (var i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 20) continue;
                    totalPixels++;
                    var brightness = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
                    if (brightness < 128) darkPixels++;
                }
                if (totalPixels > 0 && (darkPixels / totalPixels) >= 0.7) {
                    img.style.filter += " brightness(0) invert(1)";
                }
            } catch (e) {}
        };
    }

    // 3. Основной рендер
    function renderStudios(e) {
        if (!Lampa.Storage.get(L_MOD + 'enabled', true)) return;

        var movie = e.data.movie;
        var render = e.object.activity.render();
        var type = (movie.number_of_seasons || e.object.method === 'tv') ? 'tv' : 'movie';
        
        var size = Lampa.Storage.get(L_MOD + 'size', '0.8em');
        var saturation = Lampa.Storage.get(L_MOD + 'saturation', '1');
        var useBg = Lampa.Storage.get(L_MOD + 'bg', true);

        $.getJSON('https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key(), function(data) {
            if (data && data.production_companies && data.production_companies.length) {
                var container = $('<div class="studio-logos-container"></div>');
                
                data.production_companies.slice(0, 4).forEach(function(co) {
                    var item = $('<div class="rate--studio studio-logo selector ' + (useBg ? 'has-bg' : '') + '" data-id="'+co.id+'" data-name="'+co.name+'"></div>');
                    item.css('filter', 'saturate(' + saturation + ')');

                    if (co.logo_path) {
                        var img = document.createElement('img');
                        img.src = 'https://image.tmdb.org/t/p/h100' + co.logo_path;
                        img.style.height = size;
                        img.crossOrigin = "Anonymous";
                        analyzeAndInvert(img);
                        item.append(img);
                    } else {
                        item.append('<span class="studio-logo-text" style="font-size:'+size+'">' + co.name + '</span>');
                    }

                    item.on('hover:enter', function() {
                        Lampa.Activity.push({
                            url: 'movie', id: co.id, title: co.name, component: 'company', source: 'tmdb', page: 1
                        });
                    });

                    container.append(item);
                });

                var target = render.find('.full-start__title, .full-start-new__title').first();
                target.after(container);
                
                // Чтобы работала навигация пультом
                Lampa.Controller.add('full_start', {
                    toggle: function() { Lampa.Controller.collection(render.find('.selector')); }
                });
            }
        });
    }

    // 4. Настройки в меню Лампы
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'studio_logos',
            name: 'Логотипы студий',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5C3.9 3 3 3.9 3 5V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V5C21 3.9 20.1 3 19 3ZM19 19H5V5H19V19ZM13.96 12.29L11.21 15.83L9.25 13.47L6.5 17H17.5L13.96 12.29Z" fill="currentColor"/></svg>'
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { name: L_MOD + 'enabled', type: 'trigger', default: true },
            field: { name: 'Включить плагин', description: 'Показывать логотипы компаний' }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { name: L_MOD + 'bg', type: 'trigger', default: true },
            field: { name: 'Фоновая подложка', description: 'Светлый фон вокруг логотипа' }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { 
                name: L_MOD + 'size', 
                type: 'select', 
                values: { '0.6em': 'Маленький', '0.8em': 'Стандарт', '1.1em': 'Большой', '1.5em': 'Огромный' }, 
                default: '0.8em' 
            },
            field: { name: 'Размер логотипов', description: 'Высота значков в карточке' }
        });

        Lampa.SettingsApi.addParam({
            component: 'studio_logos',
            param: { 
                name: L_MOD + 'saturation', 
                type: 'select', 
                values: { '1': 'Цветные (100%)', '0.5': 'Приглушенные', '0': 'Черно-белые' }, 
                default: '1' 
            },
            field: { name: 'Насыщенность', description: 'Цвет логотипов' }
        });
    }

    // Запуск
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complete') renderStudios(e);
    });

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();
