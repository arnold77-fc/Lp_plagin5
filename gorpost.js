(function () {
    'use strict';

    // 1. Создаем настройку
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode" data-type="switch">' +
                '<div class="settings-param__name">Горизонтальные карточки</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Безопасный режим Landscape для Aop</div>' +
            '</div>');
            e.body.find('[data-name="card_view"]').after(item);
        }
    });

    function init() {
        // 2. CSS, который ПРИНУДИТЕЛЬНО растягивает фон (backdrop) на место постера
        // Это работает на уровне графики, не ломая скрипты Aop
        var style = `
            body.horizontal-on .card__view { 
                padding-bottom: 56.25% !important; 
                height: 0 !important; 
            }
            body.horizontal-on .card { 
                width: 19em !important; 
            }
            body.horizontal-on .card__img { 
                object-fit: cover !important; 
            }
            /* Фикс для слоев Aop */
            body.horizontal-on .agnative-card,
            body.horizontal-on .agnative-card__body {
                width: 100% !important;
                height: 100% !important;
            }
        `;
        
        if (!$('#hm-safe-style').length) {
            $('<style id="hm-safe-style">').html(style).appendTo('head');
        }

        function apply() {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                $('body').addClass('horizontal-on');
            } else {
                $('body').removeClass('horizontal-on');
            }
        }

        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'horizontal_mode') apply();
        });

        apply();

        // 3. Единственное безопасное действие: подмена ссылки на картинку
        Lampa.Card.onInstance(function (card) {
            if (card.data && (card.data.backdrop_path || card.data.img)) {
                var img = card.data.backdrop_path || card.data.img;
                var landscapeUrl = Lampa.TMDB.image('t/p/w500' + img);

                // Подменяем только если включено
                var enabled = Lampa.Storage.get('horizontal_mode', 'false');
                if (enabled === true || enabled === 'true') {
                    // Мы не лезем в render, мы просто меняем данные в объекте
                    card.data.poster_path = img; 
                    
                    // Ждем появления карточки и меняем src один раз
                    card.onVisible = function() {
                        var icon = card.render().find('.card__img');
                        if (icon.attr('src') !== landscapeUrl) {
                            icon.attr('src', landscapeUrl);
                        }
                    };
                }
            }
        });
    }

    // Запуск через задержку, чтобы Aop успел загрузить свои библиотеки
    if (window.appready) {
        setTimeout(init, 1000);
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(init, 1000);
        });
    }
})();
