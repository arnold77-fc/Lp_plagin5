(function () {
    'use strict';

    // 1. Инициализация настроек по умолчанию
    Lampa.Storage.set('ymod_studios_show_bg', Lampa.Storage.get('ymod_studios_show_bg', true));
    Lampa.Storage.set('ymod_studios_size', Lampa.Storage.get('ymod_studios_size', '0.7'));
    Lampa.Storage.set('ymod_studios_saturation', Lampa.Storage.get('ymod_studios_saturation', '100'));

    // 2. Стили
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

    // 3. Анализ яркости
    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            if (canvas.width === 0 || canvas.height === 0) return;
            ctx.drawImage(img, 0, 0);
            var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            var darkPixels = 0, totalPixels = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                totalPixels++;
                if ((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 < 120) darkPixels++;
            }
            if (totalPixels > 0 && (darkPixels / totalPixels) >= threshold) {
                img.style.filter += " brightness(0) invert(1)";
            }
        } catch (e) {}
    }

    // 4. Отрисовка с учетом настроек
    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var showBg = Lampa.Storage.get('ymod_studios_show_bg');
        var sizeVal = Lampa.Storage.get('ymod_studios_size') + 'em';
        var saturation = Lampa.Storage.get('ymod_studios_saturation') / 100;

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, 3);
            companies.forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" title="' + co.name + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span style="font-size: 0.8em; font-weight: bold; color: #fff;">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgStyle = showBg 
            ? 'background: rgba(255,255,255,0.08) !important; padding: 5px 12px !important; margin-right: 8px !important;' 
            : 'background: transparent !important; border: none !important; padding: 5px 0px !important; margin-right: 12px !important;';

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).each(function() {
            $(this).attr('style', bgStyle + ' filter: saturate(' + saturation + ');');
        });
        
        $('.rate--studio img', render).css('height', sizeVal);

        $('.studio-img-check', render).each(function() {
            if (this.complete) analyzeAndInvert(this, 0.85);
            else this.onload = function() { analyzeAndInvert(this, 0.85); };
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

    // 5. Добавление пункта в настройки
    Lampa.Settings.add({
        title: 'Логотипы студий',
        type: 'book',
        icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10z" fill="white"/></svg>',
        component: 'ymod_studios_settings'
    });

    // Конструктор страницы настроек
    Lampa.Component.add('ymod_studios_settings', function (object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var files = new Lampa.Files(object);
        var items = [
            {
                title: 'Показывать фон',
                subtitle: 'Добавляет полупрозрачную подложку под логотипы',
                type: 'bool',
                name: 'ymod_studios_show_bg',
                value: true
            },
            {
                title: 'Размер логотипа',
                subtitle: 'Высота иконок в EM',
                type: 'select',
                name: 'ymod_studios_size',
                value: '0.7',
                values: {
                    '0.5': 'Маленький',
                    '0.7': 'Средний',
                    '1.0': 'Большой',
                    '1.3': 'Очень большой'
                }
            },
            {
                title: 'Насыщенность',
                subtitle: 'Интенсивность цвета логотипов',
                type: 'select',
                name: 'ymod_studios_saturation',
                value: '100',
                values: {
                    '0': 'Ч/Б',
                    '50': 'Приглушенный',
                    '100': 'Нормальный',
                    '150': 'Яркий'
                }
            }
        ];

        this.create = function () {
            var _this = this;
            this.addSettings();
            return scroll.render();
        };

        this.addSettings = function() {
            var _this = this;
            items.forEach(function(item) {
                var res = Lampa.Template.get('settings_field', item);
                var val = Lampa.Storage.get(item.name, item.value);

                if (item.type === 'bool') {
                    res.find('.settings-field__value').text(val ? 'Да' : 'Нет');
                } else {
                    res.find('.settings-field__value').text(item.values[val] || val);
                }

                res.on('hover:enter', function() {
                    if (item.type === 'bool') {
                        val = !Lampa.Storage.get(item.name, item.value);
                        Lampa.Storage.set(item.name, val);
                        res.find('.settings-field__value').text(val ? 'Да' : 'Нет');
                    } else {
                        Lampa.Select.show({
                            title: item.title,
                            items: Object.keys(item.values).map(function(k) { return {title: item.values[k], value: k}; }),
                            onSelect: function(selected) {
                                Lampa.Storage.set(item.name, selected.value);
                                res.find('.settings-field__value').text(selected.title);
                            }
                        });
                    }
                });
                scroll.append(res);
            });
        };

        this.render = function() { return scroll.render(); };
        this.pause = function() {};
        this.destroy = function() { scroll.destroy(); };
    });

    // 6. Слушатель событий
    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite' || e.type === 'complete') {
            var card = e.data.movie;
            var render = e.object.activity.render();
            var type = card.first_air_date ? "tv" : "movie";
            
            Lampa.Api.sources.tmdb.get(type + "/" + card.id, {}, function (data) {
                renderStudiosTitle(render, data);
            });
        }
    });

})();
