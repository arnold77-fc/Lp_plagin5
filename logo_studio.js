(function () {
    'use strict';

    // 1. Инициализация настроек в меню Lampa
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',
        name: 'studio_logos',
        parent: 'interface'
    });

    Lampa.Settings.add({
        name: 'studio_logo_size',
        type: 'select',
        title: 'Размер логотипа',
        subtitle: 'Высота значков компаний',
        values: {
            '0.5em': 'Маленький',
            '0.7em': 'Стандартный',
            '0.9em': 'Средний',
            '1.2em': 'Большой'
        },
        default: '0.7em',
        parent: 'studio_logos'
    });

    Lampa.Settings.add({
        name: 'studio_logo_saturation',
        type: 'select',
        title: 'Насыщенность',
        subtitle: 'Интенсивность цвета логотипов',
        values: {
            '0': 'Чёрно-белый',
            '0.5': 'Приглушенный',
            '1': 'Оригинал',
            '1.5': 'Яркий'
        },
        default: '1',
        parent: 'studio_logos'
    });

    Lampa.Settings.add({
        name: 'studio_logo_bg',
        type: 'select',
        title: 'Подложка',
        subtitle: 'Фон вокруг логотипа',
        values: {
            'none': 'Без фона',
            'glass': 'Стеклянная (0.08)',
            'solid': 'Темная'
        },
        default: 'glass',
        parent: 'studio_logos'
    });

    Lampa.Settings.add({
        name: 'studio_logo_margin',
        type: 'select',
        title: 'Расстояние между лого',
        subtitle: 'Отступ между иконками',
        values: {
            '0.1em': 'Минимальное',
            '0.3em': 'Умеренное',
            '0.6em': 'Широкое'
        },
        default: '0.3em',
        parent: 'studio_logos'
    });

    // 2. Стили
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
            cursor: pointer; 
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.2) !important; 
            border: 1px solid #fff; 
            transform: scale(1.05); 
        }
        .rate--studio.studio-logo img { 
            width: auto; 
            object-fit: contain; 
        }
        .studio-logo-text { 
            font-size: 0.8em; 
            font-weight: bold; 
            color: #fff !important; 
        }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; text-align: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Анализ цвета (без изменений)
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

    // 4. Отрисовка с учетом настроек
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        // Получаем значения из настроек Lampa
        var sizeEm = Lampa.Storage.get('studio_logo_size', '0.7em');
        var saturation = Lampa.Storage.get('studio_logo_saturation', '1');
        var bgType = Lampa.Storage.get('studio_logo_bg', 'glass');
        var gapEm = Lampa.Storage.get('studio_logo_margin', '0.3em');

        var bgStyle = '';
        if (bgType === 'glass') bgStyle = 'background: rgba(255,255,255,0.08) !important; padding: 5px 12px !important;';
        else if (bgType === 'solid') bgStyle = 'background: rgba(0,0,0,0.4) !important; padding: 5px 12px !important;';
        else bgStyle = 'background: transparent !important; padding: 5px 0px !important;';

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, 4);
            companies.forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo ymod-studio-item" data-id="' + co.id + '" data-name="' + co.name + '" style="margin-right:' + gapEm + '; ' + bgStyle + ' filter: saturate(' + saturation + ');">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio img', render).css('height', sizeEm);

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
