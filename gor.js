(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // Функция применения стиля
    function applyStyles() {
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        document.body.classList.toggle('bit-horizontal-mode', enabled);
        
        // Подмена метода, чтобы Лампа знала о нашем выборе
        Lampa.Helper.isDisplayHorizontal = function() {
            return Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        };
    }

    // Внедряем CSS один раз
    if (!document.getElementById('horiz-mode-css')) {
        var s = document.createElement('style');
        s.id = 'horiz-mode-css';
        s.innerHTML = `
            body.bit-horizontal-mode .card:not(.card--person) { width: 20em !important; }
            body.bit-horizontal-mode .card:not(.card--person) .card__view { padding-bottom: 56.25% !important; border-radius: 0.6em !important; overflow: hidden !important; }
            body.bit-horizontal-mode .card:not(.card--person) .card__img { object-fit: cover !important; top: 0 !important; height: 100% !important; }
        `;
        document.head.appendChild(s);
    }

    // Слушатель настроек
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            var target = e.body.find('.settings-param__name').filter(function() {
                return $(this).text().toLowerCase().indexOf('язык') !== -1;
            }).closest('.settings-param');

            if (target.length) {
                var isEnabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
                var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple">' +
                    '<div class="settings-param__name">Горизонтальные постеры</div>' +
                    '<div class="settings-param__value">' + (isEnabled ? 'Включено' : 'Выключено') + '</div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    var current = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
                    Lampa.Storage.set('horizontal_mode_simple', (!current).toString());
                    item.find('.settings-param__value').text(!current ? 'Включено' : 'Выключено');
                    applyStyles();
                });

                target.after(item);
            }
        }
    });

    // Ключевое изменение: следим за любой перерисовкой интерфейса
    // Если Aop.js сбрасывает настройки, мы тут же их возвращаем
    Lampa.Listener.follow('render', function () {
        applyStyles();
    });

    // Запуск при старте
    applyStyles();
})();
