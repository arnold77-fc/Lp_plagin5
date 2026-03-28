(function () {
    'use strict';

    Lampa.Platform.tv();

    function addStudioLogo() {
        // Подписываемся на событие отрисовки карточки
        Lampa.Listener.follow('card', function (e) {
            if (e.type == 'after') {
                var card = e.element;
                var data = e.data;

                // Проверяем, есть ли данные о студиях (production_companies)
                // Обычно они доступны в полной карточке или кэше
                if (data.production_companies && data.production_companies.length > 0) {
                    var company = data.production_companies[0]; // Берем первую студию
                    
                    if (company.logo_path) {
                        var logoUrl = 'https://image.tmdb.org/t/p/w200' + company.logo_path;
                        
                        var html = `<div class="card-studio-logo" style="
                            position: absolute;
                            top: 10px;
                            right: 10px;
                            width: 40px;
                            height: 40px;
                            background: rgba(0,0,0,0.5);
                            border-radius: 5px;
                            padding: 5px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 10;
                        ">
                            <img src="${logoUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                        </div>`;

                        $(card).append(html);
                    }
                }
            }
        });
    }

    // Запуск при готовности приложения
    if (window.appready) addStudioLogo();
    else {
        Lampa.Events.on('app:ready', addStudioLogo);
    }
})();
