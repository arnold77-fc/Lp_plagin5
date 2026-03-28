// 1. Добавляем пункты в раздел "Интерфейс"
Lampa.Settings.listener.follow('open', function (e) {
    if (e.name == 'interface') {
        var render = e.body; // Получаем тело настроек
        
        // Создаем заголовок секции
        var header = $('<div class="settings-param title"><span class="settings-param__name">Логотипы студий</span></div>');
        
        // Переключатель фона
        var toggleBg = $(`<div class="settings-param selector" data-type="toggle" data-name="ymod_studio_bg">
            <div class="settings-param__name">Фон логотипов</div>
            <div class="settings-param__value"></div>
            <div class="settings-param__descr">Показывать полупрозрачную подложку под иконками</div>
        </div>`);

        // Ползунок размера
        var sizeRange = $(`<div class="settings-param selector" data-type="range" data-name="ymod_studio_size">
            <div class="settings-param__name">Размер логотипов</div>
            <div class="settings-param__value"></div>
            <div class="settings-param__descr">Масштаб иконок компаний (от 0.5 до 2.0)</div>
        </div>`);

        // Функция обновления текстовых значений в меню
        function updateValues() {
            toggleBg.find('.settings-param__value').text(Lampa.Storage.get('ymod_studio_bg', 'true') === 'true' ? 'Да' : 'Нет');
            sizeRange.find('.settings-param__value').text(Lampa.Storage.get('ymod_studio_size', '0.7'));
        }

        // Логика нажатия на "Фон"
        toggleBg.on('hover:enter', function () {
            var current = Lampa.Storage.get('ymod_studio_bg', 'true') === 'true';
            Lampa.Storage.set('ymod_studio_bg', !current);
            updateValues();
        });

        // Логика нажатия на "Размер" (простой перебор для примера)
        sizeRange.on('hover:enter', function () {
            var sizes = ['0.5', '0.7', '1.0', '1.2', '1.5'];
            var current = Lampa.Storage.get('ymod_studio_size', '0.7');
            var next = sizes[(sizes.indexOf(current) + 1) % sizes.length];
            Lampa.Storage.set('ymod_studio_size', next);
            updateValues();
        });

        // Вставляем элементы
        render.append(header);
        render.append(toggleBg);
        render.append(sizeRange);
        
        updateValues();

        // Важно: если вы добавляете элементы динамически, 
        // нужно обновить коллекцию контроллера, чтобы пульт их "видел"
        Lampa.Controller.enable('settings_interface'); 
    }
});
