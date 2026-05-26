(function () {
    'use strict';

    function CleanHeroBanner() {
        var banner;
        var lastImg = '';

        // Создаем элементы баннера и стили
        this.init = function () {
            if ($('#clean-hero-banner').length) return;

            // HTML структура баннера
            banner = $(`
                <div id="clean-hero-banner">
                    <div class="ch-image"></div>
                    <div class="ch-mask"></div>
                </div>
            `);

            $('body').append(banner);

            // CSS стили
            var style = `
                <style id="clean-hero-style">
                    #clean-hero-banner {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 65vh; /* Высота баннера */
                        z-index: -1;
                        background: #141414;
                        overflow: hidden;
                        pointer-events: none;
                    }
                    .ch-image {
                        width: 100%;
                        height: 100%;
                        background-size: cover;
                        background-position: center 20%;
                        transition: opacity 0.6s ease-in-out, transform 0.6s ease-in-out;
                        opacity: 0;
                        transform: scale(1.05);
                    }
                    .ch-mask {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(to bottom, rgba(20,20,20,0) 40%, rgba(20,20,20,1) 95%);
                    }
                    
                    /* Прячем конфликтующие блоки других плагинов (текст, описания) */
                    .new-interface-info, 
                    .agnative-hero__content,
                    .new-interface-card-title {
                        display: none !important;
                    }

                    /* Поднимаем сетку фильмов чуть выше для красоты */
                    .items--grid, .category-full {
                        margin-top: 10vh !important;
                    }
                </style>
            `;
            $('head').append(style);

            this.listen();
        };

        // Следим за перемещением фокуса по карточкам
        this.listen = function () {
            Lampa.Listener.follow('target', (e) => {
                if (e.type === 'set' && e.target && e.target.data) {
                    this.updateImage(e.target.data);
                }
            });
        };

        // Обновляем картинку
        this.updateImage = function (data) {
            var img = data.backdrop_path || data.img;
            if (!img) return;

            // Формируем полный путь к картинке TMDB
            if (img.indexOf('/') === 0) img = 'https://image.tmdb.org/t/p/original' + img;
            
            if (img === lastImg) return;
            lastImg = img;

            var imgElement = banner.find('.ch-image');
            
            // Плавная смена через прозрачность
            imgElement.css({ 'opacity': '0', 'transform': 'scale(1.05)' });
            
            var tempImg = new Image();
            tempImg.onload = function() {
                imgElement.css({
                    'background-image': 'url(' + img + ')',
                    'opacity': '1',
                    'transform': 'scale(1)'
                });
            };
            tempImg.src = img;
        };
    }

    // Запуск плагина после готовности Lampa
    if (window.appready) {
        new CleanHeroBanner().init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') new CleanHeroBanner().init();
        });
    }
})();
