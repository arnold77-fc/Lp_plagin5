(function () {
    'use strict';

    // 1. Стили для логотипов студий
    var styles = `
        .plugin-uk-title-combined { 
            margin-top: 10px; 
            margin-bottom: 5px; 
            text-align: left; 
            width: 100%; 
            display: flex; 
            flex-direction: column; 
            align-items: flex-start; 
        }
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            vertical-align: middle; 
            border-radius: 8px; 
            transition: all 0.2s ease; 
            height: auto; 
            cursor: pointer; 
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.2) !important; 
            border: 1px solid #fff; 
            transform: scale(1.05); 
        }
        .rate--studio.studio-logo img { 
            max-width: 200px; 
            width: auto; 
            object-fit: contain; 
        }
        .studio-logo-text { 
            font-size: 0.8em; 
            font-weight: bold; 
            color: #fff !important; 
            white-space: nowrap; 
        }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; text-align: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // Инициализация дефолтных настроек в Storage
    Lampa.Storage.set('studio_logo_enabled', Lampa.Storage.get('studio_logo_enabled', true));
    Lampa.Storage.set('studio_logo_backdrop', Lampa.Storage.get('studio_logo_backdrop', true));
    Lampa.Storage.set('studio_logo_count', Lampa.Storage.get('studio_logo_count', '3'));
    Lampa.Storage.set('studio_logo_size', Lampa.Storage.get('studio_logo_size', '0.7'));
    Lampa.Storage.set('studio_logo_margin', Lampa.Storage.get('studio_logo_margin', '0.2'));
    Lampa.Storage.set('studio_logo_saturation', Lampa.Storage.get('studio_logo_saturation', '100'));

    // 2. Функция анализа яркости
    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            if (canvas.width === 0 || canvas.height === 0) return;
            ctx.drawImage(img, 0, 0);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var data = imageData.data;
            var darkPixels = 0;
            var totalPixels = 0;
            for (var i = 0; i < data.length; i += 4) {
                var alpha = data[i + 3];
                if (alpha < 10) continue;
                totalPixels++;
                var r = data[i], g = data[i + 1], b = data[i + 2];
                var brightness = (r * 299 + g * 587 + b * 114) / 1000;
                if (brightness < 120) darkPixels++;
            }
            if (totalPixels > 0 && (darkPixels / totalPixels) >= threshold) {
                img.style.filter += " brightness(0) invert(1)";
            }
        } catch (e) {}
    }

    // 3. Основная функция отрисовки
    function renderStudiosTitle(render, movie) {
        if (!render || !Lampa.Storage.get('studio_logo_enabled')) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logo_backdrop');
        var maxCount = parseInt(Lampa.Storage.get('studio_logo_count'));
        var sizeEm = Lampa.Storage.get('studio_logo_size') + 'em';
        var gapEm = Lampa.Storage.get('studio_logo_margin') + 'em';
        var saturation = Lampa.Storage.get('studio_logo_saturation') / 100;

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, maxCount);
            companies.forEach(function (co, index) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" title="' + co.name + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                if (!showBg && index > 0) {
                    html += '<span style="color: rgba(255,255,255,0.4); margin: 0 ' + gapEm + '; font-size: 0.6em; display: inline-flex; align-items: center;">●</span>';
                }

                html += '<div class="rate--studio studio-logo ymod-studio-item" data-id="' + co.id + '" data-name="' + co.name + '" style="display: inline-flex; vertical-align: middle;">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgCSS = showBg 
            ? 'background: rgba(255,255,255,0.08) !important; padding: 5px 12px !important; margin-right: ' + gapEm + ' !important;' 
            : 'background: transparent !important; border: none !important; padding: 5px 0px !important; margin-bottom: 0.2em !important;';

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).css('cssText', bgCSS + ' filter: saturate(' + saturation + ');');
        $('.rate--studio img', render).css('cssText', 'height: ' + sizeEm + ' !important;');

        $('.studio-img-check', render).each(function() {
            var img = this;
            if (img.complete) analyzeAndInvert(img, 0.85);
            else img.onload = function() { analyzeAndInvert(img, 0.85); };
        });

        $('.rate--studio', render).on('hover:enter', function () {
            var id = $(this).data('id');
            if (id) Lampa.Activity.push({ url: 'movie', id: id, title: $(this).data('name'), component: 'company', source: 'tmdb', page: 1 });
        });
    }

    // 4. Добавление пункта настроек
    function addSettings() {
        Lampa.Settings.main().render().find('[data-component="plugins"]').after('<div class="settings-list__item selector" data-component="studio_logos"> <div class="settings-list__name">Логотипы студий</div> </div>');

        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'studio_logos') {
                var items = [
                    {
                        title: 'Включить плагин',
                        subtitle: 'Отображать логотипы студий производства',
                        type: 'bool',
                        name: 'studio_logo_enabled',
                        value: true
                    },
                    {
                        title: 'Количество логотипов',
                        subtitle: 'Сколько студий выводить в карточке',
                        type: 'select',
                        name: 'studio_logo_count',
                        value: '3',
                        values: { '1': '1', '2': '2', '3': '3 (Стандарт)', '4': '4', '5': '5' }
                    },
                    {
                        title: 'Подложка',
                        subtitle: 'Полупрозрачный фон за логотипом',
                        type: 'bool',
                        name: 'studio_logo_backdrop',
                        value: true
                    },
                    {
                        title: 'Размер логотипа',
                        subtitle: 'Высота значка в единицах em',
                        type: 'select',
                        name: 'studio_logo_size',
                        value: '0.7',
                        values: { '0.5': '0.5em', '0.6': '0.6em', '0.7': '0.7em (Стандарт)', '0.9': '0.9em', '1.1': '1.1em' }
                    },
                    {
                        title: 'Отступ между лого',
                        subtitle: 'Расстояние между иконками',
                        type: 'select',
                        name: 'studio_logo_margin',
                        value: '0.2',
                        values: { '0.1': '0.1em', '0.2': '0.2em (Стандарт)', '0.4': '0.4em', '0.6': '0.6em' }
                    },
                    {
                        title: 'Насыщенность',
                        subtitle: 'Цветность логотипов студий',
                        type: 'select',
                        name: 'studio_logo_saturation',
                        value: '100',
                        values: { '0': 'Черно-белое', '50': '50%', '100': '100% (Оригинал)', '150': '150%' }
                    }
                ];

                var html = Lampa.Settings.create(items);
                
                html.on('change', function (event) {
                    Lampa.Storage.set(event.name, event.value);
                });

                e.body.append(html);
            }
        });
    }

    if (window.appready) addSettings();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addSettings(); });

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var render = e.object.activity.render();
            var type = card.first_air_date ? "tv" : "movie";
            
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });

})();
