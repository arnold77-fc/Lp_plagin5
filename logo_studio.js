(function () {
    'use strict';

    // 1. Инициализация настроек в Storage (если их еще нет)
    var default_settings = {
        studio_logos_size: '1.2',
        studio_logos_height: '25',
        studio_logos_saturation: '100',
        studio_logos_background: 'true',
        studio_logos_place: 'after_title' // after_title или before_title
    };

    Object.keys(default_settings).forEach(function(key) {
        if (!Lampa.Storage.get(key)) Lampa.Storage.set(key, default_settings[key]);
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
            gap: 10px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            border-radius: 6px; 
            transition: all 0.2s ease; 
            cursor: pointer; 
        }
        .rate--studio.studio-logo img { 
            width: auto; 
            object-fit: contain; 
        }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Регистрация пункта настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'appearance') {
            var item = $('<div class="settings-param selector" data-type="toggle"><div class="settings-param__name">Логотипы студий</div><div class="settings-param__value">Настроить</div></div>');
            item.on('hover:enter', function () {
                Lampa.Settings.create({
                    title: 'Логотипы студий',
                    onBack: function() {
                        Lampa.Settings.main();
                    }
                }, [
                    {
                        title: 'Место расположения',
                        name: 'studio_logos_place',
                        type: 'select',
                        values: { 'after_title': 'После заголовка', 'before_title': 'Перед заголовком' },
                        default: 'after_title'
                    },
                    {
                        title: 'Высота (px)',
                        name: 'studio_logos_height',
                        type: 'select',
                        values: { '15': '15px', '20': '20px', '25': '25px', '30': '30px', '40': '40px' },
                        default: '25'
                    },
                    {
                        title: 'Масштаб контейнера',
                        name: 'studio_logos_size',
                        type: 'select',
                        values: { '0.8': 'Маленький', '1.0': 'Средний', '1.2': 'Большой', '1.5': 'Огромный' },
                        default: '1.2'
                    },
                    {
                        title: 'Насыщенность (%)',
                        name: 'studio_logos_saturation',
                        type: 'select',
                        values: { '0': 'Ч/Б', '50': 'Приглушенные', '100': 'Обычные', '150': 'Яркие' },
                        default: '100'
                    },
                    {
                        title: 'Подложка',
                        name: 'studio_logos_background',
                        type: 'select',
                        values: { 'true': 'Показывать', 'false': 'Скрыть' },
                        default: 'true'
                    }
                ]);
            });
            e.body.find('[data-name="appearance"]').after(item);
        }
    });

    // 4. Логика отрисовки
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_background') === 'true';
        var sizeHeight = Lampa.Storage.get('studio_logos_height') + 'px';
        var saturation = Lampa.Storage.get('studio_logos_saturation') + '%';
        var place = Lampa.Storage.get('studio_logos_place');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:'+sizeHeight+'" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span style="font-size: 12px; font-weight: bold;">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgStyle = showBg ? 'background: rgba(255,255,255,0.1); padding: 4px 10px;' : 'background: transparent; padding: 4px 0;';
        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container" style="filter: saturate('+saturation+')">' + html + '</div></div>');
        
        wrap.find('.rate--studio').css('cssText', bgStyle);

        var target = $(".full-start-new__title, .full-start__title", render);
        if (place === 'before_title') target.before(wrap);
        else target.after(wrap);

        // Клик
        wrap.find('.rate--studio').on('hover:enter', function () {
            Lampa.Activity.push({ url: 'movie', id: $(this).data('id'), title: $(this).data('name'), component: 'company', source: 'tmdb', page: 1 });
        });
    }

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var type = card.first_air_date ? "tv" : "movie";
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });

})();
