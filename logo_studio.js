
(function () {
    'use strict';

    // 1. Стили
    var styles = `
        .plugin-uk-title-combined { 
            margin-top: 10px; 
            margin-bottom: 5px; 
            text-align: left; 
            width: 100%; 
            display: flex; 
            flex-direction: column; 
            align-items: flex-start; 
        }
        .studio-logos-container { 
            display: flex; 
            align-items: center; 
            flex-wrap: wrap; 
        }
        .rate--studio.studio-logo { 
            display: inline-flex; 
            align-items: center; 
            vertical-align: middle; 
            border-radius: 8px; 
            transition: all 0.2s ease; 
            height: auto; 
            cursor: pointer;
            margin-bottom: 5px;
            background: rgba(255,255,255,0.08);
            padding: 5px 12px;
            margin-right: 8px;
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.2) !important; 
            border: 1px solid #fff; 
            transform: scale(1.05); 
        }
        .rate--studio.studio-logo img { 
            max-width: 200px; 
            width: auto; 
            object-fit: contain; 
        }
        @media screen and (orientation: portrait), screen and (max-width: 767px) {
            .plugin-uk-title-combined { align-items: center !important; text-align: center !important; }
            .studio-logos-container { justify-content: center !important; }
        }
    `;
    $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');

    // 2. Функция инверсии темных логотипов
    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            if (canvas.width === 0) return;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var dark = 0, total = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 20) continue;
                total++;
                if ((data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114) < 120) dark++;
            }
            if (total > 0 && (dark / total) >= threshold) img.style.filter += " brightness(0) invert(1)";
        } catch (e) {}
    }

    // 3. Отрисовка
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('ymod_studios_show_bg', true);
        var sizeVal = (Lampa.Storage.get('ymod_studios_size', '0.7')) + 'em';
        var saturation = (Lampa.Storage.get('ymod_studios_saturation', '100')) / 100;

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, 3);
            companies.forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span style="font-size: 0.8em; font-weight: bold; color: #fff;">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).each(function() {
            var el = $(this);
            if (!showBg) el.css({'background':'transparent', 'padding':'5px 0', 'margin-right':'15px'});
            el.css('filter', 'saturate(' + saturation + ')');
            el.find('img').css('height', sizeVal);
        });

        $('.studio-img-check', render).each(function() {
            if (this.complete) analyzeAndInvert(this, 0.8);
            else this.onload = function() { analyzeAndInvert(this, 0.8); };
        });

        $('.rate--studio', render).on('hover:enter', function () {
            Lampa.Activity.push({ 
                url: 'company/' + $(this).data('id'), 
                title: $(this).data('name'), 
                component: 'category_full', 
                source: 'tmdb', 
                card_type: 0 
            });
        });
    }

    // 4. Компонент страницы настроек (регистрируем заранее)
    function StudioSettings(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = [
            { title: 'Показывать фон', name: 'ymod_studios_show_bg', type: 'bool', default: true },
            { 
                title: 'Размер логотипа', 
                name: 'ymod_studios_size', 
                type: 'select', 
                default: '0.7', 
                values: { '0.5': 'Маленький', '0.7': 'Средний', '1.0': 'Большой' } 
            },
            { 
                title: 'Насыщенность', 
                name: 'ymod_studios_saturation', 
                type: 'select', 
                default: '100', 
                values: { '0': 'Ч/Б', '100': 'Цветной', '150': 'Яркий' } 
            }
        ];

        this.create = function () {
            var _this = this;
            items.forEach(function (item) {
                var val = Lampa.Storage.get(item.name, item.default);
                var view = Lampa.Template.get('settings_field', item);
                
                var updateValue = function(current) {
                    if (item.type === 'bool') view.find('.settings-field__value').text(current ? 'Да' : 'Нет');
                    else view.find('.settings-field__value').text(item.values[current] || current);
                };

                updateValue(val);

                view.on('hover:enter', function () {
                    if (item.type === 'bool') {
                        val = !Lampa.Storage.get(item.name, item.default);
                        Lampa.Storage.set(item.name, val);
                        updateValue(val);
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(k => ({title: item.values[k], value: k})),
                            onSelect: function (a) {
                                Lampa.Storage.set(item.name, a.value);
                                updateValue(a.value);
                            },
                            onBack: function(){
                                Lampa.Controller.toggle('settings_component');
                            }
                        });
                    }
                });
                scroll.append(view);
            });
            return scroll.render();
        };
        this.render = function () { return this.create(); };
        this.pause = function () {};
        this.destroy = function () { scroll.destroy(); };
    }

    // Регистрация компонента
    Lampa.Component.add('ymod_studios_settings', StudioSettings);

    // 5. Интеграция в настройки интерфейса
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name === 'interface') { // Перенесено в пункт Интерфейс
            var field = $(`<div class="settings-field selector" data-component="ymod_studios_settings">
                <div class="settings-field__title">Логотипы студий</div>
                <div class="settings-field__descr">Настройка отображения брендов компаний</div>
            </div>`);
            
            field.on('hover:enter', function () {
                Lampa.Activity.push({
                    component: 'ymod_studios_settings',
                    title: 'Логотипы студий'
                });
            });
            e.body.find('.settings-list').append(field);
        }
    });

    // 6. Слушатель карточки
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite') {
            var type = e.data.movie.first_air_date ? "tv" : "movie";
            Lampa.Api.sources.tmdb.get(type + "/" + e.data.movie.id, {}, function (data) {
                renderStudiosTitle(e.object.activity.render(), data);
            });
        }
    });

})();
