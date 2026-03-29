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
        }
        .rate--studio.studio-logo.focus { 
            background: rgba(255,255,255,0.25) !important; 
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
    if (!$('#ymod-studio-styles').length) {
        $('head').append('<style id="ymod-studio-styles">' + styles + '</style>');
    }

    // --- БЛОК НАСТРОЕК ---
    
    Lampa.Settings.listener.follow('open', function (e) {
        if (e.name == 'main') {
            var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
                '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="white"/></svg></div>' +
                '<div class="settings-folder__name">Логотипы студий</div>' +
                '</div>');
            
            item.on('hover:enter', function () {
                Lampa.Component.add('studio_logos_settings', StudioSettings);
                Lampa.Activity.push({
                    url: '',
                    title: 'Логотипы студий',
                    component: 'studio_logos_settings',
                    page: 1
                });
            });
            e.body.append(item);
        }
    });

    function StudioSettings(object) {
        var comp = new Lampa.InteractionMain(object);
        
        comp.create = function () {
            var _this = this;
            this.activity.loader(false);
            
            // 1. Размер
            var size = Lampa.Storage.get('studio_logo_size', '0.7');
            var item_size = $('<div class="settings-param selector">' +
                '<div class="settings-param__name">Размер логотипов</div>' +
                '<div class="settings-param__value">' + size + 'em</div>' +
                '</div>');

            item_size.on('hover:enter', function () {
                var values = ['0.5', '0.6', '0.7', '0.8', '0.9', '1.0', '1.2', '1.5'];
                Lampa.Select.show({
                    title: 'Выберите размер',
                    items: values.map(v => ({ title: v + ' em', value: v })),
                    onSelect: function (a) {
                        Lampa.Storage.set('studio_logo_size', a.value);
                        item_size.find('.settings-param__value').text(a.value + ' em');
                    },
                    onBack: () => Lampa.Controller.toggle(_this.components.content)
                });
            });

            // 2. Насыщенность
            var sat = Lampa.Storage.get('studio_logo_sat', '1.0');
            var item_sat = $('<div class="settings-param selector">' +
                '<div class="settings-param__name">Насыщенность цветов</div>' +
                '<div class="settings-param__value">' + (sat * 100) + '%</div>' +
                '</div>');

            item_sat.on('hover:enter', function () {
                var values = [
                    {title: 'Ч/Б (0%)', value: '0.0'},
                    {title: 'Приглушенные (0.5)', value: '0.5'},
                    {title: 'Норма (1.0)', value: '1.0'},
                    {title: 'Яркие (1.5)', value: '1.5'},
                    {title: 'Максимум (2.0)', value: '2.0'}
                ];
                Lampa.Select.show({
                    title: 'Насыщенность',
                    items: values,
                    onSelect: function (a) {
                        Lampa.Storage.set('studio_logo_sat', a.value);
                        item_sat.find('.settings-param__value').text((a.value * 100) + '%');
                    },
                    onBack: () => Lampa.Controller.toggle(_this.components.content)
                });
            });

            // 3. Подложка (фон)
            var bg = Lampa.Storage.get('studio_logo_bg', 'true');
            var item_bg = $('<div class="settings-param selector">' +
                '<div class="settings-param__name">Фоновая подложка</div>' +
                '<div class="settings-param__value">' + (bg == 'true' ? 'Да' : 'Нет') + '</div>' +
                '</div>');

            item_bg.on('hover:enter', function () {
                Lampa.Select.show({
                    title: 'Показывать фон?',
                    items: [{title: 'Да', value: 'true'}, {title: 'Нет', value: 'false'}],
                    onSelect: function (a) {
                        Lampa.Storage.set('studio_logo_bg', a.value);
                        item_bg.find('.settings-param__value').text(a.value == 'true' ? 'Да' : 'Нет');
                    },
                    onBack: () => Lampa.Controller.toggle(_this.components.content)
                });
            });

            this.append(item_size);
            this.append(item_sat);
            this.append(item_bg);
        };
        return comp;
    }

    // --- ЛОГИКА ОТРИСОВКИ ---

    function analyzeAndInvert(img, threshold) {
        try {
            var canvas = document.createElement('canvas');
            var ctx = canvas.getContext('2d');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            if (canvas.width === 0 || canvas.height === 0) return;
            ctx.drawImage(img, 0, 0);
            var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var data = imageData.data;
            var darkPixels = 0;
            var totalPixels = 0;
            for (var i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue;
                totalPixels++;
                var brightness = (data[i] * 299 + data[i+1] * 587 + data[i+2] * 114) / 1000;
                if (brightness < 120) darkPixels++;
            }
            if (totalPixels > 0 && (darkPixels / totalPixels) >= threshold) {
                img.style.filter += " brightness(0) invert(1)";
            }
        } catch (e) {}
    }

    function renderStudiosTitle(render, movie) {
        if (!render) return;
        $(".plugin-uk-title-combined", render).remove();
        
        var sizeEm = Lampa.Storage.get('studio_logo_size', '0.7') + 'em';
        var saturation = Lampa.Storage.get('studio_logo_sat', '1.0');
        var showBg = Lampa.Storage.get('studio_logo_bg', 'true') == 'true';
        var gapEm = '0.3em';

        var html = '';
        if (movie && movie.production_companies) {
            var companies = movie.production_companies.slice(0, 3);
            companies.forEach(function (co) {
                var content = co.logo_path 
                    ? '<img src="https://image.tmdb.org/t/p/h100' + co.logo_path + '" crossorigin="anonymous" class="studio-img-check">' 
                    : '<span class="studio-logo-text" style="font-size: 0.8em; padding: 0 5px;">' + co.name + '</span>';
                
                html += '<div class="rate--studio studio-logo selector" data-id="' + co.id + '" data-name="' + co.name + '">' + content + '</div>';
            });
        }
        if (!html) return;

        var bgStyle = showBg 
            ? 'background: rgba(255,255,255,0.1) !important; padding: 4px 10px !important; margin-right: '+gapEm+' !important;' 
            : 'background: transparent !important; border: none !important; padding: 2px 0px !important; margin-right: '+gapEm+' !important;';

        var wrap = $('<div class="plugin-uk-title-combined"><div class="studio-logos-container">' + html + '</div></div>');
        var target = $(".full-start-new__title, .full-start__title", render);
        target.after(wrap);

        $('.rate--studio', render).css('cssText', bgStyle + ' filter: saturate(' + saturation + ');');
        $('.rate--studio img', render).css('cssText', 'height: ' + sizeEm + ' !important;');

        $('.studio-img-check', render).each(function() {
            var img = this;
            if (img.complete) analyzeAndInvert(img, 0.85);
            else img.onload = function() { analyzeAndInvert(img, 0.85); };
        });

        $('.rate--studio', render).on('hover:enter', function () {
            var id = $(this).data('id');
            if (id) Lampa.Activity.push({ url: 'movie', id: id, title: $(this).data('name'), component: 'company', source: 'tmdb', page: 1 });
        });
    }

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
