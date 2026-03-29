(function () {
    'use strict';

    // 1. Стили
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; vertical-align: middle; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }
        .rate--studio.studio-logo img { max-width: 200px; width: auto; object-fit: contain; }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; margin: 0 5px; }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 2. Логика работы с настройками
    function addSettingsItem(body) {
        if (body.find('[data-name="plugin_studios_item"]').length > 0) return;

        var item = $(`
            <div class="settings-param selector" data-type="toggle" data-name="plugin_studios_item">
                <div class="settings-param__name">Логотипы студий</div>
                <div class="settings-param__value">Настроить</div>
                <div class="settings-param__descr">Отображение и стиль логотипов компаний</div>
            </div>
        `);

        item.on('hover:enter', function () {
            Lampa.Select.show({
                title: 'Настройки логотипов',
                items: [
                    { title: 'Включить плагин', param: 'plugin_studios_active', type: 'bool', default: true },
                    { title: 'Подложка (фон)', param: 'plugin_studios_bg', type: 'bool', default: true },
                    { title: 'Размер (стандарт 0.7)', param: 'plugin_studios_size', type: 'select', values: {'0.5em':'0.5','0.7em':'0.7','0.9em':'0.9','1.1em':'1.1'}, default: '0.7' },
                    { title: 'Отступ между лого', param: 'plugin_studios_gap', type: 'select', values: {'0.1em':'0.1','0.2em':'0.2','0.4em':'0.4'}, default: '0.2' },
                    { title: 'Насыщенность (%)', param: 'plugin_studios_sat', type: 'select', values: {'50%':'0.5','100%':'1','150%':'1.5'}, default: '1' }
                ],
                onSelect: function (a) {
                    Lampa.Storage.set(a.param, a.value);
                    Lampa.Settings.update();
                },
                onBack: function () {
                    Lampa.Settings.open('interface');
                }
            });
        });

        // Вставляем после размера интерфейса или в начало
        var target = body.find('[data-name="interface_size"]');
        if (target.length) target.after(item);
        else body.prepend(item);

        Lampa.Controller.update(); 
    }

    // Слушатель открытия настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            setTimeout(function() { addSettingsItem(e.body); }, 10);
        }
    });

    // 3. Функция инверсии темных логотипов
    function analyzeAndInvert(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 10) { total++; if ((data[i]+data[i+1]+data[i+2])/3 < 120) dark++; }
            }
            if (total > 0 && (dark / total) >= 0.8) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка в карточке
    function renderStudios(render, movie) {
        if (Lampa.Storage.field('plugin_studios_active') === false) return;
        $(".plugin-uk-title-combined", render).remove();

        var showBg = Lampa.Storage.field('plugin_studios_bg') !== false;
        var size = Lampa.Storage.field('plugin_studios_size') || '0.7';
        var gap = Lampa.Storage.field('plugin_studios_gap') || '0.2';
        var sat = Lampa.Storage.field('plugin_studios_sat') || '1';

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? `<img src="https://image.tmdb.org/t/p/h100${co.logo_path}" crossorigin="anonymous" class="studio-img-check">` 
                    : `<span class="studio-logo-text">${co.name}</span>`;
                
                html += `<div class="rate--studio studio-logo selector" data-id="${co.id}" data-name="${co.name}">${content}</div>`;
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        $(".full-start-new__title, .full-start__title", render).after(wrap);

        wrap.find('.rate--studio').css({
            'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
            'padding': showBg ? '4px 10px' : '2px 0',
            'margin-right': gap + 'em',
            'filter': 'saturate(' + sat + ')',
            '
