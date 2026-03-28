(function () {
    'use strict';

    // 1. Установка значений по умолчанию
    Lampa.Storage.setDefault('ymod_studios_size', '0.7');
    Lampa.Storage.setDefault('ymod_studios_show_bg', true);

    // 2. Стили
    var styles = `
        .plugin-uk-title-combined { 
            margin-top: 10px; 
            margin-bottom: 5px; 
            width: 100%; 
            display: flex; 
            flex-direction: column; 
        }
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            gap: 10px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            border-radius: 8px; 
            transition: all 0.2s ease; 
            cursor: pointer; 
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.25) !important; 
            outline: 2px solid #fff;
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
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Регистрация настроек (чтобы они появились в правом меню)
    Lampa.Settings.add({
        title: 'Логотипы студий',
        name: 'ymod_studios_group',
        type: 'scroll', // Группировка
        section: 'interface',
        icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z" fill="currentColor"/></svg>',
        onRender: function(item) {
            // Добавляем выбор размера
            Lampa.Settings.add({
                title: 'Размер логотипов',
                name: 'ymod_studios_size',
                type: 'select',
                values: {
                    '0.5': 'Крошечный',
                    '0.7': 'Обычный',
                    '0.9': 'Крупный',
                    '1.2': 'Огромный'
                },
                default: '0.7',
                section: 'interface'
            });

            // Переключатель фона
            Lampa.Settings.add({
                title: 'Фоновая подложка',
                name: 'ymod_studios_show_bg',
                type: 'bool',
                default: true,
                section: 'interface'
            });
        }
    });

    // 4. Логика инверсии цвета
    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || 100;
            canvas.height = img.naturalHeight || 50;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                total++;
                if ((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 < 125) dark++;
            }
            if (total > 0 && (dark / total) >= threshold) img.style.filter = "brightness(0) invert(1)";
        } catch (e) {}
    }

    // 5. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('ymod_studios_show_bg');
        var sizeEm = Lampa.Storage.get('ymod_studios_size') + 'em';

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? `<img src="https://image.tmdb.org/t/p/h100${co.logo_path}" crossorigin="anonymous" class="studio-img-check">` 
                    : `<span class="studio-logo-text">${co.name}</span>`;
                
                html += `<div class="rate--studio studio-logo ymod-studio-item" data-id="${co.id}" data-name="${co.name}">${content}</div>`;
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).css({
            'background': showBg ? 'rgba(255,255,255,0.08)' : 'transparent',
            'padding': showBg ? '5px 12px' : '5px 0'
        });
        $('.rate--studio img', render).css('height', sizeEm);

        $('.studio-img-check', render).each(function() {
            var img = this;
            if (img.complete) analyzeAndInvert(img, 0.8);
            else img.onload = function() { analyzeAndInvert(img, 0.8); };
        });

        $('.rate--studio', render).on('hover:enter', function () {
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

    // 6. Слушатель
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
