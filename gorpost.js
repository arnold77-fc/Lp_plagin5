(function () {
    'use strict';

    // 1. Добавляем настройки в меню Lampa
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'interface') {
            e.body.find('[data-name="card_view"]').after(`
                <div class="settings-param selector" data-name="horizontal_mode" data-type="switch">
                    <div class="settings-param__name">Горизонтальные карточки</div>
                    <div class="settings-param__value"></div>
                    <div class="settings-param__descr">Отображать постеры в формате 16:9 (Landscape)</div>
                </div>
            `);
        }
    });

    function startPlugin() {
        // Стили
        const style = `
            body.horizontal-mode-on .card { width: 19em !important; }
            body.horizontal-mode-on .card__view { padding-bottom: 56.25% !important; }
            body.horizontal-mode-on .card__img { object-fit: cover !important; }
            body.horizontal-mode-on .agnative-card { width: 100% !important; height: 100% !important; }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = 'horizontal-mode-style';
        styleElement.innerHTML = style;
        document.head.appendChild(styleElement);

        // Функция проверки состояния
        function updateState() {
            const enabled = Lampa.Storage.get('horizontal_mode', 'false');
            if (enabled === true || enabled === 'true') {
                document.body.classList.add('horizontal-mode-on');
            } else {
                document.body.classList.remove('horizontal-mode-on');
            }
        }

        // Следим за изменением настройки
        Lampa.Storage.listener.follow('change', function (e) {
            if (e.name == 'horizontal_mode') updateState();
        });

        updateState();

        // Логика подмены картинок (работает только если режим включен)
        Lampa.Card.onInstance((card) => {
            card.onVisible = () => {
                const isEnabled = Lampa.Storage.get('horizontal_mode', 'false');
                if ((isEnabled === true || isEnabled === 'true') && card.data && (card.data.backdrop_path || card.data.img)) {
                    
                    const imgPath = card.data.backdrop_path || card.data.img;
                    const url = Lampa.TMDB.image('t/p/w500' + imgPath);
                    const render = card.render();
                    const img = render.find('.card__img')[0];
                    
                    if (img && img.src !== url) {
                        img.src = url;
                        img.onload = () => {
                            // Сигнал для Aop.js
                            img.dispatchEvent(new CustomEvent('imgLoaded', { bubbles: true }));
                            if (card.enabled && card.enabled()) render.trigger('hover:enter');
                        };
                    }
                }
            };
        });
    }

    // Запуск
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
