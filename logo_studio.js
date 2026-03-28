(function () {
    'use strict';

    var L_MOD = 'studio_mod_v2';

    var styles = `
        .studio-logos-container { 
            display: flex !important; 
            flex-wrap: wrap !important; 
            margin: 15px 0 !important;
            gap: 10px !important;
            min-height: 30px;
        }
        .rate--studio.studio-logo { 
            display: inline-flex !important; 
            background: rgba(255,255,255,0.1) !important;
            padding: 6px 12px !important;
            border-radius: 8px !important;
            border: 2px solid transparent;
        }
        .rate--studio.studio-logo.focus { 
            background: #fff !important; 
            border-color: #ffde1a !important;
        }
        .rate--studio.studio-logo img { 
            height: 22px !important;
            max-width: 120px !important; 
        }
        .rate--studio.studio-logo.focus img { filter: brightness(0) !important; }
        .studio-logo-text { font-size: 14px !important; color: #fff !important; font-weight: bold; }
        .rate--studio.studio-logo.focus .studio-logo-text { color: #000 !important; }
    `;

    if (!$('style#studio-logo-styles').length) {
        $('head').append('<style id="studio-logo-styles">' + styles + '</style>');
    }

    function loadStudios(movie, render) {
        if (render.find('.studio-logos-container').length > 0) return; // Уже загружено

        var type = (movie.number_of_seasons || movie.first_air_date) ? 'tv' : 'movie';
        var url = 'https://api.themoviedb.org/3/' + type + '/' + movie.id + '?api_key=' + Lampa.TMDB.key() + '&language=ru';

        // Используем базовый метод запроса Lampa для Android
        Lampa.Network.native(url, function(data) {
            if (data && data.production_companies && data.production_companies.length) {
                var container = $('<div class="studio-logos-container"></div>');

                data.production_companies.slice(0, 4).forEach(function(co) {
                    var item = $('<div class="rate--studio studio-logo selector"></div>');
                    
                    if (co.logo_path) {
                        item.append('<img src="https://image.tmdb.org/t/p/w200' + co.logo_path + '">');
                    } else {
                        item.append('<span class="studio-logo-text">' + co.name + '</span>');
                    }

                    item.on('hover:enter', function() {
                        Lampa.Activity.push({
                            url: '', 
                            title: co.name, 
                            component: 'category_full', 
                            id: co.id,
                            source: 'tmdb', 
                            card_type: 'company',
                            page: 1
                        });
                    });

                    container.append(item);
                });

                // Ищем место вставки максимально широко
                var target = render.find('.full-start__buttons, .full-start-new__buttons, .full-info__content, .full-start__details').first();
                if (target.length) {
                    target.before(container);
                    // Обновляем контроллер, чтобы кнопки стали кликабельными
                    Lampa.Controller.add('full_start', {
                        toggle: function() { Lampa.Controller.collection(render[0]); }
                    });
                    // Если мы уже в этом контроллере — обновляем его
                    if (Lampa.Controller.enabled().name === 'full_start') {
                        Lampa.Controller.toggle('full_start');
                    }
                }
            }
        });
    }

    // Вместо Listener.follow используем перехват открытия активности
    var old_start = Lampa.Component.get('full').prototype.create;
    Lampa.Component.get('full').prototype.create = function() {
        var _this = this;
        var result = old_start.apply(this, arguments);
        
        // Ждем отрисовки карточки
        setTimeout(function() {
            var movie = _this.activity.data.movie;
            var render = _this.activity.render();
            if (movie && movie.id) {
                loadStudios(movie, render);
            }
        }, 800); // 800мс - гарантированное время для Android v1.12.4

        return result;
    };

    // Настройки
    function setupSettings() {
        Lampa.SettingsApi.addComponent({
            component: 'studio_logos_v2',
            name: 'Логотипы студий',
            icon: '<svg height="24" viewBox="0 0 24 24" width="24" fill="white"><path d="M12 2l10 5v10l-10 5-10-5V7l10-5z"/></svg>'
        });
    }

    if (window.appready) setupSettings();
    else Lampa.Listener.follow("app", function (e) { if (e.type === "ready") setupSettings(); });

})();
