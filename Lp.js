(function () {
    'use strict';

    // Ждем готовность Lampa, чтобы стили применились правильно
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            initCustomDesign();
        }
    });

    function initCustomDesign() {
        const style = document.createElement('style');
        style.id = 'custom-horizontal-mode-design';
        style.innerHTML = `
            /* Применяем только если активен Apple TV (Aop.js) */
            body.appletv-agnative-topnav .new-interface {
                /* Настройка ориентации карточек */
                --ni-card-w: 220px; 
                --ni-card-h: 330px;
            }

            body.appletv-agnative-topnav .new-interface-info__right {
                display: flex !important;
                flex-direction: column;
                justify-content: flex-start;
                padding-top: 20px;
            }

            /* Скрываем всё лишнее в инфоблоке */
            body.appletv-agnative-topnav .new-interface-info__description,
            body.appletv-agnative-topnav .new-interface-info__rate,
            body.appletv-agnative-topnav .new-interface-info__buttons,
            body.appletv-agnative-topnav .new-interface-info__genres,
            body.appletv-agnative-topnav .new-interface-info__age {
                display: none !important;
            }

            /* Настройка названия/логотипа */
            body.appletv-agnative-topnav .new-interface-info__title {
                font-size: 3em !important;
                font-weight: bold;
                margin-bottom: 10px;
                color: #fff;
            }
        `;
        document.head.appendChild(style);
        console.log('Custom Design: Инфоблок и ориентация применены');
    }
})();
