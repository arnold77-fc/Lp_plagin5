(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // 1. Добавляем параметр в систему настроек Lampa
    // Это "правильный" способ, который не ломает навигацию пультом
    Lampa.Params.select('horizontal_mode_simple', [
        {
            caption: 'Выключено',
            val: 'false'
        },
        {
            caption: 'Включено',
            val: 'true'
        }
    ], 'false');

    // 2. Функция применения стилей
    function applyHorizontalMode() {
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        
        if (enabled) {
            document.body.classList.add('bit-horizontal-mode');
        } else {
            document.body.classList.remove('bit-horizontal-mode');
        }

        // Подменяем тип отображения для движка Lampa
        var original = Lampa.Helper.isDisplayHorizontal;
        Lampa.Helper.isDisplayHorizontal = function() {
            if (Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true') return true;
            return original ? original.apply(this, arguments) : false;
        };
    }

    // 3. CSS для постеров 16:9
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

    // 4. Вставка в меню настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple" data-type="select">' +
                '<div class="settings-param__name">Горизонтальные постеры</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Отображать карточки в формате 16:9</div>' +
            '</div>');

            // Слушаем изменение значения
            item.on('hover:enter', function () {
                Lampa.Select.show({
                    title: 'Горизонтальные постеры',
                    items: Lampa.Params.values('horizontal_mode_simple'),
                    onSelect: function (newVal) {
                        Lampa.Storage.set('horizontal_mode_simple', newVal.val);
                        Lampa.Settings.update();
                        applyHorizontalMode();
                        
                        // Перерисовываем интерфейс
                        if (Lampa.Activity.active() && Lampa.Activity.active().activity.render) {
                            Lampa.Activity.active().activity.render();
                        }
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('settings_interface');
                    }
                });
            });

            // Ищем пункт "Язык интерфейса" (language) и вставляем строго под ним
            var languageItem = e.body.find('[data-name="language"]');
            if (languageItem.length) {
                languageItem.after(item);
            } else {
                e.body.append(item);
            }
        }
    });

    // Запуск при старте
    if (window.appready) applyHorizontalMode();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') applyHorizontalMode();
        });
    }
})();
