(function () {
    'use strict';

    // 1. Стили (добавляем один раз)
    if (!$('#ymod-studio-styles').length) {
        $('head').append('<style id="ymod-studio-styles">' +
            '.plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }' +
            '.studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }' +
            '.rate--studio.studio-logo { display: inline-flex; align-items: center; vertical-align: middle; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }' +
            '.rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; border: 1px solid #fff; transform: scale(1.05); }' +
            '.rate--studio.studio-logo img { max-width: 200px; width: auto; object-fit: contain; }' +
            '.studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; margin: 0 5px; }' +
            '@media screen and (orientation: portrait), screen and (max-width: 767px) {' +
                '.plugin-uk-title-combined { align-items: center !important; }' +
                '.studio-logos-container { justify-content: center !important; }' +
            '}</style>');
    }

    // 2. Регистрация настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selector" data-type="toggle" data-name="plugin_studios_item">' +
                '<div class="settings-param__name">Логотипы студий</div>' +
                '<div class="settings-param__value">Настроить</div>' +
                '<div class="settings-param__descr">Отображение и стиль логотипов компаний</div>' +
            '</div>');

            item.on('hover:enter', function () {
                Lampa.Select.show({
                    title: 'Настройки логотипов',
                    items: [
                        { title: 'Включить плагин', param: 'plugin_studios_active', type: 'bool', default: true },
                        { title: 'Подложка (фон)', param: 'plugin_studios_bg', type: 'bool', default: true },
                        { title: 'Размер (em)', param: 'plugin_studios_size', type: 'select', values: {'0.5':'0.5','0.7':'0.7','0.9':'0.9','1.1':'1.1'}, default: '0.7' },
                        { title: 'Отступ (em)', param: 'plugin_studios_gap', type: 'select', values: {'0.1':'0.1','0.2':'0.2','0.4':'0.4'}, default: '0.2' },
                        { title: 'Насыщенность (%)', param: 'plugin_studios_sat', type: 'select', values: {'0.5':'0.5','1':'1','1.5':'1.5'}, default: '1' }
                    ],
                    onSelect: function (a) {
                        Lampa.Storage.set(a.param, a.value);
                    },
                    onBack: function () {
                        Lampa.Settings.open('interface');
                    }
                });
            });

            var target = e.body.find('[data-name="interface_size"]');
            if (target.length) target.after(item); else e.body.append(item);
            Lampa.Controller.update();
        }
    });

    // 3. Анализ яркости
    function analyzeInvert(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] > 10) { total++; if ((data[i] + data[i+1] + data[i+2]) / 3 < 120) dark++; }
            }
            if (total > 0 && (dark / total) >= 0.85) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка
    function renderStudios(render, movie) {
        if (Lampa.Storage.get('plugin_studios_active', 'true') === 'false') return;
        $(".plugin-uk-title-combined", render).remove();

        var showBg = Lampa.Storage.get('plugin_studios_bg', 'true') === 'true';
        var size = Lampa.Storage.get('plugin_studios_size', '0.7');
        var gap = Lampa.Storage.get('plugin_studios_gap', '0.2');
        var sat = Lampa.Storage.get('plugin_studios_sat', '1');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        $(".full-start-new__title, .full-start__title", render).after(wrap);

        wrap.find('.rate--studio').css({
            'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
            'padding': showBg ? '4px 10px' : '2px 0',
            'margin-right': gap + 'em',
            'filter': 'saturate(' + sat + ')'
        });
        wrap.find('img').css('height', size + 'em');

        wrap.find('.studio-img-check').each(function() {
            var img = this;
            if (img.complete) analyzeInvert(img); else img.onload = function() { analyzeInvert(img); };
        });

        wrap.find('.rate--studio').on('hover:enter', function () {
            Lampa.Activity.push({ url: '', title: $(this).data('name'), component: 'category_full', id: $(this).data('id'), source: 'tmdb', type: 'company', page: 1 });
        });
    }

    // 5. Старт
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var type = (e.data.movie.number_of_seasons || e.data.movie.first_air_date) ? "tv" : "movie";
            Lampa.Api.sources.tmdb.get(type + "/" + e.data.movie.id, {}, function (data) {
                renderStudios(e.object.activity.render(), data);
            });
        }
    });
})();
