(function () {
    'use strict';

    // 1. Стили
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
            position: relative;
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.2) !important; 
            outline: 2px solid #fff; 
            transform: scale(1.05); 
            z-index: 10;
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

    // Инициализация настроек (проверка на существование)
    if (Lampa.Storage.get('studio_logo_enabled') === null) Lampa.Storage.set('studio_logo_enabled', true);
    if (Lampa.Storage.get('studio_logo_backdrop') === null) Lampa.Storage.set('studio_logo_backdrop', true);
    if (Lampa.Storage.get('studio_logo_count') === null) Lampa.Storage.set('studio_logo_count', '3');
    if (Lampa.Storage.get('studio_logo_size') === null) Lampa.Storage.set('studio_logo_size', '0.7');
    if (Lampa.Storage.get('studio_logo_margin') === null) Lampa.Storage.set('studio_logo_margin', '0.2');
    if (Lampa.Storage.get('studio_logo_saturation') === null) Lampa.Storage.set('studio_logo_saturation', '100');

    // 2. Инверсия темных лого
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
            var darkPixels = 0, totalPixels = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                totalPixels++;
                var brightness = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
                if (brightness < 120) darkPixels++;
            }
            if (totalPixels > 0 && (darkPixels / totalPixels) >= threshold) {
                img.style.filter += " brightness(0) invert(1)";
            }
        } catch (e) {}
    }

    // 3. Отрисовка
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

                html += '<div class="rate--studio studio-logo selector ymod-studio-item" data-id="' + co.id + '" data-name="' + co.name + '" style="display: inline-flex; vertical-align: middle;">' + content + '</div>';
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

        // Переход по клику/ОК
        $('.rate--studio', render).on('hover:enter', function () {
            var coId = $(this).data('id');
            var coName = $(this).data('name');
            if (coId) {
                Lampa.Activity.push({
                    url: 'company/' + coId,
                    title: 'Студия: ' + coName,
                    component: 'category_full', // Используем стандартный компонент категорий
                    source: 'tmdb',
                    card_type: 0,
                    page: 1
                });
            }
        });
    }

    // 4. Добавление настроек
    function addSettings() {
        // Слушаем открытие главного меню настроек
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var field = $(`<div class="settings-list__item selector" data-component="studio_logos">
                    <div class="settings-list__name">Логотипы студий</div>
                    <div class="settings-list__descr">Настройка отображения брендов</div>
                </div>`);
                
                field.on('hover:enter', function () {
                    Lampa.Settings.createPage('studio_logos', 'Логотипы студий');
                });

                e.body.find('[data-component="plugins"]').after(field);
            }

            if (e.name === 'studio_logos') {
                var items = [
                    { title: 'Включить плагин', subtitle: 'Показывать логотипы в карточке', type: 'bool', name: 'studio_logo_enabled', value: true },
                    { title: 'Количество логотипов', subtitle: 'Сколько студий выводить', type: 'select', name: 'studio_logo_count', value: '3', values: { '1': '1', '2': '2', '3': '3', '5': '5' } },
                    { title: 'Подложка', subtitle: 'Фон за логотипом', type: 'bool', name: 'studio_logo_backdrop', value: true },
                    { title: 'Размер логотипа', subtitle: 'Высота значка', type: 'select', name: 'studio_logo_size', value: '0.7', values: { '0.5': '0.5em', '0.7': '0.7em', '1.0': '1.0em' } },
                    { title: 'Насыщенность', subtitle: 'Яркость цветов', type: 'select', name: 'studio_logo_saturation', value: '100', values: { '0': 'Ч/Б', '100': '100%', '150': '150%' } }
                ];

                var html = Lampa.Settings.create(items);
                html.on('change', function (ev) { Lampa.Storage.set(ev.name, ev.value); });
                e.body.append(html);
            }
        });
    }

    // Инициализация
    if (window.appready) addSettings();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') addSettings(); });

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var render = e.object.activity.render();
            Lampa.Api.sources.tmdb.get((card.first_air_date ? "tv" : "movie") + "/" + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });

})();
