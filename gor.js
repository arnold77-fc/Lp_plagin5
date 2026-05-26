(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // Стили только для трансформации карточек в горизонтальный формат
    var style = `
        /* Основной контейнер карточки */
        body .card.card--horizontal, 
        body .card--collection.card--horizontal {
            width: 25em !important; /* Ширина постера как на фото */
            height: 14em !important;
        }

        /* Настройка изображения внутри */
        body .card--horizontal .card__view {
            padding-bottom: 56.25% !important; /* Соотношение 16:9 */
            border-radius: 0.8em;
            overflow: hidden;
        }

        body .card--horizontal .card__img {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
        }

        /* Скрытие лишних деталей, если они мешают Aop.js */
        body .card--horizontal .card__title {
            font-size: 1.2em;
            margin-top: 0.5em;
        }
    `;

    // Функция внедрения стилей
    function injectStyles() {
        if (document.getElementById('horizontal-poster-mode')) return;
        var styleTag = document.createElement('style');
        styleTag.id = 'horizontal-poster-mode';
        styleTag.innerHTML = style;
        document.head.appendChild(styleTag);
    }

    // Принудительная установка класса horizontal для всех карточек в списках
    function applyHorizontalClass() {
        var items = document.querySelectorAll('.card:not(.card--horizontal)');
        items.forEach(function(card) {
            // Проверяем, не является ли это специфичным элементом, который трогать нельзя
            if (!card.classList.contains('card--person')) {
                card.classList.add('card--horizontal');
            }
        });
    }

    // Запуск
    function start() {
        injectStyles();
        
        // Наблюдатель за появлением новых карточек (скролл)
        var observer = new MutationObserver(function() {
            applyHorizontalClass();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        applyHorizontalClass();
    }

    if (window.appready) start();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') start();
        });
    }
})();
