(function () {
    'use strict';

    // 1. Инициализация хранилища (с проверкой на существование)
    var storage = {
        get: function(key, def) {
            var val = Lampa.Storage.get(key);
            return (val === null || val === undefined) ? def : val;
        },
        set: function(key, val) {
            Lampa.Storage.set(key, val);
        }
    };

    // Дефолтные настройки
    if (Lampa.Storage.get('ymod_studio_show_bg') === null) storage.set('ymod_studio_show_bg', true);
    if (!storage.get('ymod_studio_size')) storage.set('ymod_studio_size', '0.7');
    if (!storage.get('ymod_studio_position')) storage.set('ymod_studio_position', 'after_title');
    if (!storage.get('ymod_studio_saturation')) storage.set('ymod_studio_saturation', '1.0');

    // 2. Регистрация в меню
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/></svg>',
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
            values: { true: 'Показывать', false: 'Скрыть' },
            default: true
        },
        {
            title: 'Размер логотипа',
            name: 'ymod_studio_size',
            type: 'select',
            values: { '0.5': 'Маленький', '0.7': 'Средний', '1.0': 'Большой' },
            default: '0.7'
        }
    ];

    // 3. Стили
    var styles = `
        .ymod-studios { 
            display: flex; 
            flex-wrap: wrap; 
            gap: 10px; 
            margin: 15px 0; 
            opacity: 0; 
            transform: translateY(10px);
            transition: all 0.5s ease;
        }
        .ymod-studios.show { opacity: 1; transform: translateY(0); }
        .ymod-studio-item { 
            display: inline-flex; 
            align-items: center; 
            border-radius: 6px; 
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        .ymod-studio-item.focus { 
            background: rgba(255,255,255,0.2) !important; 
            transform: scale(1.05); 
        }
        .ymod-studio-item img { object-fit: contain; pointer-events: none; }
        .ymod-studio-text { color: #fff; font-weight: bold; font-size: 0.9em; }
    `;
    if (!$('#ymod-studio-style').length) $('head').append('<style id="ymod-studio-style">' + styles + '</style>');

    // 4. Логика отрисовки
    function injectStudios(render, companies) {
        render.find('.ymod-studios').remove();
        if (!companies || !companies.length) return;

        var pos = storage.get('ymod_studio_position', 'after_title');
        var showBg = storage.get('ymod_studio_show_bg', true);
        var size = storage.get('ymod_studio_size', '0.7') + 'em';

        var container = $('<div class="ymod-studios"></div>');
        
        companies.slice(0, 4).forEach(function(co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" style="height:'+size+'" />'
                : '<span class="ymod-studio-text">' + co.name + '</span>';
            
            var item = $('<div class="ymod-studio-item selector" data-id="'+co.id+'">' + content + '</div>');
            
            if (showBg) item.css({'background': 'rgba(255,255,255,0.1)', 'padding': '5px 10px'});
            
            item.on('hover:enter', function() {
                Lampa.Activity.push({
                    url: '', id: co.id, title: co.name, component: 'company', source: 'tmdb', page: 1
                });
            });

            container.append(item);
        });

        // Куда вставляем
        var target = render.find('.full-start__title, .full-start-new__title');
        if (pos === 'before_descr') target = render.find('.full-start__description, .full-start-new__description');
        if (pos === 'after_descr') target = render.find('.full-start__description, .full-start-new__description');

        if (pos === 'after_descr') target.after(container);
        else target.after(container); // По умолчанию после заголовка

        setTimeout(function() { container.addClass('show'); }, 100);
    }

    // 5. Основной слушатель
    Lampa.Listener.follow('full', function (e) {
        if (e.type === 'complite') {
            var movie = e.data.movie;
            var render = e.object.activity.render();
            
            // Пытаемся взять данные из TMDB через штатный API
            var path = (movie.number_of_seasons ? 'tv' : 'movie') + '/' + movie.id;
            
            Lampa.Api.sources.tmdb.get(path, {}, function(data) {
                if (data && data.production_companies) {
                    injectStudios(render, data.production_companies);
                }
            }, function() {
                console.log('Studio Plugin: Error fetching TMDB data');
            });
        }
    });

})();
