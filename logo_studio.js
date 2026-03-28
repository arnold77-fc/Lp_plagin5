(function () {
    'use strict';

    // 1. Инициализация настроек
    const storage_get = (key, def) => Lampa.Storage.get(key, def);
    
    if (storage_get('ymod_studio_show_bg') === null) Lampa.Storage.set('ymod_studio_show_bg', true);
    if (!storage_get('ymod_studio_size')) Lampa.Storage.set('ymod_studio_size', '0.7');
    if (!storage_get('ymod_studio_position')) Lampa.Storage.set('ymod_studio_position', 'after_title');
    if (!storage_get('ymod_studio_saturation')) Lampa.Storage.set('ymod_studio_saturation', '1.0');

    // 2. Меню настроек
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M0 0h24v24H0z" fill="none"/></svg>',
        name: 'ymod_studios_section'
    });

    Lampa.Settings.cache.ymod_studios_section = [
        {
            title: 'Расположение',
            name: 'ymod_studio_position',
            type: 'select',
            values: {
                'after_title': 'Под заголовком',
                'before_descr': 'Над описанием',
                'after_descr': 'После описания'
            },
            default: 'after_title'
        },
        {
            title: 'Фон подложки',
            name: 'ymod_studio_show_bg',
            type: 'select',
            values: {
                true: 'Показывать',
                false: 'Скрыть'
            },
            default: true
        },
        {
            title: 'Размер логотипа',
            name: 'ymod_studio_size',
            type: 'select',
            values: {
                '0.5': 'Маленький',
                '0.7': 'Средний',
                '1.0': 'Большой'
            },
            default: '0.7'
        },
        {
            title: 'Насыщенность',
            name: 'ymod_studio_saturation',
            type: 'select',
            values: {
                '0': 'Чёрно-белый',
                '0.5': 'Приглушенный',
                '1.0': 'Обычный'
            },
            default: '1.0'
        }
    ];

    // 3. Стили и Анимация
    var styles = `
        @keyframes studioFadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .plugin-uk-title-combined { 
            margin: 12px 0; 
            width: 100%; 
            display: flex; 
            flex-direction: column; 
            animation: studioFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
            gap: 12px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            border-radius: 8px; 
            transition: all 0.25s ease; 
            cursor: pointer;
            overflow: hidden;
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.25) !important; 
            transform: scale(1.08);
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        }
        .studio-logo img { max-width: 160px; object-fit: contain; }
        .studio-logo-text { font-size: 0.9em; font-weight: bold; color: #fff; padding: 2px 0; }
    `;
    if (!$('#ymod-studio-styles').length) $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 4. Отрисовка
    function renderStudios(render, movie) {
        if (!render || !movie.production_companies) return;
        render.find(".plugin-uk-title-combined").remove();

        var pos = Lampa.Storage.get('ymod_studio_position');
        var showBg = Lampa.Storage.get('ymod_studio_show_bg');
        var size = Lampa.Storage.get('ymod_studio_size') + 'em';
        
        var html = '';
        movie.production_companies.filter(c => c.logo_path || c.name).slice(0, 4).forEach(function (co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">' 
                : '<span class="studio-logo-text">' + co.name + '</span>';
            html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
        });

        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        
        // Поиск контейнера описания для позиционирования
        var descr = render.find('.full-start__description, .full-start-new__description');
        var title = render.find('.full-start__title, .full-start-new__title');

        if (pos === 'before_descr' && descr.length) descr.before(wrap);
        else if (pos === 'after_descr' && descr.length) descr.after(wrap);
        else title.after(wrap);

        // Применение визуальных настроек
        wrap.find('.rate--studio').css({
            'background': showBg ? 'rgba(255,255,255,0.1)' : 'transparent',
            'padding': showBg ? '6px 12px' : '0',
            'filter': 'saturate(' + Lampa.Storage.get('ymod_studio_saturation') + ')'
        });
        wrap.find('img').css('height', size);

        // Переход в компанию
        wrap.find('.rate--studio').on('hover:enter', function () {
            Lampa.Activity.push({
                url: '', id: $(this).data('id'), title: $(this).data('name'), 
                component: 'company', source: 'tmdb', page: 1
            });
        });
    }

    // 5. Слушатель
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            // Получаем расширенные данные через API (т.к. в превью компаний обычно нет)
            Lampa.Api.sources.tmdb.get((movie.number_of_seasons ? "tv/" : "movie/") + movie.id, {}, function (data) {
                renderStudios(render, data);
            }, function(){});
        }
    });
})();
