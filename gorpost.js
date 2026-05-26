(function () {
    'use strict';

    // 1. Регистрация настройки
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            var item = $('<div class="settings-param selector" data-name="horizontal_mode" data-type="switch">' +
                '<div class="settings-param__name">Горизонтальные карточки</div>' +
                '<div class="settings-param__value"></div>' +
                '<div class="settings-param__descr">Landscape формат. Совместимо с Aop</div>' +
            '</div>');
            e.body.find('[data-name="card_view"]').after(item);
        }
    });

    function startPlugin() {
        // 2. CSS специально адаптированный под слои Aop.js
        var style = `
            body.horizontal-on .card { width: 19em !important; }
            body.horizontal-on .card__view { padding-bottom: 56.25% !important; height: 0 !important; }
            body.horizontal-on .card__img { object-fit: cover !important; position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
            
            /* Фикс для Aop.js: заставляем его подстроиться под 16:9 */
            body.horizontal-on .agnative-card, 
            body.horizontal-on .agnative-card__body,
            body.horizontal-on .agnative-card__glare-host { 
                width: 100% !important; 
                height: 100% !important; 
                border-radius: inherit !important;
            }
        `;
        
        if (!$('#hm-style').length) {
            $('<style id="hm-style">').html(style).appendTo('head');
        }

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

        // 3. Безопасная замена картинок через встроенный механизм Lampa
        Lampa.Card.onInstance(function (card) {
            var enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                if (card.data && (card.data.backdrop_path || card.data.img)) {
                    var imgPath = card.data.backdrop_path || card.data.img;
                    var newPic = Lampa.TMDB.image('t/p/w500' + imgPath);
                    
                    // Меняем только если это TMDB или есть картинка
                    if (imgPath) {
                        card.data.poster_path = imgPath; // Обманываем движок Lampa
                        
                        var original_render = card.render;
                        card.render = function() {
                            var r = original_render.apply(card);
                            r.find('.card__img').attr('src', newPic);
                            return r;
                        };
                    }
                }
            }
        });
    }

    // Запуск: ждем когда Lampa и Aop полностью загрузятся
    if (window.appready) {
        setTimeout(startPlugin, 500);
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') setTimeout(startPlugin, 500);
        });
    }
})();
