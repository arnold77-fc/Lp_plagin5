(function () {
    'use strict';

    if (typeof Lampa === 'undefined') return;

    // ========== 1. НАСТРОЙКИ (ОСТАВЛЕН ТОЛЬКО ИНФО-БЛОК) ==========
    function applyDynamicStyles() {
        try {
            const root = document.documentElement;
            root.style.setProperty('--ni-desc-lines', Lampa.Storage.get('ni_desc_lines', '5'));
            root.style.setProperty('--ni-desc-font-size', Lampa.Storage.get('ni_desc_font_size', '0.9em'));
            
            // Логотипы в инфо-блоке
            const logoGlav = Lampa.Storage.get('ni_logo_glav', 'both');
            document.body.classList.toggle('ni-logo-info-on', logoGlav === 'both' || logoGlav === 'info');
        } catch (e) {}
    }

    function initSettings() {
        if (window.__ni_lite_settings_ready) return;
        window.__ni_lite_settings_ready = true;

        Lampa.SettingsApi.addComponent({
            component: 'ni_lite',
            name: 'Инфо-панель (Lite)',
            icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>`
        });

        const add = (cfg) => { Lampa.SettingsApi.addParam(cfg); };

        add({
            component: 'ni_lite',
            param: { name: 'ni_desc_lines', type: 'select', values: { '3': '3 строки', '5': '5 строк', '7': '7 строк' }, default: '5' },
            field: { name: 'Линии описания', description: 'Сколько строк текста показывать сверху' },
            onChange: applyDynamicStyles
        });
    }

    // ========== 2. ДВИЖОК ЛОГОТИПОВ (ДЛЯ ВЕРХНЕЙ ПАНЕЛИ) ==========
    class LogoEngine {
        getLogoUrl(item, cb) {
            if (!item || !item.id || !Lampa.TMDB) return cb(null);
            const type = (item.media_type === 'tv' || item.name) ? 'tv' : 'movie';
            const lang = (Lampa.Storage.get('language') || 'ru').split('-')[0];
            const url = Lampa.TMDB.api(`${type}/${item.id}/images?api_key=${Lampa.TMDB.key()}&include_image_language=${lang},en,null`);

            $.get(url, (res) => {
                let path = (res.logos && res.logos[0]) ? res.logos[0].file_path : null;
                if (path) cb(Lampa.TMDB.image('/t/p/w500' + path.replace('.svg', '.png')));
                else cb(null);
            }).fail(() => cb(null));
        }

        applyToInfo(titleEl, item, text) {
            if (!titleEl) return;
            titleEl.innerHTML = `<span class="ni-t-txt">${text}</span><div class="ni-t-img"></div>`;
            this.getLogoUrl(item, (url) => {
                if (url) {
                    titleEl.querySelector('.ni-t-img').innerHTML = `<img src="${url}" style="max-height:8vh; object-fit:contain;">`;
                    titleEl.classList.add('has-logo');
                }
            });
        }
    }
    const Logo = new LogoEngine();

    // ========== 3. КЛАСС ИНФО-ПАНЕЛИ ==========
    class InterfaceInfo {
        constructor() { this.html = null; }
        create() {
            if (this.html) return;
            this.html = $(`<div class="ni-info-panel">
                <div class="ni-info-content">
                    <div class="ni-info-title"></div>
                    <div class="ni-info-meta">
                        <span class="ni-info-year"></span>
                        <span class="ni-info-rate"></span>
                    </div>
                    <div class="ni-info-desc"></div>
                </div>
            </div>`);
        }
        update(data) {
            if (!this.html || !data) return;
            this.html.find('.ni-info-year').text((data.release_date || data.first_air_date || '').slice(0,4));
            this.html.find('.ni-info-rate').text(data.vote_average ? '★ ' + data.vote_average : '');
            this.html.find('.ni-info-desc').text(data.overview || '');
            Logo.applyToInfo(this.html.find('.ni-info-title')[0], data, data.title || data.name);
            Lampa.Background.change(Lampa.Api.img(data.backdrop_path, 'w1280'));
        }
        render() { this.create(); return this.html; }
    }

    // ========== 4. ЛОГИКА ПОДКЛЮЧЕНИЯ (БЕЗ ИЗМЕНЕНИЯ КАРТОЧЕК) ==========
    function startPlugin() {
        if (window.innerWidth < 768) return;
        
        const style = `<style>
            .ni-info-panel { position: relative; height: 30vh; padding: 2em; z-index: 10; overflow: hidden; color: #fff; background: linear-gradient(to bottom, rgba(0,0,0,0.6), transparent); }
            .ni-info-title { font-size: 3em; font-weight: bold; margin-bottom: 0.2em; }
            .ni-info-title.has-logo .ni-t-txt { display: none; }
            .ni-info-meta { margin-bottom: 0.5em; font-size: 1.2em; color: #ccc; }
            .ni-info-rate { color: #f39c12; margin-left: 1em; }
            .ni-info-desc { font-size: var(--ni-desc-font-size); line-height: 1.4; max-width: 50%; display: -webkit-box; -webkit-line-clamp: var(--ni-desc-lines); -webkit-box-orient: vertical; overflow: hidden; opacity: 0.8; }
            .new-interface-h { position: relative; }
        </style>`;
        $('body').append(style);

        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                initSettings();
                applyDynamicStyles();
            }
        });

        // Перехватываем создание главной страницы
        const MainMap = Lampa.Maker.map('Main');
        if (MainMap) {
            const info = new InterfaceInfo();
            
            // Внедряем инфо-панель в контейнер
            const origOnCreate = MainMap.Create.onCreate;
            MainMap.Create.onCreate = function(original, args) {
                if (origOnCreate) origOnCreate.apply(this, args);
                const container = this.render(true);
                if (container && !container.querySelector('.ni-info-panel')) {
                    $(container).prepend(info.render());
                    this.scroll.minus(info.render()[0]);
                }
            };

            // Обновление инфо при фокусе на линию/карточку
            const origOnAppend = MainMap.Items.onAppend;
            MainMap.Items.onAppend = function(original, args) {
                if (origOnAppend) origOnAppend.apply(this, args);
                const line = args[0];
                if (line && line.use) {
                    line.use({
                        onActive: (card) => { if (card && card.data) info.update(card.data); }
                    });
                }
            };
        }
    }

    startPlugin();
})();
