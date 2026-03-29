(function () {
    'use strict';

    // 1. Инициализация хранилища (если пусто)
    var storage = {
        enabled: Lampa.Storage.get('studio_logos_enabled', 'true'),
        background: Lampa.Storage.get('studio_logos_background', 'true'),
        size: Lampa.Storage.get('studio_logos_size', '0.7em'),
        margin: Lampa.Storage.get('studio_logos_margin', '0.2em'),
        saturation: Lampa.Storage.get('studio_logos_saturation', '100%')
    };

    // 2. Стили
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

    // 3. Создание компонента настроек через Lampa.Params
    Lampa.Params.select('studio_logos_size', {'0.5em': '0.5em', '0.7em': '0.7em (Стандарт)', '0.9em': '0.9em', '1.1em': '1.1em'}, '0.7em');
    Lampa.Params.select('studio_logos_margin', {'0.1em': '0.1em', '0.2em': '0.2em', '0.4em': '0.4em'}, '0.2em');
    Lampa.Params.select('studio_logos_saturation', {'0%': '0%', '50%': '50%', '100%': '100%'}, '100%');

    // 4. Добавление в меню Настройки -> Интерфейс (самый стабильный путь)
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var title = $('<div class="settings-param title selector">Логотипи студій</div>');
            
            var btn_enabled = Lampa.Settings.main().render().find('[data-name="interface_size"]').clone().attr('data-name', 'studio_logos_enabled');
            btn_enabled.find('.settings-param__name').text('Увімкнути плагін');
            btn_enabled.find('.settings-param__descr').text('Відображати логотипи студій');
            btn_enabled.find('.settings-param__value').text(Lampa.Storage.get('studio_logos_enabled') == 'true' ? 'Так' : 'Ні');

            var btn_bg = btn_enabled.clone().attr('data-name', 'studio_logos_background');
            btn_bg.find('.settings-param__name').text('Підложка');
            btn_bg.find('.settings-param__descr').text('Напівпрозорий фон за логотипом');
            btn_bg.find('.settings-param__value').text(Lampa.Storage.get('studio_logos_background') == 'true' ? 'Так' : 'Ні');

            // Обработка кликов (переключатели Да/Нет)
            var toggle = function(name, btn) {
                var current = Lampa.Storage.get(name, 'true') == 'true';
                Lampa.Storage.set(name, !current);
                btn.find('.settings-param__value').text(!current ? 'Так' : 'Ні');
            };

            btn_enabled.on('hover:enter', function() { toggle('studio_logos_enabled', btn_enabled); });
            btn_bg.on('hover:enter', function() { toggle('studio_logos_background', btn_bg); });

            // Добавляем выбор размеров и прочего через стандартный Lampa.Select
            var createSelect = function(name, label, descr) {
                var btn = btn_enabled.clone().attr('data-name', name);
                btn.find('.settings-param__name').text(label);
                btn.find('.settings-param__descr').text(descr);
                btn.find('.settings-param__value').text(Lampa.Storage.get(name));
                
                btn.on('hover:enter', function(){
                    Lampa.Select.show({
                        title: label,
                        items: Lampa.Params.values[name],
                        onSelect: function(item){
                            Lampa.Storage.set(name, item.value);
                            btn.find('.settings-param__value').text(item.value);
                            Lampa.Controller.toggle('settings');
                        },
                        onBack: function(){ Lampa.Controller.toggle('settings'); }
                    });
                });
                return btn;
            };

            var btn_size = createSelect('studio_logos_size', 'Розмір лого', 'Виберіть розмір іконок');
            var btn_margin = createSelect('studio_logos_margin', 'Відступ між лого', 'Відстань між елементами');
            var btn_sat = createSelect('studio_logos_saturation', 'Насиченість', 'Кольорова гама логотипів');

            e.body.append(title);
            e.body.append(btn_enabled);
            e.body.append(btn_bg);
            e.body.append(btn_size);
            e.body.append(btn_margin);
            e.body.append(btn_sat);
            
            Lampa.Controller.enable('settings');
        }
    });

    // 5. Логика отрисовки на странице фильма
    function renderStudiosTitle(render, movie) {
        if (!render || Lampa.Storage.get('studio_logos_enabled') === 'false') return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('studio_logos_background') === 'true';
        var sizeEm = Lampa.Storage.get('studio_logos_size', '0.7em');
        var gapEm =
