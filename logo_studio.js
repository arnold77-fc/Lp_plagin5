(function () {
    'use strict';

    // 1. Инициализация хранилища настроек
    Lampa.Storage.setDefault('studio_logo_size', '1.2');
    Lampa.Storage.setDefault('studio_logo_saturation', '1.0');
    Lampa.Storage.setDefault('studio_logo_bg', true);
    Lampa.Storage.setDefault('studio_logo_gap', '10');

    // 2. Регистрация компонента (чтобы не было ошибки при открытии настроек)
    Lampa.Component.add('studio_settings', function (object) {
        var comp = new Lampa.InteractionMain(object);
        comp.create = function () {
            return comp.render();
        };
        return comp;
    });

    // 3. Добавление пункта в общее меню настроек
    Lampa.Settings.add({
        title: 'Студии',
        type: 'book',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z"/></svg>',
        component: 'studio_settings'
    });

    // 4. Параметры внутри меню
    Lampa.Params.select('studio_settings', {
        studio_logo_size: {
            name: 'Размер логотипа',
            values: { '0.8': 'Мини', '1.0': 'Стандарт', '1.2': 'Средний', '1.5': 'Большой' },
            default: '1.2'
        },
        studio_logo_saturation: {
            name: 'Насыщенность',
            values: { '0': 'Ч/Б', '0.5': 'Приглушенный', '1.0': 'Обычный', '1.5': 'Яркий', '2.0': 'Сочный' },
            default: '1.0'
        },
        studio_logo_bg: {
            name: 'Фоновая подложка',
            values: { true: 'Включена', false: 'Выключена' },
            default: true
        },
        studio_logo_gap: {
            name: 'Отступ между лого',
            values: { '5': 'Маленький', '10': 'Средний', '20': 'Большой' },
            default: '10'
        }
    }, 'Настройки отображения студий');

    // 5. Функция обновления стилей
    function updateStyles() {
        $('#ymod-studio-styles').remove();
        var size = Lampa.Storage.get('studio_logo_size') + 'em';
        var sat = Lampa.Storage.get('studio_logo_saturation');
        var gap = Lampa.Storage.get('studio_logo_gap') + 'px';
        var showBg = Lampa.Storage.get('studio_logo_bg');

        var bgStyle = (showBg === true || showBg === 'true') 
            ? 'background: rgba(255,255,255,0.08) !important; padding: 5px 12px !important; border-radius: 6px;' 
            : 'background: transparent !important; padding: 5px 0px !important;';

        var styles = `
            .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; }
            .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: ${gap}; }
            .rate--studio.studio-logo { 
                display: inline-flex; align-items: center; cursor: pointer; transition: transform 0.2s; 
                filter: saturate(${sat}); ${bgStyle}
            }
            .rate--studio.studio-logo img { height: ${size} !important; width: auto; object-fit: contain; min-width: 20px; }
            .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff; }
            @media screen and (orientation: portrait), screen and (max-width: 767px) {
                .plugin-uk-title-combined { align-items: center; text-align: center; }
                .studio-logos-container { justify-content: center; }
            }
        `;
        $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');
    }

    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            if (canvas.width === 0) return;
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

    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        updateStyles(); 

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 3).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                html += '<div class="rate--studio studio-logo" data-id="'+co.id+'" data-name="'+co.name+'">'+content+'</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        
        if(target.length) {
            target.after(wrap);
        } else {
            $(".full-start__left", render).prepend(wrap);
        }

        $('.studio-img-check', render).each(function() {
            if (this.complete) analyzeAndInvert(this, 0.85);
            else this.onload = function() { analyzeAndInvert(this, 0.85); };
        });

        $('.rate--studio', render).on('hover:enter', function () {
            Lampa.Activity.push({ url: 'movie', id: $(this).data('id'), title: $(this).data('name'), component: 'company', source: 'tmdb', page: 1 });
        });
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var type = (card.first_air_date || card.number_of_seasons) ? "tv" : "movie";
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            }, function(){});
        }
    });

})();
