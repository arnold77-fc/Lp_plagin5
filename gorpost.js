(function () {
    'use strict';

    // Функция регистрации настроек
    function setupSettings() {
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name == 'interface') {
                var item = $('<div class="settings-param selector" data-name="horizontal_mode" data-type="switch">' +
                    '<div class="settings-param__name">Горизонтальные карточки</div>' +
                    '<div class="settings-param__value"></div>' +
                    '<div class="settings-param__descr">Landscape режим (16:9). Совместимо с Aop</div>' +
                '</div>');
                e.body.find('[data-name="card_view"]').after(item);
            }
        });
    }

    function init() {
        // 1. Добавляем стили (CSS). Это самая безопасная часть, она не дает Script Error.
        var style = `
            body.horizontal-on .card { width: 19em !important; }
            body.horizontal-on .card__view { padding-bottom: 56.25% !important; height: 0 !important; }
            body.horizontal-on .card__img { object-fit: cover !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            
            /* Адаптация слоев Aop.js */
            body.horizontal-on .agnative-card, 
            body.horizontal-on .agnative-card__body,
            body.horizontal-on .agnative-card__glare-host { 
                width: 100% !important; 
                height: 100% !important; 
            }
        `;
        
        if (!$('#hm-style').length) {
            $('<style id="hm-style">').html(style).appendTo('head');
        }

        // 2. Логика включения/выключения
        function apply() {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                document.body.classList.add('horizontal-on');
            } else {
                document.body.classList.remove('horizontal-on');
            }
        }

        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'horizontal_mode') apply();
        });

        apply();

        // 3. БЕЗОПАСНАЯ ПОДМЕНА. Мы используем только стандартные поля Lampa.
        Lampa.Card.onInstance(function (card) {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                if (card.data && card.data.backdrop_path) {
                    // Просто подменяем основной постер на фон в данных карточки
                    // Это происходит до того, как Aop.js начнет ее рисовать
                    card.data.poster_path = card.data.backdrop_path;
                }
            }
        });
    }

    // Запуск через глобальный обработчик ошибок, чтобы плагин не "вешал" систему
    try {
        setupSettings();
        if (window.appready) {
            setTimeout(init, 2000); // Большая пауза (2 сек) для полной загрузки Aop
        } else {
            Lampa.Listener.follow('app', function (e) {
                if (e.type === 'ready') setTimeout(init, 2000);
            });
        }
    } catch (err) {
        console.log('HorizontalMode Error: ', err);
    }
})();
