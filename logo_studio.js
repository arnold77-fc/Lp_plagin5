(function () {
    'use strict';

    // 1. Настройки (без изменений)
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>',
        name: 'studio_logos',
        parent: 'interface'
    });

    // ... (остальные настройки оставляем как есть) ...
    // Добавьте сюда ваши Lampa.Settings.add для studio_logo_size, saturation и т.д.

    // 2. Стили (без изменений)
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; width: 100%; display: flex; flex-direction: column; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .studio-logo { display: inline-flex; align-items: center; border-radius: 6px; transition: all 0.2s; cursor: pointer; }
        .studio-logo.focus { background: rgba(255,255,255,0.2) !important; transform: scale(1.05); }
        .studio-logo img { width: auto; max-width: 150px; }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Функция анализа (без изменений)
    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                total++;
                if ((data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000 < 120) dark++;
            }
            if (total > 0 && (dark / total) >= threshold) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (!render || !movie || !movie.production_companies) return;
        
        $(".plugin-uk-title-combined", render).remove();
        
        var sizeEm = Lampa.Storage.get('studio_logo_size', '0.7em');
        var saturation = Lampa.Storage.get('studio_logo_saturation', '1');
        var bgType = Lampa.Storage.get('studio_logo_bg', 'glass');
        var gapEm = Lampa.Storage.get('studio_logo_margin', '0.3em');

        var bgStyle = bgType === 'glass' ? 'background: rgba(255,255,255,0.08); padding: 4px 8px;' : 
                      bgType === 'solid' ? 'background: rgba(0,0,0,0.4); padding: 4px 8px;' : '';

        var html = '';
        movie.production_companies.slice(0, 4).forEach(function (co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check" style="height:'+sizeEm+'">' 
                : '<span style="font-size:0.8em">' + co.name + '</span>';
            
            html += '<div class="studio-logo selectors-item" data-id="' + co.id + '" data-name="' + co.name + '" style="margin-right:' + gapEm + '; ' + bgStyle + ' filter: saturate(' + saturation + ');">' + content + '</div>';
        });

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = render.find('.full-start-new__title, .full-start__title');
        if (target.length) target.after(wrap);

        // Инверсия для темных логотипов
        wrap.find('.studio-img-check').each(function() {
            if (this.complete) analyzeAndInvert(this, 0.85);
            else this.onload = function() { analyzeAndInvert(this, 0.85); };
        });

        // Клик/Enter на логотип
        wrap.find('.studio-logo').on('hover:enter', function () {
            Lampa.Activity.push({
                url: '',
                title: $(this).data('name'),
                component: 'category_full', // Используем стандартный компонент категорий
                id: $(this).data('id'),
                source: 'tmdb',
                card_type: 'company',
                page: 1
            });
        });
    }

    // 5. Исправленный слушатель событий
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            
            // КОРРЕКТНЫЙ ВЫЗОВ API
            // Используем метод из сетевого модуля Lampa, чтобы подтянулись ключи TMDB
            var network = new Lampa.Reguest();
            var type = movie.number_of_seasons ? 'tv' : 'movie';
            var url = 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&language=' + Lampa.Storage.get('language','ru');

            network.silent(url, function(data) {
                if (data && data.production_companies) {
                    renderStudiosTitle(render, data);
                }
            });
        }
    });
})();
