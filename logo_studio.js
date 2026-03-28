(function () {
    'use strict';

    // ================= НАСТРОЙКИ ЛОГОТИПОВ =================
    var config = {
        size: '1.2em',        // Размер (высота) логотипа (например: 1.2em, 25px)
        saturation: '1.5',    // Насыщенность (1 - стандарт, 2 - очень сочно, 0 - ч/б)
        gap: '10px',          // Отступ между логотипами
        showBg: true,         // Подложка: true - включить, false - выключить
        bgColor: 'rgba(255,255,255,0.08)', // Цвет и прозрачность подложки
        borderRadius: '6px'   // Скругление углов подложки
    };
    // =======================================================

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
            gap: ${config.gap}; 
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            vertical-align: middle; 
            border-radius: ${config.borderRadius}; 
            transition: all 0.2s ease; 
            height: auto; 
            cursor: pointer;
            filter: saturate(${config.saturation});
        }
        .rate--studio.studio-logo img { 
            height: ${config.size} !important;
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

    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, 3);
            companies.forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" title="' + co.name + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo ymod-studio-item" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgCSS = config.showBg 
            ? `background: ${config.bgColor} !important; padding: 5px 12px !important;` 
            : 'background: transparent !important; border: none !important; padding: 5px 0px !important;';

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).attr('style', function(i, s) { return (s || '') + bgCSS; });

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
            var type = (card.first_air_date || card.number_of_seasons) ? "tv" : "movie";
            
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });

})();
