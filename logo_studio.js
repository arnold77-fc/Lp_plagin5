(function () {
    'use strict';

    // 1. Инициализация настроек в Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'plugins') {
            setTimeout(function () {
                var item = $('<div class="settings-param selector" data-type="toggle" data-name="ymod_studio_bg"><div class="settings-param__name">Показывать фон логотипов</div><div class="settings-param__value"></div></div>');
                $('.settings-param[data-name="plugins_inline"]').after(item);
                
                var size = $('<div class="settings-param selector" data-type="range" data-name="ymod_studio_size" data-min="0.5" data-max="2" data-step="0.1"><div class="settings-param__name">Размер логотипов</div><div class="settings-param__value"></div></div>');
                item.after(size);
                
                Lampa.Controller.add('settings_plugins', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(item.parent());
                        Lampa.Controller.make();
                    }
                });
            }, 10);
        }
    });

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
            gap: 8px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            border-radius: 6px; 
            transition: all 0.2s ease; 
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.3) !important; 
            outline: 2px solid #fff;
        }
        .studio-logo-text { 
            font-size: 0.9em; 
            font-weight: bold; 
            color: #fff !important; 
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Функция инверсии темных лого (для видимости на черном)
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
                if (data[i + 3] > 10) {
                    total++;
                    if ((data[i] + data[i+1] + data[i+2]) / 3 < 120) dark++;
                }
            }
            if (total > 0 && (dark / total) > 0.8) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        // Получаем значения из хранилища Lampa или ставим дефолт
        var showBg = Lampa.Storage.get('ymod_studio_bg', 'true') === 'true';
        var sizeEm = Lampa.Storage.get('ymod_studio_size', '0.7') + 'em';

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';

                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        // Применяем настройки стиля
        $('.rate--studio', render).css({
            'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
            'padding': '5px 10px'
        });
        $('.rate--studio img', render).css('height', sizeEm);

        // Проверка картинок
        $('.studio-img-check', render).each(function() {
            if (this.complete) analyzeAndInvert(this);
            else this.onload = function() { analyzeAndInvert(this); };
        });

        // Навигация (пульт)
        $('.rate--studio', render).on('hover:enter', function () {
            Lampa.Activity.push({ 
                url: '', 
                id: $(this).data('id'), 
                title: $(this).data('name'), 
                component: 'company', 
                source: 'tmdb', 
                page: 1 
            });
        });
    }

    // 5. Запуск
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            var type = movie.number_of_seasons ? "tv" : "movie";
            
            Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });
})();
