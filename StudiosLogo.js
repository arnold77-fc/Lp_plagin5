(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/h30'; 

  // Функция создания HTML для логотипов
  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.forEach(function(co) {
        if (co.logo_path) {
          // Добавляем data-атрибуты для ID и названия студии
          html += '<div class="selector studio-logo-badge" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">' +
                  '</div>';
        }
      });
    }
    return html;
  }

  Lampa.Listener.follow('full', function(e) {
    if (e.type !== 'complite') return;
    
    var renderTarget = e.object.activity.render();
    var badgesContainer = $('.quality-badges-container', renderTarget);
    
    if (badgesContainer.length) {
        var cont = $('.studio-logos-container', renderTarget);
        if (!cont.length) { 
            cont = $('<div class="studio-logos-container"></div>'); 
            badgesContainer.append(cont); 
        }
        
        cont.html(getStudioLogos(e.data.movie));

        // Вешаем событие клика/выбора на каждый логотип
        cont.find('.studio-logo-badge').on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            
            if (id) {
                // Переход к контенту студии через стандартный компонент Lampa
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

  // Стили для навигации и внешнего вида
  $('body').append('<style>\
    .studio-logos-container { \
        display: inline-flex; \
        vertical-align: middle; \
        margin-left: 10px; \
        gap: 12px; \
        align-items: center; \
    }\
    .studio-logo-badge { \
        cursor: pointer; \
        transition: transform 0.2s ease, background 0.2s ease; \
        padding: 4px 8px; \
        border-radius: 6px; \
    }\
    /* Стиль при наведении пультом */\
    .studio-logo-badge.focus { \
        background: rgba(255, 255, 255, 0.15); \
        transform: scale(1.1); \
    }\
    .studio-logo-badge img { \
        height: 1.6em; \
        width: auto; \
        filter: brightness(0) invert(1); \
        opacity: 0.8; \
    }\
    .studio-logo-badge.focus img { \
        opacity: 1; \
    }\
  </style>');

})();
