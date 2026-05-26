(function () {
    'use strict';

    function startPlugin() {
        console.log('HorizontalMode: Ultra-Lite version (Aop compatible)');

        // 1. Стили для горизонтального вида
        const style = `
            /* Изменяем пропорции карточки под Landscape */
            body.horizontal-mode .card { 
                width: 19em !important; 
            }
            body.horizontal-mode .card__view { 
                padding-bottom: 56.25% !important; /* Формат 16:9 */
            }
            body.horizontal-mode .card__img { 
                object-fit: cover !important; 
            }
            
            /* Убираем лишние отступы, чтобы карточки стояли ровно */
            body.horizontal-mode .items__line {
                margin-bottom: 1em !important;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.innerHTML = style;
        document.head.appendChild(styleElement);

        // Включаем режим
        document.body.classList.add('horizontal-mode');

        // 2. Логика подмены картинок
        Lampa.Card.onInstance((card) => {
            // Берем backdrop (горизонтальное фото) вместо обычного постера
            if (card.data && (card.data.backdrop_path || card.data.img)) {
                const imgPath = card.data.backdrop_path || card.data.img;
                const url = Lampa.TMDB.image('t/p/w500' + imgPath);
                
                // Срабатывает только когда карточка отрисована (безопасно для процессора)
                card.onVisible = () => {
                    const img = card.render().find('.card__img')[0];
                    if (img && img.src !== url) {
                        img.src = url;
                        // Защита от "битых" картинок
                        img.onerror = () => {
                            if (img.src !== url) img.src = url;
                        };
                    }
                };
            }
        });
    }

    // Запуск строго после инициализации Lampa
    if (window.appready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') startPlugin();
        });
    }
})();
