    // 3. Добавление пункта в настройки Lampa
    function addSettingsItem() {
        if ($('.settings [data-component="studio_logos_settings"]').length > 0) return;

        var item = $('<div class="settings-folder selector" data-component="studio_logos_settings">' +
            '<div class="settings-folder__icon"><svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h24v24H0z" fill="none"/><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" fill="white"/></svg></div>' +
            '<div class="settings-folder__name">Логотипи студій</div>' +
            '</div>');

        item.on('hover:enter', function () {
            Lampa.Component.add('studio_logos_settings', StudioSettings); // Регистрируем компонент перед вызовом
            Lampa.Select.show({
                container: 'settings',
                component: 'studio_logos_settings',
                onBack: function () {
                    Lampa.Controller.toggle('settings');
                }
            });
        });

        // Пытаемся вставить после "Интерфейса" или в конец списка
        var target = $('.settings [data-component="interface"]');
        if (target.length > 0) target.after(item);
        else $('.settings__content').append(item);
        
        // Обновляем навигацию, чтобы пульт "увидел" новый пункт
        if (window.Lampa.Controller.active().name === 'settings') {
            Lampa.Controller.enable('settings');
        }
    }

    // Слушатель для отрисовки при открытии настроек
    Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') {
            Lampa.Settings.listener.follow('open', function (en) {
                if (en.name === 'main') {
                    setTimeout(addSettingsItem, 10); // Небольшая задержка для рендера DOM
                }
            });
        }
    });

    // Определение компонента настроек (вынесено в переменную)
    var StudioSettings = function (object) {
        var comp = new Lampa.Settings.component(object);
        comp.create = function () {
            this.add({
                name: 'studio_logos_enabled',
                type: 'bool',
                label: 'Увімкнути плагін',
                descr: 'Відображати логотипи студій',
                default: true
            });
            this.add({
                name: 'studio_logos_background',
                type: 'bool',
                label: 'Підложка',
                descr: 'Напівпрозорий фон за логотипом',
                default: true
            });
            this.add({
                name: 'studio_logos_size',
                type: 'select',
                label: 'Розмір лого',
                descr: 'Виберіть розмір іконок',
                values: {'0.5em': '0.5em', '0.7em': '0.7em', '0.9em': '0.9em', '1.1em': '1.1em'},
                default: '0.7em'
            });
            this.add({
                name: 'studio_logos_margin',
                type: 'select',
                label: 'Відступ між лого',
                descr: 'Відстань між елементами',
                values: {'0.1em': '0.1em', '0.2em': '0.2em', '0.4em': '0.4em'},
                default: '0.2em'
            });
            this.add({
                name: 'studio_logos_saturation',
                type: 'select',
                label: 'Насиченість',
                descr: 'Кольорова гама логотипів',
                values: {'0%': '0%', '50%': '50%', '100%': '100%'},
                default: '100%'
            });
        };
        return comp;
    };
