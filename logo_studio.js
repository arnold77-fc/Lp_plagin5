(function () {
    'use strict';

    // 1. Стили (оставляем без изменений)
    var styles = `
        .plugin-uk-title-combined { margin-top: 10px; margin-bottom: 5px; text-align: left; width: 100%; display: flex; flex-direction: column; align-items: flex-start; }
        .studio-logos-container { display: flex; align-items: center; flex-wrap: wrap; }
        .rate--studio.studio-logo { 
            display: inline-flex; align-items: center; vertical-align: middle; border-radius: 8px; 
            transition: all 0.2s ease; height: auto; cursor: pointer; position: relative;
            background: rgba(255,255,255,0.08); padding: 5px 12px; margin-right: 10px; margin-bottom: 5px;
        }
        .rate--studio.studio-logo.focus { background: rgba(255,255,255,0.25) !important; outline: 2px solid #fff; transform: scale(1.05); z-index: 10; }
        .rate--studio.studio-logo img { max-width: 200px; width: auto; object-fit: contain; }
        .studio-logo-text { font-size: 0.8em; font-weight: bold; color: #fff !important; }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; text-align: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // Функция безопасного получения настроек
    function getOpt(key, def) {
        var v = Lampa.Storage.get(key);
        if (v === null || typeof v === 'undefined') return def;
        return v;
    }

    // 2. Функция отрисовки
    function renderStudios(render, movie) {
        if (!render || !getOpt('studio_logo_enabled', true)) return;
        $(".plugin-uk-title-combined", render).remove();

        var maxCount = parseInt(getOpt('studio_logo_count', '3'));
        var showBg = getOpt('studio_logo_backdrop', true);
        var sizeEm = getOpt('studio_logo_size', '0.7') + 'em';
        var saturation = getOpt('studio_logo_saturation', '100') / 100;

        var html = '';
        if (movie && movie.production_companies) {
            movie.production_companies.slice(0, maxCount).forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous">' 
                    : '<span class="studio-logo-text">' + co.name + '</span>';

                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }

        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        // Применяем визуальные параметры
        wrap.find('.rate--studio').each(function() {
            var $el = $(this);
            if (!showBg) $el.css({'background':'transparent', 'padding':'5px 0'});
            $el.css('filter', 'saturate(' + saturation + ')');
            $el.find('img').css('height', sizeEm);
        });

        // Клик: Поиск фильмов студии
        wrap.find('.rate--studio').on('hover:enter', function () {
            var id = $(this).data('id');
            var name = $(this).data('name');
            Lampa.Activity.push({
                url: 'company/' + id,
                title: 'Студия: ' + name,
                component: 'category_full',
                source: 'tmdb',
                page: 1
            });
        });
    }

    // 3. Регистрация настроек (ждем готовности)
    function initSettings() {
        // Проверяем, есть ли уже метод регистрации в этой версии Lampa
        if (Lampa.Settings.register) {
            Lampa.Settings.register({
                name: 'studio_logos',
                type: 'item',
                title: 'Логотипы студий',
                icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>'
            });

            Lampa.Settings.listener.follow('open', function (e) {
                if (e.name === 'studio_logos') {
                    var items = [
                        { title: 'Включить плагин', type: 'bool', name: 'studio_logo_enabled', value: true },
                        { title: 'Количество лого', type: 'select', name: 'studio_logo_count', value: '3', values: { '1':'1','2':'2','3':'3','5':'5','10':'10' } },
                        { title: 'Подложка', type: 'bool', name: 'studio_logo_backdrop', value: true },
                        { title: 'Размер (em)', type: 'select', name: 'studio_logo_size', value: '0.7', values: { '0.5':'0.5','0.7':'0.7','0.9':'0.9','1.1':'1.1' } },
                        { title: 'Насыщенность', type: 'select', name: 'studio_logo_saturation', value: '100', values: { '0':'Ч/Б','50':'50%','100':'100%','150':'150%' } }
                    ];
                    var html = Lampa.Settings.create(items);
                    html.on('change', function (ev) { Lampa.Storage.set(ev.name, ev.value); });
                    e.body.append(html);
                }
            });
        }
    }

    // Запуск через контроллер готовности
    var startPlugin = function() {
        initSettings();
        
        Lampa.Listener.follow('full', function(e) {
            if (e.type === 'complite' || e.type === 'complete') {
                var movie = e.data.movie;
                var render = e.object.activity.render();
                // Запрос доп. данных (production_companies)
                Lampa.Api.sources.tmdb.get((movie.first_air_date ? "tv" : "movie") + "/" + movie.id, {}, function (data) {
                    renderStudios(render, data);
                }, function(){});
            }
        });
    };

    if (window.appready) startPlugin();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') startPlugin(); });

})();
