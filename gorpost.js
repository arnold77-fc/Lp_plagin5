(function () {
    'use strict';

    // 1. Настройки
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode" data-type="switch">' +
                '<div class="settings-param__name">Горизонтальные карточки</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Режим Landscape (16:9). Совместимо с Aop.js</div>' +
            '</div>');
            e.body.find('[data-name="card_view"]').after(item);
        }
    });

    function init() {
        // 2. Стили, адаптированные под Aop.js
        var style = `
            body.horizontal-on .card { width: 19em !important; }
            body.horizontal-on .card__view { padding-bottom: 56.25% !important; height: 0 !important; }
            body.horizontal-on .card__img { object-fit: cover !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            
            /* Поддержка слоев Aop (Apple TV) */
            body.horizontal-on .agnative-card, 
            body.horizontal-on .agnative-card__body,
            body.horizontal-on .agnative-card__glare-host { 
                width: 100% !important; height: 100% !important; 
            }
        `;
        
        if (!$('#hm-style').length) $('<style id="hm-style">').html(style).appendTo('head');

        function applyMode() {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') $('body').addClass('horizontal-on');
            else $('body').removeClass('horizontal-on');
        }

        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'horizontal_mode') applyMode();
        });

        applyMode();

        // 3. Безопасная замена картинок (через замену атрибута, не трогая объект Card)
        Lampa.Card.onInstance(function (card) {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                if (card.data && card.data.backdrop_path) {
                    var newPic = Lampa.TMDB.image('t/p/w500' + card.data.backdrop_path);
                    
                    // Перехватываем момент отрисовки
                    var original_onVisible = card.onVisible;
                    card.onVisible = function() {
                        if (original_onVisible) original_onVisible();
                        
                        var imgElement = card.render().find('.card__img');
                        // Меняем картинку только если она еще не заменена
                        if (imgElement.length && imgElement.attr('src').indexOf(card.data.backdrop_path) === -1) {
                            imgElement.attr('src', newPic);
                        }
                    };
                }
            }
        });
    }

    // Запуск с задержкой, чтобы не мешать Aop.js инициализироваться
    if (window.appready) {
        setTimeout(init, 500);
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(init, 500);
        });
    }
})();
