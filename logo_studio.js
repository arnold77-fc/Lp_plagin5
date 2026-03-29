(function () {
    'use strict';

    // 1. Стили
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
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            vertical-align: middle; 
            border-radius: 8px; 
            transition: all 0.2s ease; 
            height: auto; 
            cursor: pointer; 
            position: relative;
            background: rgba(255,255,255,0.08);
            padding: 5px 12px;
            margin-right: 0.2em;
            margin-bottom: 5px;
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.25) !important; 
            outline: 2px solid #fff; 
            transform: scale(1.05); 
            z-index: 10;
        }
        .rate--studio.studio-logo img { 
            max-width: 200px; 
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

    // Инициализация хранилища
    function getStorage(key, def) {
        var v = Lampa.Storage.get(key);
        return (v === null || v === undefined) ? def : v;
    }

    // 2. Отрисовка в карточке
    function renderStudiosTitle(render, movie) {
        if (!render || !getStorage('studio_logo_enabled', true)) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = getStorage('studio_logo_backdrop', true);
        var maxCount = parseInt(getStorage('studio_logo_count', '3'));
        var sizeEm = getStorage('studio_logo_size', '0.7') + 'em';
        var gapEm = getStorage('studio_logo_margin', '0.2') + 'em';
        var saturation = getStorage('studio_logo_saturation', '100') / 100;

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, maxCount);
            companies.forEach(function (co, index) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" title="' + co.name + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';
                
                if (!showBg && index > 0) {
                    html += '<span style="color: rgba(255,255,255,0.4); margin: 0 ' + gapEm + '; font-size: 0.6em; display: inline-flex; align-items: center;">●</span>';
                }

                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        // Применяем настройки стиля
        $('.rate--studio', render).each(function() {
            var el = $(this);
            if (!showBg) el.css({'background':'transparent', 'padding':'5px 0', 'border':'none'});
            el.css({'margin-right': gapEm, 'filter': 'saturate(' + saturation + ')'});
            el.find('img').css('height', sizeEm);
        });

        // Клик/ОК - Поиск фильмов студии
        $('.rate--studio', render).on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            Lampa.Activity.push({
                url: '',
                title: 'Студия: ' + name,
                component: 'category_full',
                method: 'company',
                id: id,
                source: 'tmdb',
                page: 1
            });
        });
    }

    // 3. Официальная регистрация настроек
    function setupSettings() {
        // Создаем новый раздел в боковом меню настроек
        Lampa.Settings.register({
            name: 'studio_logos',
            type: 'item',
            title: 'Логотипы студий',
            icon: `<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/></svg>`
        });

        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'studio_logos') {
                var items = [
                    { title: 'Включить плагин', type: 'bool', name: 'studio_logo_enabled', value: true },
                    { title: 'Количество лого', type: 'select', name: 'studio_logo_count', value: '3', values: { '1':'1','2':'2','3':'3','5':'5' } },
                    { title: 'Подложка', type: 'bool', name: 'studio_logo_backdrop', value: true },
                    { title: 'Размер (em)', type: 'select', name: 'studio_logo_size', value: '0.7', values: { '0.5':'0.5','0.7':'0.7','1.0':'1.0' } },
                    { title: 'Насыщенность', type: 'select', name: 'studio_logo_saturation', value: '100', values: { '0':'Ч/Б','100':'100%','150':'150%' } }
                ];
                var html = Lampa.Settings.create(items);
                html.on('change', function (ev) { Lampa.Storage.set(ev.name, ev.value); });
                e.body.append(html);
            }
        });
    }

    // Запуск
    setupSettings();

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            Lampa.Api.sources.tmdb.get((card.first_air_date ? "tv" : "movie") + "/" + card.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });

})();
