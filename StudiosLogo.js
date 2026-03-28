(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30'; 

  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies && movie.production_companies.length) {
      movie.production_companies.forEach(function(co) {
        // Если есть логотип — рисуем картинку, если нет — текст
        if (co.logo_path) {
          html += '<div class="selector studio-logo-badge" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">' +
                  '</div>';
        } else {
          html += '<div class="selector studio-logo-badge text-badge" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    '<span>' + co.name + '</span>' +
                  '</div>';
        }
      });
    }
    return html;
  }

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complete') return; 
    
    var renderTarget = e.object.activity.render();
    var badgesContainer = renderTarget.find('.quality-badges-container');
    
    if (badgesContainer.length) {
        var cont = renderTarget.find('.studio-logos-container');
        if (!cont.length) { 
            cont = $('<div class="studio-logos-container"></div>'); 
            badgesContainer.append(cont); 
        }
        
        cont.html(getStudioLogos(e.data.movie));

        cont.find('.studio-logo-badge').off('hover:enter').on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            
            if (id) {
                Lampa.Activity.push({
                    url: 'company/' + id,
                    title: name,
                    component: 'category_full',
                    source: 'tmdb',
                    card_type: 0,
                    page: 1
                });
            }
        });
    }
  });

  $('body').append('<style>\
    .studio-logos-container { \
        display: inline-flex; \
        vertical-align: middle; \
        margin-left: 10px; \
        gap: 8px; \
        align-items: center; \
        flex-wrap: wrap; \
    }\
    .studio-logo-badge { \
        cursor: pointer; \
        padding: 4px 8px; \
        border-radius: 4px; \
        background: rgba(255, 255, 255, 0.05); \
        transition: all 0.2s ease; \
    }\
    .studio-logo-badge.text-badge span { \
        font-size: 1.2rem; \
        font-weight: 500; \
        color: #fff; \
        white-space: nowrap; \
    }\
    .studio-logo-badge.focus { \
        background: #fff; \
        transform: scale(1.05); \
    }\
    .studio-logo-badge img { \
        height: 1.2em; \
        width: auto; \
        filter: brightness(0) invert(1); \
        display: block; \
    }\
    .studio-logo-badge.focus img { \
        filter: brightness(0); /* Черный логотип на белом фоне при фокусе */ \
    }\
    .studio-logo-badge.focus span { \
        color: #000; \
    }\
  </style>');
})();
