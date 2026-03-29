(function () {
    'use strict';

    // Регистрация настроек в меню "Интерфейс"
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selectable" data-type="toggle" data-name="studio_logos_visible">' +
                '<div class="settings-param__name">Логотипы студий</div>' +
                '<div class="settings-param__value"></div>' +
                '</div>');

            var size = $('<div class="settings-param selectable" data-type="range" data-name="studio_logos_size" data-min="0.5" data-max="2" data-step="0.1">' +
                '<div class="settings-param__name">Размер логотипов</div>' +
                '<div class="settings-param__value"></div>' +
                '</div>');

            e.body.find('[data-name="interface_size"]').after(item, size);
        }
    });

    // Дефолтные значения, если настроек еще нет
    Lampa.Storage.setDefault('studio_logos_visible', true);
    Lampa.Storage.setDefault('studio_logos_size', '0.8');

    var styles = `
        .plugin-uk-title-combined { 
            margin-top: 10px; 
            margin-bottom: 5px; 
            display: flex; 
            flex-direction: column; 
        }
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            gap: 8px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            background: rgba(255,255,255,0.08);
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s ease; 
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.2) !important; 
            outline: 2px solid #fff;
        }
        .studio-logo img { 
            object-fit: contain; 
            filter: drop-shadow(0 0 2px rgba(0,0,0,0.5));
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    function analyzeAndInvert(img) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, 1, 1).data; 
            // Простая проверка: если картинка слишком темная, инвертируем
            if ((data[0] + data[1] + data[2]) / 3 < 50) {
                img.style.filter += " brightness(0) invert(1)";
            }
        } catch (e) {}
    }

    function renderStudiosTitle(render, movie) {
        if (!Lampa.Storage.get('studio_logos_visible')) return;
        
        $(".plugin-uk-title-combined", render).remove();
        
        var html = '';
        var size = Lampa.Storage.get('studio_logos_size') + 'em';

        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? `<img src="https://image.tmdb.org/t/p/h100${co.logo_path}" style="height:${size}" class="studio-img-check">` 
                    : `<span style="font-size:${size}">${co.name}</span>`;
                
                html += `<div class="rate--studio studio-logo selectable" data-id="${co.id}" data-name="${co.name}">${content}</div>`;
            });
        }

        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.studio-img-check', render).on('load', function() {
            analyzeAndInvert(this);
        });

        // Навигация пультом
        wrap.find('.selectable').on('hover:enter', function () {
            var id = $(this).data('id');
            Lampa.Activity.push({ 
                url: 'company/' + id, 
                title: 'Студия: ' + $(this).data('name'), 
                component: 'category_full', 
                source: 'tmdb', 
                card_type: 0 
            });
        });
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var card = e.data.movie;
            var render = e.object.activity.render();
            
            // Получаем расширенные данные (где есть production_companies)
            Lampa.Api.get((card.number_of_seasons ? 'tv' : 'movie') + '/' + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            }, function(){});
        }
    });

})();
