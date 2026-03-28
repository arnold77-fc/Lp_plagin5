(function () {
  'use strict';

  var TMDB_IMAGE_URL = 'https://image.tmdb.org/t/p/w200'; // Увеличил качество для четкости

  function getStudioLogos(movie) {
    var html = '';
    if (movie && movie.production_companies) {
      movie.production_companies.forEach(function(co) {
        if (co.logo_path) {
          // Добавлен класс "focusable" для кастомной логики, если нужно
          html += '<div class="studio-logo-badge selector" data-id="' + co.id + '" data-name="' + co.name + '">' +
                    '<img src="' + TMDB_IMAGE_URL + co.logo_path + '" title="' + co.name + '">' +
                  '</div>';
        }
      });
    }
    return html;
  }

  Lampa.Listener.follow('full', function(e) {
    // Исправлено: complete (было complite)
    if (e.type !== 'complete') return;
    
    var renderTarget = e.object.activity.render();
    var badgesContainer = $('.quality-badges-container', renderTarget);
    
    if (badgesContainer.length) {
        // Удаляем старый контейнер, если он был (защита от дублей)
        $('.studio-logos-container', renderTarget).remove();
        
        var cont = $('<div class="studio-logos-container"></div>');
        var logosHtml = getStudioLogos(e.data.movie);
        
        if (logosHtml) {
            cont.html(logosHtml);
            badgesContainer.append(cont);
            
            // Обработка нажатия (ОК на пульте или Клик мышью)
            cont.find('.studio-logo-badge').on('hover:enter', function () {
                var id = $(this).data('id');
                var name = $(this).data('name');
                if (id) {
                    Lampa.Activity.push({
                        url: '', 
                        id: id,
                        title: name,
                        component: 'company', // В новых версиях Lampa это открывает список фильмов студии
                        source: 'tmdb',
                        page: 1
                    });
                }
            });

            // РЕГИСТРАЦИЯ В КОНТРОЛЛЕРЕ
            // Это заставляет Lampa "увидеть" новые элементы 'selector'
            if (e.object.activity.render().find('.selector').length) {
                Lampa.Controller.add('full_start', {
                    toggle: function() {
                        Lampa.Controller.collectionSet(renderTarget);
                        Lampa.Controller.move('right'); // Или любая логика фокуса
                    }
                });
            }
        }
    }
  });

  // Стили вынесены отдельно и оптимизированы
  if (!$('#studio-logos-style').length) {
      $('body').append('<style id="studio-logos-style">\
        .studio-logos-container { \
            display: inline-flex; \
            vertical-align: middle; \
            margin-left: 10px; \
            gap: 8px; \
            align-items: center; \
        }\
        .studio-logo-badge { \
          display: inline-flex; \
          align-items: center; \
          justify-content: center; \
          padding: 4px 8px; \
          border-radius: 6px; \
          background: rgba(255,255,255,0.05); \
          transition: all 0.2s ease; \
          cursor: pointer; \
          border: 1px solid transparent; \
        }\
        /* Состояние фокуса для пульта */\
        .studio-logo-badge.focus { \
          background: rgba(255,255,255,0.2) !important; \
          border-color: #fff; \
          transform: scale(1.1); \
        }\
        .studio-logo-badge img { \
          height: 1.5em; \
          width: auto; \
          filter: brightness(0) invert(1); \
          opacity: 0.8; \
        }\
        .studio-logo-badge.focus img { \
          opacity: 1; \
        }\
      </style>');
  }

})();
