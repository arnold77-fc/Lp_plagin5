(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // 1. Функция применения стиля
    function applyHorizontalMode() {
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        
        if (enabled) {
            document.body.classList.add('bit-horizontal-mode');
        } else {
            document.body.classList.remove('bit-horizontal-mode');
        }

        // Заставляем Lampa отдавать горизонтальный тип карточек
        var original = Lampa.Helper.isDisplayHorizontal;
        Lampa.Helper.isDisplayHorizontal = function() {
            if (Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true') return true;
            return original ? original.apply(this, arguments) : false;
        };
    }

    // 2. CSS для постеров 16:9
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

    // 3. Регистрация настройки в меню Интерфейс
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple" data-type="toggle">' +
                '<div class="settings-param__name">Горизонтальные постеры</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Отображать карточки в формате 16:9</div>' +
            '</div>');

            item.on('hover:enter', function () {
                var current = Lampa.Storage.get('horizontal_mode_simple', 'false');
                var newValue = current === 'true' ? 'false' : 'true';
                Lampa.Storage.set('horizontal_mode_simple', newValue);
                
                Lampa.Settings.update();
                applyHorizontalMode();

                // Обновляем экран
                if (Lampa.Activity.active() && Lampa.Activity.active().activity.render) {
                    Lampa.Activity.active().activity.render();
                }
            });

            // Ищем пункт "Язык интерфейса" и вставляем ПОСЛЕ него
            var languageItem = e.body.find('[data-name="language"]');
            if (languageItem.length) {
                languageItem.after(item);
            } else {
                // Если вдруг не нашли (из-за Aop.js), кидаем в начало
                e.body.prepend(item);
            }
        }
    });

    // Запуск логики при старте
    if (window.appready) applyHorizontalMode();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') applyHorizontalMode();
        });
    }
})();
