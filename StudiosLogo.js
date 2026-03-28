(function () {
    'use strict';

    function addStudioLogo() {
        // Подписываемся на событие открытия полной карточки
        Lampa.Listener.follow('full', function (e) {
            if (e.type == 'complite') { // Событие, когда данные загружены и отрисованы
                var render = e.object.render(); // Получаем DOM-элемент карточки
                var data = e.data; // Тут уже есть production_companies

                if (data.movie.production_companies && data.movie.production_companies.length > 0) {
                    var company = data.movie.production_companies.find(c => c.logo_path); // Ищем компанию с логотипом
                    
                    if (company) {
                        var logoUrl = 'https://image.tmdb.org/t/p/w200' + company.logo_path;
                        
                        var html = $(`<div class="full-studio-logo" style="
                            position: absolute;
                            top: 20px;
                            right: 20px;
                            background: rgba(255,255,255,0.1);
                            padding: 10px;
                            border-radius: 10px;
                            backdrop-filter: blur(5px);
                        ">
                            <img src="${logoUrl}" style="height: 40px; object-fit: contain;">
                        </div>`);

                        // Добавляем логотип в блок с описанием (или в постер)
                        $(render).find('.full-start').append(html);
                    }
                }
            }
        });
    }

    if (window.appready) addStudioLogo();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type == 'ready') addStudioLogo();
    });
})();
