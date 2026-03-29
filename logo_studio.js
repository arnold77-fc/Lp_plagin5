(function () {
    'use strict';

    // Стили
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { display: inline-flex; align-items: center; border-radius: 8px; transition: all 0.2s ease; cursor: pointer; overflow: hidden; background: rgba(255,255,255,0.1); margin-right: 8px; padding: 5px 10px; }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.3) !important; outline: 2px solid #fff; transform: scale(1.05); }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; }
    `;
    if (!$('#ymod-studio-styles').length) $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // Функция отрисовки в карточке
    function renderStudios(render, movie) {
        if (Lampa.Storage.get('studio_logos_enabled', 'true') === 'false' || !movie.production_companies) return;
        
        $(".plugin-uk-title-combined", render).remove();

        var size = Lampa.Storage.get('studio_logos_size', '0.7') + 'em';
        var html = '';
        
        movie.production_companies.slice(0, 4).forEach(function (co) {
            var content = co.logo_path 
                ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" style="height:'+size+'">' 
                : '<span class="studio-logo-text">' + co.name + '</span>';
            
            html += '<div class="rate--studio studio-logo selector" data-id="'+co.id+'" data-name="'+co.name+'">' + content + '</div>';
        });

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        if (target.length) target.after(wrap);

        $('.rate--studio', wrap).on('hover:enter', function () {
            Lampa.Activity.push({
                url: 'company/' + $(this).data('id'),
                title: $(this).data('name'),
                component: 'category_full',
                source: 'tmdb',
                card_type: 0
            });
        });
    }

    // Слушатель карточки
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complete') {
            var movie = e.data.movie;
            var type = movie.number_of_seasons || movie.first_air_date ? 'tv' : 'movie';
            Lampa.Api.sources.tmdb.get(type + "/" + movie.id, {}, function (data) {
                renderStudios(e.object.activity.render(), data);
            });
        }
    });

    // Исправленное добавление в настройки (без дублей)
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'main') {
            // ПРОВЕРКА: Если кнопка уже есть в DOM, ничего не делаем
            if ($('#studio_logos_setting_item').length) return;

            var item = $('<div id="studio_logos_setting_item" class="settings-folder selector" data-component="studio_logos_menu">' +
                '<div class="settings-folder__icon"><svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 19h10V4H7v15zm-5-2h4V6H2v11zM18 6v11h4V6h-4z" fill="white"/></svg></div>' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');
            
            item.on('hover:enter', function () {
                var menu = [
                    { title: 'Увімкнути плагін', type: 'bool', name: 'studio_logos_enabled', value: true },
                    { title: 'Розмір лого (em)', type: 'select', name: 'studio_logos_size', value: '0.7', values: {'0.5':'0.5','0.7':'0.7','1.0':'1.0'} }
                ];

                Lampa.Select.show({
                    title: 'Настройки логотипов',
                    items: menu,
                    onSelect: function(item) {
                        Lampa.Storage.set(item.name, item.value);
                    },
                    onBack: function() {
                        Lampa.Controller.toggle('settings');
                    }
                });
            });

            $('.settings__content', e.node).append(item);
            
            // Если мы зашли в настройки, нужно обновить контроллер, чтобы новая кнопка стала "кликабельной"
            Lampa.Controller.render().find('.selector').unbind('hover:enter').on('hover:enter', function(){
                $(this).trigger('hover:enter');
            });
        }
    });

})();
