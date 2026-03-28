(function () {
    'use strict';

    function addStudioLogo() {
        Lampa.Listener.follow('full', function (e) {
            // Исправлено: complete вместо complite
            if (e.type == 'complete') { 
                var render = e.object.render();
                var data = e.data; // В объекте full данные обычно лежат здесь

                // Проверяем наличие компаний напрямую в data
                if (data && data.production_companies && data.production_companies.length > 0) {
                    var company = data.production_companies.find(c => c.logo_path);
                    
                    if (company) {
                        var logoUrl = 'https://image.tmdb.org/t/p/w200' + company.logo_path;
                        
                        var html = $(`
                            <div class="full-studio-logo" style="
                                position: absolute;
                                top: 2rem;
                                right: 2rem;
                                background: rgba(255,255,255,0.1);
                                padding: 10px;
                                border-radius: 10px;
                                backdrop-filter: blur(5px);
                                z-index: 10;
                            ">
                                <img src="${logoUrl}" style="height: 40px; width: auto; object-fit: contain; display: block;">
                            </div>
                        `);

                        // Очистим старый логотип, если он был (чтобы не дублировались при переключении)
                        $(render).find('.full-studio-logo').remove();
                        
                        // Добавляем в основной контейнер карточки
                        $(render).find('.full-start').append(html);
                    }
                }
            }
        });
    }

    if (window.appready) addStudioLogo();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') addStudioLogo();
        });
    }
})();
