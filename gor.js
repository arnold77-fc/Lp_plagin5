(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // Функция применения режима
    function applyHorizontalMode() {
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        
        if (enabled) {
            document.body.classList.add('bit-horizontal-mode');
        } else {
            document.body.classList.remove('bit-horizontal-mode');
        }

        // Подменяем системную проверку Лампы на тип карточек
        var original = Lampa.Helper.isDisplayHorizontal;
        Lampa.Helper.isDisplayHorizontal = function() {
            if (Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true') return true;
            return original ? original.apply(this, arguments) : false;
        };
    }

    // Добавление стилей
    var styleId = 'horizontal-poster-style';
    if (!document.getElementById(styleId)) {
        var style = document.createElement('style');
        style.id = styleId;
        style.innerHTML = `
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
        `;
        document.head.appendChild(style);
    }

    // Регистрация настройки
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple" data-type="toggle">' +
                '<div class="settings-param__name">Горизонтальные постеры</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Включить формат 16:9 (как на фото)</div>' +
            '</div>');

            item.on('hover:enter', function () {
                var current = Lampa.Storage.get('horizontal_mode_simple', 'false');
                var newValue = current === 'true' ? 'false' : 'true';
                Lampa.Storage.set('horizontal_mode_simple', newValue);
                
                Lampa.Settings.update();
                applyHorizontalMode();

                // Принудительная перерисовка текущего экрана
                if (Lampa.Activity.active() && Lampa.Activity.active().activity.render) {
                    Lampa.Activity.active().activity.render();
                }
            });

            // Вставляем пункт в самое начало списка настроек интерфейса
            e.body.prepend(item);
        }
    });

    // Запуск
    function start() {
        applyHorizontalMode();
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
