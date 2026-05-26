(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // Регистрация параметра
    Lampa.Params.select('horizontal_mode_simple', [
        { caption: 'Выключено', val: 'false' },
        { caption: 'Включено', val: 'true' }
    ], 'false');

    // Функция стилей
    function applyStyles() {
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
        
        var enabled = Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        document.body.classList.toggle('bit-horizontal-mode', enabled);
        
        // Подмена метода
        Lampa.Helper.isDisplayHorizontal = function() {
            return Lampa.Storage.get('horizontal_mode_simple', 'false') === 'true';
        };
    }

    // Вставка в настройки
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') {
            // Ищем элемент, внутри которого есть текст "Язык интерфейса"
            var target = e.body.find('.settings-param__name').filter(function() {
                return $(this).text().toLowerCase().indexOf('язык') !== -1;
            }).closest('.settings-param');

            if (target.length) {
                var item = $('<div class="settings-param selector" data-name="horizontal_mode_simple">' +
                    '<div class="settings-param__name">Горизонтальные постеры</div>' +
                    '<div class="settings-param__value"></div>' +
                    '</div>');

                item.on('hover:enter', function () {
                    Lampa.Select.show({
                        title: 'Горизонтальные постеры',
                        items: Lampa.Params.values('horizontal_mode_simple'),
                        onSelect: function (a) {
                            Lampa.Storage.set('horizontal_mode_simple', a.val);
                            Lampa.Settings.update();
                            applyStyles();
                        }
                    });
                });

                // Вставляем именно после найденного элемента
                target.after(item);
            }
        }
    });

    applyStyles();
})();
