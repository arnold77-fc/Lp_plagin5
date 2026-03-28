(function () {
    'use strict';

    function studiosPlugin() {
        Lampa.Listener.follow('full', function (e) {
            if (e.type === 'complite') {
                var card = e.object.render();
                var movie = e.data.movie;
                
                // Проверяем наличие данных о студиях
                if (movie.production_companies && movie.production_companies.length > 0) {
                    var container = $('<div class="card-studios" style="display: flex; gap: 15px; margin-top: 20px; align-items: center;"></div>');

                    movie.production_companies.forEach(function (company) {
                        if (company.logo_path) {
                            var logoUrl = 'https://image.tmdb.org/t/p/h30' + company.logo_path;
                            var img = $('<img src="' + logoUrl + '" style="height: 30px; filter: brightness(0) invert(1); opacity: 0.8;" alt="' + company.name + '">');
                            container.append(img);
                        }
                    });

                    // Вставляем контейнер после описания фильма
                    card.find('.full-movie__descr').after(container);
                }
            }
        });
    }

    // Регистрация плагина в Lampa
    if (window.appready) {
        studiosPlugin();
    } else {
        Lampa.Events.subscribe('app:ready', studiosPlugin);
    }
})();
