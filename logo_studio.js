(function () {
    'use strict';

    // 1. РЕГИСТРАЦИЯ НАСТРОЕК В МЕНЮ LAMPA
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>',
        section: 'plugins',
        name: 'studio_logos_settings'
    });

    Lampa.Settings.add({
        name: 'studio_logos_enabled',
        type: 'select',
        label: 'Увімкнути плагін',
        description: 'Відображати логотипи студій',
        values: {
            true: 'Да',
            false: 'Нет'
        },
        default: true,
        parent: 'studio_logos_settings'
    });

    Lampa.Settings.add({
        name: 'studio_logos_bg',
        type: 'select',
        label: 'Підложка',
        description: 'Напівпрозорий фон за логотипом',
        values: {
            true: 'Да',
            false: 'Нет'
        },
        default: true,
        parent: 'studio_logos_settings'
    });

    Lampa.Settings.add({
        name: 'studio_logos_size',
        type: 'select',
        label: 'Розмір лого',
        description: 'Стандарт: 0.7em',
        values: {
            '0.5em': '0.5em',
            '0.7em': '0.7em (Стандарт)',
            '0.9em': '0.9em',
            '1.2em': '1.2em'
        },
        default: '0.7em',
        parent: 'studio_logos_settings'
    });

    Lampa.Settings.add({
        name: 'studio_logos_gap',
        type: 'select',
        label: 'Відступ між лого',
        values: {
            '0.1em': '0.1em',
            '0.2em': '0.2em',
            '0.4em': '0.4em'
        },
        default: '0.2em',
        parent: 'studio_logos_settings'
    });

    Lampa.Settings.add({
        name: 'studio_logos_saturation',
        type: 'select',
        label: 'Насиченість',
        values: {
            '0': 'Ч/Б',
            '0.5': '50%',
            '1': '100%',
            '1.5': 'Ярко'
        },
        default: '1',
        parent: 'studio_logos_settings'
    });

    // 2. СТИЛИ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; outline: 2px solid #fff; transform: scale(1.05); }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; }
        @media screen and (orientation: portrait) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    function analyzeAndInvert(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
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

    // 3. ОСНОВНАЯ ЛОГИКА ОТРИСОВКИ
    function renderStudiosTitle(render, movie) {
        if (!Lampa.Storage.get('studio_logos_enabled', true)) return;

        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_bg', true);
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm = Lampa.Storage.get('studio_logos_gap', '0.2em');
        var saturation = Lampa.Storage.get('studio_logos_saturation', '1');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        // Применяем настройки из меню
        var bgStyle = showBg ? 'rgba(255,255,255,0.08)' : 'transparent';
        var padding = showBg ? '5px 12px' : '5px 0';

        $('.rate--studio', wrap).css({
            'background': bgStyle,
            'padding': padding,
            'margin-right': gapEm,
            'filter': 'separate(' + saturation + ')'
        });
        $('.rate--studio img', wrap).css('height', sizeEm);

        $('.studio-img-check', wrap).each(function() {
            if (this.complete) analyzeAndInvert(this);
            else this.onload = function() { analyzeAndInvert(this); };
        });

        // Навигация пультом
        $('.rate--studio', wrap).on('hover:enter', function () {
            Lampa.Activity.push({ 
                url: 'movie', 
                id: $(this).data('id'), 
                title: $(this).data('name'), 
                component: 'company', 
                source: 'tmdb', 
                page: 1 
            });
        });
    }

    // ПОДПИСКА НА СОБЫТИЕ ОТКРЫТИЯ КАРТОЧКИ
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var card = e.data.movie;
            var render = e.object.activity.render();
            var type = card.first_air_date ? "tv" : "movie";
            
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });

})();
