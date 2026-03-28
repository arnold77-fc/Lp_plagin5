(function () {
    'use strict';

    // 1. Инициализация хранилища (Storage)
    var default_settings = {
        studio_logos_size: '1.2',
        studio_logos_height: '25',
        studio_logos_saturation: '100',
        studio_logos_background: 'true',
        studio_logos_place: 'after_title'
    };

    Object.keys(default_settings).forEach(function(key) {
        if (Lampa.Storage.get(key) === null) Lampa.Storage.set(key, default_settings[key]);
    });

    // 2. Стили
    var styles = `
        .plugin-uk-title-combined { margin: 10px 0; width: 100%; display: flex; flex-direction: column; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
        .rate--studio.studio-logo { 
            display: inline-flex; align-items: center; border-radius: 6px; 
            transition: all 0.2s ease; cursor: pointer; 
        }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style>' + styles + '</style>');

    // 3. ДОБАВЛЕНИЕ В ОСНОВНОЕ ПРАВОЕ МЕНЮ
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'main') { // Если открыто главное меню настроек
            var item = $('<div class="settings-param selector" data-type="toggle">' +
                            '<div class="settings-param__name">Логотипы студий</div>' +
                            '<div class="settings-param__value">Настроить</div>' +
                         '</div>');

            item.on('hover:enter', function () {
                Lampa.Settings.create({
                    title: 'Логотипы студий',
                    onBack: function() {
                        Lampa.Settings.main(); // Возврат в главное меню
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
                        title: 'Высота логотипа',
                        name: 'studio_logos_height',
                        type: 'select',
                        values: { '15': '15px', '20': '20px', '25': '25px', '30': '30px', '40': '40px' },
                        default: '25'
                    },
                    {
                        title: 'Насыщенность (%)',
                        name: 'studio_logos_saturation',
                        type: 'select',
                        values: { '0': 'Ч/Б', '50': 'Приглушенные', '100': 'Обычные', '150': 'Яркие' },
                        default: '100'
                    },
                    {
                        title: 'Подложка (фон)',
                        name: 'studio_logos_background',
                        type: 'select',
                        values: { 'true': 'Включена', 'false': 'Выключена' },
                        default: 'true'
                    }
                ]);
            });
            // Вставляем наш пункт после раздела "Интерфейс" (или в конец)
            e.body.find('[data-name="appearance"]').after(item);
        }
    });

    // 4. Логика отображения
    function renderStudios(render, movie) {
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
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:'+sizeHeight+'; object-fit: contain;" crossorigin="anonymous">' 
                    : '<span style="font-size: 12px; font-weight: bold; padding: 2px 5px;">' + co.name + '</span>';
                
                var bgStyle = showBg ? 'background: rgba(255,255,255,0.1); padding: 5px 10px;' : 'background: transparent;';
                html += '<div class="rate--studio studio-logo" data-id="'+co.id+'" data-name="'+co.name+'" style="'+bgStyle+' filter: saturate('+saturation+')">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        
        if (place === 'before_title') target.before(wrap);
        else target.after(wrap);

        wrap.find('.rate--studio').on('hover:enter', function () {
            Lampa.Activity.push({ url: 'movie', id: $(this).data('id'), title: $(this).data('name'), component: 'company', source: 'tmdb', page: 1 });
        });
    }

    // 5. Запуск
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var type = card.first_air_date ? "tv" : "movie";
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudios(e.object.activity.render(), data);
            });
        }
    });

})();
