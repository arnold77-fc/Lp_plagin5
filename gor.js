(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // 1. Добавляем стили для трансформации карточек
    var styleId = 'horizontal-poster-style';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
            /* Стили применяются только когда включен класс .bit-horizontal-mode */
            body.bit-horizontal-mode .card:not(.card--person) {
                width: 20em !important;
            }
            body.bit-horizontal-mode .card:not(.card--person) .card__view {
                padding-bottom: 56.25% !important;
                border-radius: 0.6em !important;
                overflow: hidden !important;
            }
            body.bit-horizontal-mode .card:not(.card--person) .card__img {
                object-fit: cover !important;
                top: 0 !important;
                height: 100% !important;
            }
            /* Совместимость с эффектами Apple TV (Aop.js) */
            body.bit-horizontal-mode.appletv-agnative-topnav .card {
                margin-bottom: 2em !important;
            }
        `;
        document.head.appendChild(style);
    }

    // 2. Логика переключения режима
    function applyMode() {
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        if (enabled) {
            document.body.classList.add('bit-horizontal-mode');
        } else {
            document.body.classList.remove('bit-horizontal-mode');
        }

        // Подменяем метод проверки горизонтальности для самой Лампы
        var original = Lampa.Helper.isDisplayHorizontal;
        Lampa.Helper.isDisplayHorizontal = function() {
            if (Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true') return true;
            return original.apply(this, arguments);
        };
    }

    // 3. Создание пункта в настройках (Интерфейс)
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple" data-type="toggle">' +
                '<div class="settings-param__name">Горизонтальные постеры</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Отображать карточки в формате 16:9 (Стиль Apple TV)</div>' +
            '</div>');

            item.on('hover:enter', function () {
                var current = Lampa.Storage.get('horizontal_mode_simple', 'false');
                var newValue = current === 'true' ? 'false' : 'true';
                Lampa.Storage.set('horizontal_mode_simple', newValue);
                Lampa.Settings.update();
                applyMode();
                
                // Перерисовываем текущий экран для мгновенного эффекта
                if (Lampa.Activity.active()) {
                    Lampa.Activity.active().activity.render();
                }
            });

            // Вставляем настройку после выбора типа карточек
            e.body.find('[data-name="card_view"]').after(item);
        }
    });

    // Запуск при загрузке приложения
    function start() {
        applyMode();
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
