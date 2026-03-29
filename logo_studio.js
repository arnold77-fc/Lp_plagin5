(function () {
    'use strict';

    // 1. Инициализация настроек по умолчанию
    Lampa.Storage.set('studio_logos_enabled', Lampa.Storage.get('studio_logos_enabled', 'true'));
    Lampa.Storage.set('studio_logos_background', Lampa.Storage.get('studio_logos_background', 'true'));
    Lampa.Storage.set('studio_logos_size', Lampa.Storage.get('studio_logos_size', '0.7em'));
    Lampa.Storage.set('studio_logos_margin', Lampa.Storage.get('studio_logos_margin', '0.2em'));
    Lampa.Storage.set('studio_logos_saturation', Lampa.Storage.get('studio_logos_saturation', '100%'));

    // 2. Стили (добавлены переменные для динамического размера)
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; display: flex; flex-direction: column; align-items: flex-start; width: 100%; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.2) !important; outline: 2px solid #fff; transform: scale(1.05); }
        .rate--studio.studio-logo img { max-width: 200px; width: auto; object-fit: contain; }
        .studio-logo-text { font-weight: bold; color: #fff !important; white-space: nowrap; }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 3. Добавление пункта в настройки Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'main') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="white"/></svg></div>' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');
            
            item.on('hover:enter', function () {
                Lampa.Settings.main().render().find('[data-component="studio_logos_settings"]').click();
            });
            
            e.body.find('[data-component="interface"]').after(item);
        }
    });

    // Создание компонента настроек
    Lampa.Component.add('studio_logos_settings', function (object) {
        var comp = new Lampa.Settings.component(object);
        
        comp.create = function () {
            this.add({
                name: 'studio_logos_enabled',
                type: 'bool',
                label: 'Увімкнути плагін',
                descr: 'Відображати логотипи студій',
                default: true
            });
            this.add({
                name: 'studio_logos_background',
                type: 'bool',
                label: 'Підложка',
                descr: 'Напівпрозорий фон за логотипом',
                default: true
            });
            this.add({
                name: 'studio_logos_size',
                type: 'select',
                label: 'Розмір лого',
                descr: 'Виберіть розмір іконок',
                values: {'0.5em': '0.5em', '0.7em': '0.7em (Стандарт)', '0.9em': '0.9em', '1.1em': '1.1em'},
                default: '0.7em'
            });
            this.add({
                name: 'studio_logos_margin',
                type: 'select',
                label: 'Відступ між лого',
                descr: 'Відстань між елементами',
                values: {'0.1em': '0.1em', '0.2em': '0.2em', '0.4em': '0.4em'},
                default: '0.2em'
            });
            this.add({
                name: 'studio_logos_saturation',
                type: 'select',
                label: 'Насиченість',
                descr: 'Кольорова гама логотипів',
                values: {'0%': '0%', '50%': '50%', '100%': '100%'},
                default: '100%'
            });
        };
        return comp;
    });

    // 4. Логика отрисовки (использует сохраненные настройки)
    function renderStudiosTitle(render, movie) {
        if (!render || Lampa.Storage.get('studio_logos_enabled') === 'false') return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_background') === 'true';
        var sizeEm = Lampa.Storage.get('studio_logos_size');
        var gapEm = Lampa.Storage.get('studio_logos_margin');
        var saturation = Lampa.Storage.get('studio_logos_saturation');

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, 4).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text" style="font-size:'+sizeEm+'">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgStyle = showBg ? 'background: rgba(255,255,255,0.1); padding: 5px 10px; margin-right: '+gapEm+';' : 'margin-right: '+gapEm+';';
        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', wrap).attr('style', bgStyle + 'filter: saturate(' + saturation + ');');
        $('.rate--studio img', wrap).css('height', sizeEm);

        // Навигация пультом
        wrap.find('.selector').on('hover:enter', function () {
            var id = $(this).data('id');
            Lampa.Activity.push({ url: 'company/' + id, title: $(this).data('name'), component: 'category_full', source: 'tmdb', card_type: 0 });
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
