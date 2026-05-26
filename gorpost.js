(function () {
    'use strict';

    // 1. Добавляем настройку в меню
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode" data-type="switch">' +
                '<div class="settings-param__name">Горизонтальные карточки</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Landscape формат (16:9) + совместимость с Aop</div>' +
            '</div>');
            e.body.find('[data-name="card_view"]').after(item);
            Lampa.Controller.add('settings_interface', {
                toggle: function () {
                    Lampa.Controller.collectionSet(e.body);
                    Lampa.Controller.render();
                }
            });
        }
    });

    function init() {
        // 2. CSS - делаем его максимально совместимым с Aop
        var style = `
            body.horizontal-on .card { width: 19em !important; transition: transform 0.2s ease !important; }
            body.horizontal-on .card__view { padding-bottom: 56.25% !important; height: 0 !important; }
            body.horizontal-on .card__img { object-fit: cover !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            /* Фикс для Aop, чтобы блик не тормозил */
            body.horizontal-on .agnative-card { width: 100% !important; height: 100% !important; pointer-events: none; }
        `;
        $('<style id="hm-style">').html(style).appendTo('head');

        function applyMode() {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                $('body').addClass('horizontal-on');
            } else {
                $('body').removeClass('horizontal-on');
            }
        }

        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'horizontal_mode') applyMode();
        });

        applyMode();

        // 3. Безопасная подмена картинок БЕЗ таймеров
        Lampa.Card.onInstance(function (card) {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                if (card.data && (card.data.backdrop_path || card.data.img)) {
                    var img = card.data.backdrop_path || card.data.img;
                    // Используем чуть меньшее разрешение w500 для скорости
                    card.background = Lampa.TMDB.image('t/p/w500' + img);
                    
                    // Переписываем стандартный метод отрисовки картинки Lampa
                    var original_onVisible = card.onVisible;
                    card.onVisible = function() {
                        if (original_onVisible) original_onVisible();
                        var image = card.render().find('.card__img');
                        if (image.length && image.attr('src') !== card.background) {
                            image.attr('src', card.background);
                        }
                    };
                }
            }
        });
    }

    // Запуск строго через штатный слушатель Lampa
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            setTimeout(init, 100); // Небольшая задержка, чтобы Aop успел создать свои объекты
        }
    });
})();
