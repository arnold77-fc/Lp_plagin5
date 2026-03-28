(function () {
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            let info = e.object.render.find('.full-start__details');
            let movie = e.object.data;
            
            if (movie.production_companies && movie.production_companies.length > 0) {
                let html = $('<div class="studio-logos" style="display: flex; gap: 10px; margin-top: 10px;"></div>');
                
                movie.production_companies.forEach(company => {
                    if (company.logo_path) {
                        let url = 'https://image.tmdb.org/t/p/w200' + company.logo_path;
                        html.append(`<img src="${url}" style="height: 30px; object-fit: contain; filter: brightness(0) invert(1);">`);
                    }
                });
                
                info.append(html);
            }
        }
    });
})();
