(function () {
    'use strict';

    // 1. Стили
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; outline: 2px solid #fff; transform: scale(1.05); }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; }
        @media screen and (orientation: portrait) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 2. Инициализация настроек (как на скриншоте)
    Lampa.Storage.setDefault('studio_logos_enabled', true);
    Lampa.Storage.setDefault('studio_logos_background', true);
    Lampa.Storage.setDefault('studio_logos_size', '0.7');
    Lampa.Storage.setDefault('studio_logos_margin', '0.2');
    Lampa.Storage.setDefault('studio_logos_saturation', '100');

    // 3. Функция инверсии темных логотипов
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
                if (data[i + 3] < 10) continue;
                total++;
                if ((data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000 < 120) dark++;
            }
            if (total > 0 && (dark / total) > 0.85) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 4. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (!Lampa.Storage.get('studio_logos_enabled') || !movie.production_companies) return;
        
        $(".plugin-uk-title-combined", render).remove();

        var showBg = Lampa.Storage.get('studio_logos_background');
        var size = Lampa.Storage.get('studio_logos_size') + 'em';
        var margin = Lampa.Storage.get('studio_logos_margin') + 'em';
        var sat = Lampa.Storage.get('studio_logos_saturation') / 100;

        var html = '';
        movie.production_companies.slice(0, 4).forEach(function (co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" class="studio-img-check" crossorigin="anonymous">' 
                : '<span class="studio-logo-text">' + co.name + '</span>';
            
            html += '<div class="rate--studio studio-logo selector" data-id="'+co.id+'" data-name="'+co.name+'">' + content + '</div>';
        });

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        $(".full-start-new__title, .full-start__title", render).after(wrap);

        // Применяем стили из настроек
        $('.rate--studio', wrap).css({
            'padding': showBg ? '5px 12px' : '5px 0',
            'background': showBg ? 'rgba(255,255,255,0.08)' : 'transparent',
            'margin-right': margin,
            'filter': 'dashed' // затычка для конкатенации ниже
        }).css('filter', 'saturate(' + sat + ')');
        
        $('.rate--studio img', wrap).css('height', size);

        $('.studio-img-check', wrap).on('load', function() { analyzeAndInvert(this); });
        
        // Клик (переход к фильмам студии)
        $('.rate--studio', wrap).on('hover:enter', function () {
            Lampa.Activity.push({ url: 'company/' + $(this).data('id'), title: $(this).data('name'), component: 'category_full', source: 'tmdb', card_type: 0 });
        });
    }

    // 5. Добавление пункта в Настройки Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            var btn = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/></svg></div>' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');
            btn.on('hover:enter', function () {
                Lampa.Settings.setup(); 
                // Создаем вложенное меню настроек
                var menu = [
                    { title: 'Увімкнути плагін', type: 'bool', name: 'studio_logos_enabled', value: true },
                    { title: 'Підложка', type: 'bool', name: 'studio_logos_background', value: true },
                    { title: 'Розмір лого', type: 'select', name: 'studio_logos_size', value: '0.7', values: {'0.5':'0.5em','0.7':'0.7em (Стандарт)','0.9':'0.9em','1.2':'1.2em'} },
                    { title: 'Відступ між лого', type: 'select', name: 'studio_logos_margin', value: '0.2', values: {'0.1':'0.1em','0.2':'0.2em','0.4':'0.4em'} },
                    { title: 'Насиченість', type: 'select', name: 'studio_logos_saturation', value: '100', values: {'0':'Ч/Б','50':'Приглушена','100':'100%','150':'Яскрава'} }
                ];
                
                Lampa.Select.show({
                    title: 'Налаштування логотипів',
                    items: menu,
                    onSelect: function(item) {
                        Lampa.Storage.set(item.name, item.value);
                        Lampa.Select.show(this); // Переоткрываем для удобства
                    },
                    onBack: function() { Lampa.Controller.toggle('settings'); }
                });
            });
            $('.settings__content', e.node).append(btn);
        }
    });

    // 6. Слушатель карточки
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            Lampa.Api.sources.tmdb.get((e.data.movie.number_of_seasons ? 'tv' : 'movie') + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });
})();
