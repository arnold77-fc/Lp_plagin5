(function () {
    'use strict';

    var PLUGIN_ICON = '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><style>.cls-left{fill:currentColor;fill-rule:evenodd;}.cls-right{fill:#a0a0a0;fill-rule:evenodd;}</style><g><polygon class="cls-right" points="16.64 15.13 17.38 13.88 20.91 13.88 22 12 19.82 8.25 16.75 8.25 15.69 6.39 14.5 6.39 14.5 5.13 16.44 5.13 17.5 7 19.09 7 16.9 3.25 12.63 3.25 12.63 8.25 14.36 8.25 15.09 9.5 12.63 9.5 12.63 12 14.89 12 15.94 10.13 18.75 10.13 19.47 11.38 16.67 11.38 15.62 13.25 12.63 13.25 12.63 17.63 16.03 17.63 15.31 18.88 12.63 18.88 12.63 20.75 16.9 20.75 20.18 15.13 18.09 15.13 17.36 16.38 14.5 16.38 14.5 15.13 16.64 15.13"/><polygon class="cls-left" points="7.36 15.13 6.62 13.88 3.09 13.88 2 12 4.18 8.25 7.25 8.25 8.31 6.39 9.5 6.39 9.5 5.13 7.56 5.13 6.5 7 4.91 7 7.1 3.25 11.38 3.25 11.38 8.25 9.64 8.25 8.91 9.5 11.38 9.5 11.38 12 9.11 12 8.06 10.13 5.25 10.13 4.53 11.38 7.33 11.38 8.38 13.25 11.38 13.25 11.38 17.63 7.97 17.63 8.69 18.88 11.38 18.88 11.38 20.75 7.1 20.75 3.82 15.13 5.91 15.13 6.64 16.38 9.5 16.38 9.5 15.13 7.36 15.13"/></g></svg>';

    var STORAGE_KEY = 'google_native_key_v1';
    window.ai_pagination = { base_prompt: '', exclude_list: [], preloaded_results: null, preloaded_raw_list: null, is_loading: false, is_preloading: false };
    window.ai_cached_results = [];
    window.ai_active_controller = null;

    if (!window.ai_push_patched) {
        var originalPush = Lampa.Activity.push;
        Lampa.Activity.push = function(obj) {
            var card = obj.card || obj.movie;
            if (card && card.is_load_more) {
                if (window.plugin_ai_assistant_instance) window.plugin_ai_assistant_instance.loadMore(Lampa.Activity.active());
                return;
            }
            originalPush.apply(Lampa.Activity, arguments);
        };
        window.ai_push_patched = true;
    }

    if (window.Lampa && Lampa.Api) {
        Lampa.Api.sources.ai_assistant_list = {
            list: function(params, oncomplite) { oncomplite({ results: window.ai_cached_results, total_pages: 1 }); }
        };
    }

    function AIAssistantPlugin() {
        var _this = this;
        var statusBox = null;

        var AI_MODELS_LIST = [
            { id: 'gemini-3.1-flash-lite-preview', name: 'gemini-3.1-flash-lite-preview' },
            { id: 'gemini-3-flash-preview', name: 'gemini-3-flash-preview' },
            { id: 'gemini-2.5-flash-lite', name: 'gemini-2.5-flash-lite' },
            { id: 'gemini-2.5-flash', name: 'gemini-2.5-flash' },
            { id: 'gemma-4-31b-it', name: 'gemma-4-31b-it' },
            { id: 'gemma-3-27b-it', name: 'gemma-3-27b-it' },
            { id: 'gemma-3-4b-it', name: 'gemma-3-4b-it' }
        ];
        

        this.init = function () {
            this.setupSettings();
            this.injectStyles();
            this.setupGlobalSearch();
            
            Lampa.Listener.follow('full', function (e) {
                if (e.type == 'complite' || e.type == 'complete') {
                    _this.drawButton(e.object.activity.render(), e.data.movie);
                    _this.preloadTags(e.data.movie);
                }
            });

            Lampa.Listener.follow('card', function(e) {
                if (e.action == 'render' && e.card) {
                    if (e.card.is_load_more) {
                        e.element.attr('data-id', 'ai_load_more');
                        e.element.find('.card__title, .card__age, .item__title, .item__age, .card__vote, .card__icons').hide();
                    } else if (e.card.id) {
                        e.element.attr('data-id', e.card.id);
                    }
                }
            });
        };

        this.getTMDBDetails = function(card, callback) {
            var method = (card.name || card.original_name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '?api_key=' + Lampa.TMDB.key() + '&language=en-US&append_to_response=credits');
            
            Lampa.Network.silent(url, function(res) {
                var overview = (res.overview || '').replace(/"/g, "'").replace(/\n/g, ' ');
                var leadActor = 'unknown';
                
                if (res.credits && res.credits.cast && res.credits.cast.length > 0) {
                    leadActor = res.credits.cast[0].name;
                }
                callback({ overview: overview, leadActor: leadActor });
            }, function() {
                callback({ overview: '', leadActor: 'unknown' });
            });
        };

        this.preloadTags = function(card) {
            if (card.translated_tags) return;

            var attempts = 0;
            var delays = [1000, 2000];

            var waitAndCheck = function() {
                setTimeout(function() {
                    if (card.translated_tags && card.translated_tags.length > 0) return;

                    attempts++;
                    if (attempts < delays.length) {
                        waitAndCheck();
                    } else {
                        _this.runOwnTagTranslation(card);
                    }
                }, delays[attempts]);
            };

            waitAndCheck();
        };
        
        this.runOwnTagTranslation = function(card) {
            if (card.translated_tags) return;
            
            var method = (card.original_name || card.name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '/keywords?api_key=' + Lampa.TMDB.key());

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (resp) {
                    var tags = resp.keywords || resp.results || [];
                    if (tags.length > 0) {
                        _this.translateTags(tags, function(translatedTags) {
                            card.translated_tags = translatedTags;
                        });
                    } else {
                        card.translated_tags = [];
                    }
                }
            });
        };
        
        this.setupGlobalSearch = function() {
            var searchSource = {
                title: 'AI Поиск',
                search: function (params, done) {
                    var q = decodeURIComponent(params.query || '').trim().toLowerCase();
                    var limit = Lampa.Storage.get('ai_result_count', '20');
                    if (!q) return done([]);
                    var filter = (q.indexOf('фільм') > -1 || q.indexOf('фильм') > -1) ? 'strictly only movies' : (q.indexOf('серіал') > -1 || q.indexOf('сериал') > -1 ? 'strictly only TV series' : 'movies and TV series');
                    var p = 'Act as a movie expert. Suggest strictly ' + limit + ' ' + filter + ' for query: "' + q + '". Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown, no intro text.';
                    
                    window.ai_active_controller = Lampa.Controller.enabled().name;
                    _this.updateStatus('Поиск результатов');
                    _this.askGemini(p, function(text) {
                        var list = _this.parseJsonSafe(text);
                        if (!list) { _this.hideStatus(); return done([]); }
                        _this.processAiList(list, function(results) { _this.hideStatus(); done([{ title: 'AI: ' + q, results: results, total: results.length }]); });
                    }, function() { 
                        done([]); 
                    });
                },
                params: { save: true, lazy: true },
                onSelect: function (p, close) { close(); Lampa.Activity.push({ url: p.element.media_type+'/'+p.element.id, component: 'full', id: p.element.id, method: p.element.media_type, card: p.element, source: 'tmdb' }); }
            };
            setTimeout(function() {
                var s = Lampa.Search.sources ? Lampa.Search.sources() : [];
                if (s.length >= 2) s.splice(2, 0, searchSource); else Lampa.Search.addSource(searchSource);
            }, 1500);
        };

        this.getSafeDynamicColor = function() {
            var raw = getComputedStyle(document.documentElement).getPropertyValue('--main-color').trim();
            if (!raw) return '#ffffff';
            
            var r = 0, g = 0, b = 0;
            if (raw.indexOf('#') === 0) {
                var hex = raw.slice(1);
                if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
                r = parseInt(hex.slice(0,2), 16); g = parseInt(hex.slice(2,4), 16); b = parseInt(hex.slice(4,6), 16);
            } else if (raw.indexOf('rgb') === 0) {
                var m = raw.match(/\d+/g);
                if (m) { r = parseInt(m[0]); g = parseInt(m[1]); b = parseInt(m[2]); }
            } else { return raw; } 
            
            r /= 255; g /= 255; b /= 255;
            var max = Math.max(r, g, b), min = Math.min(r, g, b);
            var h = 0, s = 0, l = (max + min) / 2;
            if (max !== min) {
                var d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                switch (max) {
                    case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                    case g: h = (b - r) / d + 2; break;
                    case b: h = (r - g) / d + 4; break;
                }
                h /= 6;
            }
            if (l < 0.35) l = 0.35; 
            
            return 'hsl(' + Math.round(h * 360) + ',' + Math.round(s * 100) + '%,' + Math.round(l * 100) + '%)';
        };
        
        this.injectStyles = function() {
            if ($('#ai-assistant-styles').length) return;
            $('<style id="ai-assistant-styles">').prop('type', 'text/css').html(
                '.button--ai-assist { display: flex !important; align-items: center; justify-content: center; gap: 1px; } ' + 
                '.button--ai-assist svg { width: 1.9em !important; height: 1.9em !important; margin: 0 !important; } ' +
                '#ai-assist-status { position: fixed; bottom: 80px; left: 0; right: 0; text-align: center; z-index: 10001; pointer-events: none; display: flex; justify-content: center; }' +
                '.ai-toast { display: inline-flex; align-items: center; gap: 12px; background: rgba(0,0,0,0.2); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); padding: 10px 24px; border-radius: 50px; color: #fff; font-size: 1.1em; position: relative; overflow: hidden; height: 44px; }' +
                '.ai-toast:after { content:""; position:absolute; top:0; left:-100%; width:30%; height:100%; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent); animation: ai-shimmer 4s infinite; }' +
                '@keyframes ai-shimmer { to {left:150%} }' +
                '.ai-spinner { width: 22px; height: 22px; border-radius: 50%; border: 3px solid transparent; border-top-color: #fff; animation: ai-rot 0.8s linear infinite, ai-rainbow 4s linear infinite; }' +
                '@keyframes ai-rot { to { transform: rotate(360deg); } }' +
                '@keyframes ai-rainbow { 0%{border-top-color:#fff} 16.6%{border-top-color:var(--main-color, #fff)} 33.3%{border-top-color:#0cf} 50%{border-top-color:#f0f} 66.6%{border-top-color:var(--main-color, #f0f)} 83.3%{border-top-color:#8b0000} 100%{border-top-color:#fff} }' +
                '.ai-viewer-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 5001; display: flex; align-items: center; justify-content: center; }' +
                '.ai-viewer-body { width: 85%; max-width: 900px; height: 80%; background: #121212; display: flex; flex-direction: column; border-radius: 16px; border: 1px solid var(--main-color, #fff); overflow: hidden; }' +
                '.ai-header { height: 48px; padding: 0 15px; background: #1a1a1a; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }' +
                '.ai-title { font-size: 1.5em; font-weight: bold; }' + 
                '.ai-close-btn { width: 32px; height: 32px; background: #333; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-family: sans-serif; cursor: pointer; border: 2px solid transparent; line-height: 0; padding-bottom: 0px; }' +
                '.ai-close-btn.focus { background: #fff; color: #000; outline: none; }' +
                '.ai-content-scroll { flex: 1; overflow-y: auto; padding: 10px 20px 20px 20px; color: #efefef; line-height: 1.4; font-size: var(--ai-font-size, 1.25em); }' +
                '.ai-fact-title { color: var(--safe-text-color, var(--main-color, #fff)); font-weight: bold; display: block; margin-bottom: 2px; }'
            ).appendTo('head');
        };

        this.drawButton = function (render, card) {
            var container = render.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!container.length || container.find('.button--ai-assist').length) return;
            var btn = $('<div class="full-start__button selector button--ai-assist">' + PLUGIN_ICON + '<span>AI Ассистент</span></div>');
            btn.on('hover:enter click', function () { _this.openAiMenu(card, btn, render); });
            var lastBtn = container.find('.selector').last();
            if (lastBtn.length) lastBtn.after(btn); else container.append(btn);
        };

        this.restoreFocus = function(btnElement, renderContainer, controllerName) {
            if (Lampa.Activity.active() && Lampa.Activity.active().activity) {
                Lampa.Activity.active().activity.toggle();
            } else {
                Lampa.Controller.toggle(controllerName || 'full');
            }

            if (!Lampa.Platform.is('touch') && btnElement && renderContainer) {
                setTimeout(function() {
                    Lampa.Controller.collectionFocus(btnElement[0], renderContainer[0]);
                }, 10);
            }
        };

        this.openAiMenu = function(card, btnElement, renderContainer, prevCtrl) {
            var controllerName = prevCtrl || Lampa.Controller.enabled().name; 
            
            var items = [
                { title: 'Рекомендации', action: 'recommendations' },
                { title: 'Похожие, но лучше рейтингом', action: 'better_rating' },
                { title: 'Малоизвестные факты', action: 'facts' },
                { title: 'Краткий пересказ без спойлеров', action: 'recap_no_spoilers' },
                { title: 'Порядок просмотра', action: 'watch_order' }
            ];

            if (card.name || card.original_name) {
                items.push({ title: 'Коротко о сериале', action: 'brief_series' });
            }

            items.push({ title: 'Работы актера', action: 'actor_works' });
            items.push({ title: 'По настроению', action: 'by_mood' });

            if (card.translated_tags && card.translated_tags.length > 0) {
                items.push({ title: 'Подборки по тегам', action: 'tags' });
            }

            Lampa.Select.show({
                title: 'AI Ассистент',
                items: items,
                onSelect: function (item) {
                    setTimeout(function() {
                        if (item.action === 'recommendations') _this.actionRecommendations(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'better_rating') _this.actionBetterRating(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'facts') _this.actionFacts(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'recap_no_spoilers') _this.actionRecapNoSpoilers(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'watch_order') _this.actionWatchOrder(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'brief_series') _this.actionBriefSeries(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'actor_works') _this.actionActorWorks(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'by_mood') _this.actionByMood(card, btnElement, renderContainer, controllerName);
                        else if (item.action === 'tags') _this.actionTags(card, btnElement, renderContainer, controllerName);
                    }, 50);
                },
                onBack: function () { 
                    _this.restoreFocus(btnElement, renderContainer, controllerName);
                }
            });
        };

        this.showViewer = function(title, contentHtml, btnElement, renderContainer, controllerName) {
            var safeColor = _this.getSafeDynamicColor();
            var fontSize = Lampa.Storage.get('ai_font_size', '1.25em'); 
            
            var viewer = $('<div class="ai-viewer-container" style="--safe-text-color: ' + safeColor + '; --ai-font-size: ' + fontSize + ';">' +
                            '<div class="ai-viewer-body">' +
                                '<div class="ai-header"><div class="ai-title">' + title + '</div><div class="ai-close-btn selector">×</div></div>' +
                                '<div class="ai-content-scroll">' + contentHtml + '</div>' +
                            '</div></div>');
            $('body').append(viewer);
            
            var close = function() { 
                viewer.remove(); 
                _this.restoreFocus(btnElement, renderContainer, controllerName);
            };

            viewer.find('.ai-close-btn').on('click hover:enter', close);
            Lampa.Controller.add('ai_viewer', {
                toggle: function() { Lampa.Controller.collectionSet(viewer); Lampa.Controller.collectionFocus(viewer.find('.ai-close-btn')[0], viewer); },
                up: function() { viewer.find('.ai-content-scroll').scrollTop(viewer.find('.ai-content-scroll').scrollTop() - 100); },
                down: function() { viewer.find('.ai-content-scroll').scrollTop(viewer.find('.ai-content-scroll').scrollTop() + 100); },
                back: close
            });
            Lampa.Controller.toggle('ai_viewer');
        };

        this.actionFacts = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return; 
            var ukrT = card.title || card.name;
            var origT = card.original_title || card.original_name;
            var year = (card.release_date || card.first_air_date || '').slice(0,4);
            var type = (card.name || card.original_name) ? 'TV series' : 'movie';
            
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Поиск фактов');
            
            _this.getTMDBDetails(card, function(tmdb) {
                var p = 'Provide 6 to 10 interesting, little-known facts about the ' + type + ' "' + origT + '" (' + year + ') with ' + tmdb.leadActor + ' in the lead role, in Russian. CRITICAL RULE: If you lack verified facts in your internal database, you MUST use the Google Search tool to find reliable information. Return strictly: [{"title":"..","text":".."}]. No markdown, no intro text.';
                
                _this.askGemini(p, function(text) {
                    _this.hideStatus();
                    if (Lampa.Activity.active() && Lampa.Activity.active().component !== 'full') return; 
                    
                    var data = _this.parseJsonSafe(text);
                    if (!data) { 
                        Lampa.Noty.show('Ошибка обработки результата'); 
                        _this.restoreFocus(btn, render, ctrl);
                        return; 
                    }
                    
                    var html = (data || []).map(function(f){ 
                        var cleanText = f.text.replace(/\[\d+(?:,\s*\d+)*\]/g, '').trim();
                        return '<div style="margin-bottom:12px"><span class="ai-fact-title">'+f.title+'</span>'+cleanText+'</div>'; 
                    }).join('');
                    
                    _this.showViewer('Интересные факты: ' + ukrT, html, btn, render, ctrl);
                }, null, false, true);
            });
        };

        this.actionRecommendations = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            var limit = Lampa.Storage.get('ai_result_count', '20'), t = card.original_title || card.original_name, year = (card.release_date || card.first_air_date || '').slice(0,4);
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Анализ тайтла');
            
            _this.getTMDBDetails(card, function(tmdb) {
                var p = 'Suggest strictly ' + limit + ' movies or TV series that closely match the vibe, genre, and plot of "' + t + '" (' + year + ') with ' + tmdb.leadActor + ' in the lead role and the following plot description: "' + tmdb.overview + '".';
                _this.fetchList(p, 'Рекомендации', card, btn, render, ctrl);
            });
        };

        this.actionBetterRating = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            var limit = Lampa.Storage.get('ai_result_count', '20'), t = card.original_title || card.original_name, year = (card.release_date || card.first_air_date || '').slice(0,4);
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Поиск лучших аналогов');
            
            var p = 'Suggest strictly ' + limit + ' movies or TV series that are very similar in genre and vibe to "' + t + '" (' + year + ') BUT have a significantly higher viewer rating or critical acclaim. Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown, no intro text.';
            _this.fetchList(p, 'Лучше рейтингом', card, btn, render, ctrl);
        };

        this.actionRecapNoSpoilers = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            var ukrT = card.title || card.name, origT = card.original_title || card.original_name, year = (card.release_date || card.first_air_date || '').slice(0,4);
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Подготовка пересказа');

            var p = 'Provide a brief, engaging summary WITHOUT SPOILERS for the title "' + origT + '" (' + year + ') in Russian. Respond ONLY with a valid JSON array containing one object: [{"title": "О чем проект", "text": "Текст пересказа..."}]. No markdown.';
            
            _this.askGemini(p, function(text) {
                _this.hideStatus();
                var data = _this.parseJsonSafe(text);
                if (!data) { Lampa.Noty.show('Ошибка обработки'); _this.restoreFocus(btn, render, ctrl); return; }
                var html = (data || []).map(function(f){ return '<div>'+f.text+'</div>'; }).join('');
                _this.showViewer('Без спойлеров: ' + ukrT, html, btn, render, ctrl);
            }, null, false, true);
        };

        this.actionWatchOrder = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            var origT = card.original_title || card.original_name;
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Поиск хронологии');

            var p = 'Provide the correct chronological watch order for the entire franchise or cinematic universe related to "' + origT + '" in Russian. Respond ONLY with a valid JSON array: [{"title": "1", "text": "Название (Год)"}]. No markdown.';
            
            _this.askGemini(p, function(text) {
                _this.hideStatus();
                var data = _this.parseJsonSafe(text);
                if (!data) { Lampa.Noty.show('Хронология не найдена'); _this.restoreFocus(btn, render, ctrl); return; }
                var html = (data || []).map(function(f){ return '<div style="margin-bottom:8px"><b>'+f.title+'.</b> '+f.text+'</div>'; }).join('');
                _this.showViewer('Порядок просмотра', html, btn, render, ctrl);
            }, null, false, true);
        };

        this.actionBriefSeries = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            var ukrT = card.title || card.name, origT = card.original_title || card.original_name, year = (card.release_date || card.first_air_date || '').slice(0,4);
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Сбор информации');

            var p = 'Briefly describe the TV series "' + origT + '" (' + year + '), its main premise, target audience, and why it is worth watching, in Russian. Respond ONLY with a valid JSON array: [{"title": "О сериале", "text": "Текст..."}]. No markdown.';
            
            _this.askGemini(p, function(text) {
                _this.hideStatus();
                var data = _this.parseJsonSafe(text);
                if (!data) { Lampa.Noty.show('Ошибка обработки'); _this.restoreFocus(btn, render, ctrl); return; }
                var html = (data || []).map(function(f){ return '<div>'+f.text+'</div>'; }).join('');
                _this.showViewer('Коротко о сериале', html, btn, render, ctrl);
            }, null, false, true);
        };

        this.actionActorWorks = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            _this.updateStatus('Поиск актеров');

            var method = (card.name || card.original_name) ? 'tv' : 'movie';
            var url = Lampa.TMDB.api(method + '/' + card.id + '/credits?api_key=' + Lampa.TMDB.key());

            Lampa.Network.silent(url, function(res) {
                _this.hideStatus();
                var cast = (res.cast || []).slice(0, 10);
                if (!cast.length) { Lampa.Noty.show('Актеры не найдены'); _this.restoreFocus(btn, render, ctrl); return; }

                var items = cast.map(function(c) { return { title: c.name, subtitle: c.character }; });
                Lampa.Select.show({
                    title: 'Выберите актера',
                    items: items,
                    onSelect: function(item) {
                        var limit = Lampa.Storage.get('ai_result_count', '20');
                        var p = 'Suggest strictly ' + limit + ' best and most popular movies or TV series starring the actor "' + item.title + '". Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown.';
                        _this.fetchList(p, 'Работы: ' + item.title, card, btn, render, ctrl);
                    },
                    onBack: function() { _this.openAiMenu(card, btn, render, ctrl); }
                });
            }, function() { 
                _this.hideStatus(); 
                Lampa.Noty.show('Ошибка загрузки TMDB'); 
                _this.restoreFocus(btn, render, ctrl);
            });
        };

        this.actionByMood = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            
            var moods = [
                { title: 'Веселое и расслабляющее (Комедия)', mood: 'funny, lighthearted and relaxing' },
                { title: 'Мрачное и напряженное (Триллер/Ужасы)', mood: 'dark, tense, suspenseful and scary' },
                { title: 'Эпичное приключение (Фантастика/Фэнтези)', mood: 'epic, grand sci-fi or fantasy adventure' },
                { title: 'Сложное и философское', mood: 'mind-bending, psychological and philosophical' },
                { title: 'Романтичное и трогательное', mood: 'romantic, emotional and touching' },
                { title: 'Динамичное (Экшен)', mood: 'fast-paced action packed' }
            ];

            Lampa.Select.show({
                title: 'Выберите настроение',
                items: moods,
                onSelect: function(item) {
                    var limit = Lampa.Storage.get('ai_result_count', '20'), t = card.original_title || card.original_name, year = (card.release_date || card.first_air_date || '').slice(0,4);
                    var p = 'Suggest strictly ' + limit + ' movies or series similar to "' + t + '" (' + year + ') but specifically focusing on a "' + item.mood + '" vibe. Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown.';
                    _this.fetchList(p, 'Настроение: ' + item.title, card, btn, render, ctrl);
                },
                onBack: function() { _this.openAiMenu(card, btn, render, ctrl); }
            });
        };

        this.actionTags = function(card, btn, render, ctrl) {
            if (!_this.checkApiKey(btn, render, ctrl)) return;
            if (card.translated_tags && card.translated_tags.length > 0) {
                _this.showTagsMenu(card.translated_tags, card, btn, render, ctrl);
            } else {
                _this.restoreFocus(ctrl);
            }
        };
        
        this.translateTags = function (tags, callback) {
            var lang = Lampa.Storage.get('language', 'uk');
            tags.forEach(function(tag) { tag.orig_name = tag.name; });
            if (lang !== 'uk' && lang !== 'ru') return callback(tags);

            var tagsWithContext = tags.map(function(t) { return "Movie tag: " + t.name; });
            var url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=' + lang + '&dt=t&q=' + encodeURIComponent(tagsWithContext.join(' ||| '));

            $.ajax({
                url: url,
                dataType: 'json',
                success: function (result) {
                    try {
                        var translatedText = '';
                        if (result && result[0]) result[0].forEach(function(item) { if (item[0]) translatedText += item[0]; });
                        var translatedArray = translatedText.split('|||');
                        tags.forEach(function(tag, index) {
                            if (translatedArray[index]) {
                                tag.name = translatedArray[index]
                                    .replace(/позначка до фільму[:\s]*/gi, '')
                                    .replace(/тег до фільму[:\s]*/gi, '')
                                    .replace(/тег фільму[:\s]*/gi, '')
                                    .replace(/тег к фильму[:\s]*/gi, '')
                                    .replace(/тег фильма[:\s]*/gi, '')
                                    .replace(/movie tag[:\s]*/gi, '')
                                    .replace(/^[:\s\-]*/, '')
                                    .trim();
                            }
                        });
                        callback(tags);
                    } catch (e) { callback(tags); }
                },
                error: function () { callback(tags); }
            });
        };

        this.showTagsMenu = function(tags, card, btn, render, ctrl) {
            var items = tags.map(function(tag) {
                return { title: tag.name.charAt(0).toUpperCase() + tag.name.slice(1), tag_data: tag };
            });

            Lampa.Select.show({
                title: 'Выберите тег',
                items: items,
                onSelect: function (item) {
                    var limit = Lampa.Storage.get('ai_result_count', '20');
                    var p = 'Suggest strictly ' + limit + ' movies or TV series that are strongly associated with the specific TMDB keyword: "' + item.tag_data.orig_name + '".';
                    _this.fetchList(p, 'Тег: ' + item.title, card, btn, render, ctrl);
                },
                onBack: function () { _this.openAiMenu(card, btn, render, ctrl); }
            });
        };

        this.askGemini = function(p, onSuccess, onError, isSilent, useSearch) {
            var rawValue = Lampa.Storage.get(STORAGE_KEY, '');
            if (!rawValue) {
                if (!isSilent) Lampa.Noty.show('ШИ спит 😴 Добавьте API ключ в настройках, чтобы разбудить его');
                if (onError) onError();
                return;
            }

            var keys = rawValue.split(',').map(function(k) { return k.trim(); }).filter(Boolean);
            var primaryModel = Lampa.Storage.get('ai_model', 'gemini-2.5-flash-lite');
            
            var fallbackMode = Lampa.Storage.get('ai_fallback_mode', 'off');
            var fallbackList = Lampa.Storage.get('ai_fallback_list', []);
            var fallbackChecked = Lampa.Storage.get('ai_fallback_checked', []);
            
            var requestQueue = [];
            
            keys.forEach(function(k) {
                requestQueue.push({ model: primaryModel, key: k });
            });
            
            if (fallbackMode !== 'off') {
                var modelsToAdd = [];
                if (fallbackMode === 'all') {
                    fallbackList.forEach(function(mId) {
                        if (mId !== primaryModel && AI_MODELS_LIST.find(function(am){return am.id === mId})) modelsToAdd.push(mId);
                    });
                    AI_MODELS_LIST.forEach(function(m) {
                        if (m.id !== primaryModel && modelsToAdd.indexOf(m.id) === -1) modelsToAdd.push(m.id);
                    });
                } else if (fallbackMode === 'custom') {
                    fallbackList.forEach(function(mId) {
                        if (mId !== primaryModel && fallbackChecked.indexOf(mId) !== -1) modelsToAdd.push(mId);
                    });
                }
                
                modelsToAdd.forEach(function(modelId) {
                    keys.forEach(function(k) {
                        requestQueue.push({ model: modelId, key: k });
                    });
                });
            }

            var attemptRequest = function(queueIndex) {
                if (queueIndex >= requestQueue.length) {
                    if (!isSilent) {
                        _this.hideStatus();
                        Lampa.Noty.show('Сервис недоступен или лимиты исчерпаны');
                        _this.restoreFocus(window.ai_active_controller);
                    }
                    if (onError) onError('All attempts failed');
                    return;
                }

                var task = requestQueue[queueIndex];
                var targetModel = task.model;
                var currentKey = task.key;
                
                var payload = { contents: [{ parts: [{ text: p }] }] };
                if (useSearch && targetModel.indexOf('gemini') === 0 && targetModel.indexOf('gemini-3') === -1) {
                    payload.tools = [{ googleSearch: {} }];
                }

                fetch('https://generativelanguage.googleapis.com/v1beta/models/' + targetModel + ':generateContent?key=' + currentKey, {
                    method: "POST",
                    body: JSON.stringify(payload)
                }).then(function(r) {
                    return r.json().then(function(json) { return { status: r.status, ok: r.ok, data: json }; });
                }).then(function(res) {
                    if (res.status === 429 || res.status === 503) {
                        if (res.status === 503) console.log('AI Assistant: Server 503, trying next from queue...');
                        return attemptRequest(queueIndex + 1);
                    }

                    if (!res.ok) throw new Error(res.data.error ? res.data.error.message : 'Unknown error');
                    
                    if (res.data.candidates && res.data.candidates[0].content) {
                        var fullText = res.data.candidates[0].content.parts.map(function(part) { return part.text || ""; }).join("\n");
                        onSuccess(fullText);
                    } else { throw new Error('Empty response'); }

                }).catch(function(e) {
                    return attemptRequest(queueIndex + 1);
                });
            };

            attemptRequest(0);
        };

        this.parseJsonSafe = function(text) {
            if (!text) return null;
            try { 
                return JSON.parse(text); 
            } catch (e) {
                var regex = /\[[\s\S]*?\]/g; 
                var match;
                while ((match = regex.exec(text)) !== null) {
                    try {
                        var result = JSON.parse(match[0]);
                        if (Array.isArray(result) && result.length > 0) return result;
                    } catch (e3) {}
                }
                var clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
                try { return JSON.parse(clean); } catch (e2) {}
            }
            return null; 
        };

        this.showFallbackSelector = function() {
            var primaryModel = Lampa.Storage.get('ai_model', 'gemini-2.5-flash-lite');
            var mode = Lampa.Storage.get('ai_fallback_mode', 'off'); 
            var savedList = Lampa.Storage.get('ai_fallback_list', []);
            var savedChecked = Lampa.Storage.get('ai_fallback_checked', []);
            
            var availableModels = AI_MODELS_LIST.filter(function(m) { return m.id !== primaryModel; });
            
            var workingList = [];
            savedList.forEach(function(savedId) {
                var found = availableModels.find(function(m) { return m.id === savedId; });
                if (found) workingList.push({ id: found.id, name: found.name, checked: (mode === 'all' || (mode === 'custom' && savedChecked.indexOf(found.id) !== -1)) });
            });
            availableModels.forEach(function(m) {
                if (!workingList.find(function(w) { return w.id === m.id; })) {
                    workingList.push({ id: m.id, name: m.name, checked: mode === 'all' });
                }
            });

            var listContainer = $('<div class="menu-edit-list ai-fallback-list" style="padding-bottom:10px;"></div>');
            var svgUp = '<svg width="16" height="10" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L11 3L20 12" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
            var svgDown = '<svg width="16" height="10" viewBox="0 0 22 14" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 2L11 11L20 2" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>';
            var svgCheck = '<svg width="22" height="22" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.89111" y="1.78369" width="21.793" height="21.793" rx="3.5" stroke="currentColor" stroke-width="3"/><path d="M7.44873 12.9658L10.8179 16.3349L18.1269 9.02588" stroke="currentColor" stroke-width="3" class="dot" stroke-linecap="round"/></svg>';
            var svgRadioOn = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="5" fill="currentColor"/></svg>';
            var svgRadioOff = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';

            var topControls = $('<div style="display:flex; justify-content:space-around; margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid rgba(255,255,255,0.1);">' +
                '<div class="fallback-ctrl-btn selector" data-action="off" style="padding: 8px 15px; border-radius: 8px; display:flex; align-items:center; gap:8px;"></div>' +
                '<div class="fallback-ctrl-btn selector" data-action="all" style="padding: 8px 15px; border-radius: 8px; display:flex; align-items:center; gap:8px;"></div>' +
            '</div>');
            listContainer.append(topControls);

            var modelsContainer = $('<div></div>');
            listContainer.append(modelsContainer);

            function updateUIState() {
                var isOff = mode === 'off';
                var isAll = mode === 'all';
                topControls.find('[data-action="off"]').html((isOff?svgRadioOn:svgRadioOff) + ' Выключить').css('color', isOff?'#f55':'');
                topControls.find('[data-action="all"]').html((isAll?svgRadioOn:svgRadioOff) + ' Все').css('color', isAll?'#4b5':'');
                
                modelsContainer.find('.source-item').each(function() {
                    var id = $(this).attr('data-id');
                    var itm = workingList.find(function(w){return w.id===id;});
                    if (isOff) itm.checked = false;
                    else if (isAll) itm.checked = true;
                    
                    $(this).find('.dot').attr('opacity', itm.checked ? 1 : 0);
                    $(this).find('.source-name').css('opacity', itm.checked ? '1' : '0.4');
                });
                updateArrowsState();
            }

            function updateArrowsState() {
                var items = modelsContainer.find('.source-item');
                items.each(function(idx) {
                    $(this).find('.move-up').css('opacity', idx === 0 ? '0.2' : '1');
                    $(this).find('.move-down').css('opacity', idx === items.length - 1 ? '0.2' : '1');
                });
            }

            topControls.find('[data-action="off"]').on('hover:enter', function() { mode = 'off'; updateUIState(); });
            topControls.find('[data-action="all"]').on('hover:enter', function() { mode = 'all'; updateUIState(); });

            workingList.forEach(function(src) {
                var itemSort = $('<div class="source-item" data-id="' + src.id + '" style="display:flex; align-items:center; justify-content:space-between; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.05);">' +
                    '<div class="source-name" style="font-size:15px; opacity: ' + (src.checked ? '1' : '0.4') + ';">' + src.name + '</div>' +
                    '<div style="display:flex; gap:8px; align-items:center;">' +
                        '<div class="move-up selector" style="padding:6px; border-radius:6px; display:flex; align-items:center;">' + svgUp + '</div>' +
                        '<div class="move-down selector" style="padding:6px; border-radius:6px; display:flex; align-items:center;">' + svgDown + '</div>' +
                        '<div class="toggle selector" style="padding:4px; border-radius:6px; margin-left:5px; display:flex; align-items:center;">' + svgCheck + '</div>' +
                    '</div></div>');
                
                itemSort.find('.dot').attr('opacity', src.checked ? 1 : 0);
                itemSort.find('.move-up').on('hover:enter', function() { var p = itemSort.prev(); if(p.length){ itemSort.insertBefore(p); updateArrowsState(); }});
                itemSort.find('.move-down').on('hover:enter', function() { var n = itemSort.next(); if(n.length){ itemSort.insertAfter(n); updateArrowsState(); }});
                itemSort.find('.toggle').on('hover:enter', function() { 
                    src.checked = !src.checked;
                    if (src.checked) {
                        var allChecked = workingList.every(function(w){return w.checked;});
                        mode = allChecked ? 'all' : 'custom';
                    } else {
                        var noneChecked = workingList.every(function(w){return !w.checked;});
                        mode = noneChecked ? 'off' : 'custom';
                    }
                    updateUIState();
                });
                modelsContainer.append(itemSort);
            });

            updateUIState();

            Lampa.Modal.open({ 
                title: 'Автопереключение моделей', html: listContainer, size: 'small', scroll_to_center: true, 
                onBack: function() {
                    var finalOrder = [];
                    var finalSavedChecked = [];
                    modelsContainer.find('.source-item').each(function() {
                        var id = $(this).attr('data-id');
                        var s = workingList.find(function(x) { return x.id === id; });
                        if (s) {
                            finalOrder.push(s.id);
                            if (s.checked) finalSavedChecked.push(s.id);
                        }
                    });
                    
                    if (mode === 'all') Lampa.Storage.set('ai_fallback_mode', 'all');
                    else if (mode === 'off') Lampa.Storage.set('ai_fallback_mode', 'off');
                    else Lampa.Storage.set('ai_fallback_mode', finalSavedChecked.length > 0 ? 'custom' : 'off');
                    
                    Lampa.Storage.set('ai_fallback_list', finalOrder);
                    Lampa.Storage.set('ai_fallback_checked', finalSavedChecked);
                    
                    Lampa.Modal.close(); 
                    Lampa.Controller.toggle('settings_component');
                }
            });
        };
        
        this.processAiList = function(list, callback) {
            var results = [], processed = 0;
            
            if (!window.ai_pagination.exclude_ids) window.ai_pagination.exclude_ids = [];
            
            if (!list || !list.length) return callback(results);
            
            list.forEach(function(item) {
                var q = encodeURIComponent(item.orig || item.uk);
                Lampa.Network.silent(Lampa.TMDB.api('search/multi?query=' + q + '&api_key=' + Lampa.TMDB.key() + '&language=ru-RU'), function(res) {
                    processed++;
                    if (res.results && res.results[0]) {
                        var b = res.results[0];
                        if (b.media_type !== 'person' && window.ai_pagination.exclude_ids.indexOf(b.id) === -1) { 
                            window.ai_pagination.exclude_ids.push(b.id); 
                            b.source = 'tmdb'; 
                            results.push(b); 
                        }
                    }
                    if (processed === list.length) callback(results);
                });
            });
        };
        
        this.fetchNextPageData = function(callback, isSilent) {
            var limit = Lampa.Storage.get('ai_result_count', '20');
            var exclusions = window.ai_pagination.exclude_list.slice(-50).join(', ');
            var p = window.ai_pagination.base_prompt + ' IMPORTANT: You MUST EXCLUDE these titles from your suggestions: ' + exclusions + '. Provide strictly NEW ' + limit + ' suggestions. Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown, no intro text.';

            _this.askGemini(p, function(text) {
                var list = _this.parseJsonSafe(text);
                if (!list || !list.length) { callback(null, null); return; }
                _this.processAiList(list, function(results) {
                    callback(list, results);
                });
            }, function() { callback(null, null); }, isSilent);
        };

        this.preloadNextPage = function() {
            if (window.ai_pagination.is_preloading) return;
            window.ai_pagination.is_preloading = true;
            _this.fetchNextPageData(function(list, results) {
                if (results && results.length) {
                    window.ai_pagination.preloaded_results = results;
                    window.ai_pagination.preloaded_raw_list = list;
                }
                window.ai_pagination.is_preloading = false;
            }, true);
        };

        this.loadMore = function(activeActivity) {
            if (window.ai_pagination.is_loading) return;
            window.ai_active_controller = Lampa.Controller.enabled().name;
            
            var renderResults = function(results, rawList) {
                rawList.forEach(function(i) { window.ai_pagination.exclude_list.push(i.orig || i.uk); });
                window.ai_pagination.preloaded_results = null;
                window.ai_pagination.preloaded_raw_list = null;
                window.ai_pagination.is_loading = false;
                _this.hideStatus();
                
                if (!results.length) { 
                    Lampa.Noty.show('Больше ничего не найдено'); 
                    if (window.ai_active_controller) Lampa.Controller.toggle(window.ai_active_controller);
                    return; 
                }

                window.ai_cached_results = window.ai_cached_results.filter(function(r) { return !r.is_load_more; });
                window.ai_cached_results = window.ai_cached_results.concat(results);
                window.ai_cached_results.push({ 
                    id: 'ai_load_more', is_load_more: true, name: '',
                    poster: 'https://bodya-elven.github.io/different/icons/more.webp',
                    img: 'https://bodya-elven.github.io/different/icons/more.webp'
                });

                if (activeActivity && activeActivity.activity) {
                    var act = activeActivity.activity;
                    var rnder = act.render();
                    
                    var oldBtn = rnder.find('.item[data-id="ai_load_more"]');
                    if (oldBtn.length) oldBtn.remove();
                    
                    var items_to_append = results.slice();
                    items_to_append.push({ 
                        id: 'ai_load_more', is_load_more: true, name: '',
                        poster: 'https://bodya-elven.github.io/different/icons/more.webp',
                        img: 'https://bodya-elven.github.io/different/icons/more.webp' 
                    });

                    if (act.append) {
                        act.append(items_to_append);
                        setTimeout(function() {
                            var firstNewId = results[0].id;
                            var cardToFocus = rnder.find('.item[data-id="' + firstNewId + '"]');
                            if (cardToFocus.length) Lampa.Controller.collectionFocus(cardToFocus[0], rnder[0]);
                        }, 100);
                    } else {
                        Lampa.Activity.replace({ url: 'ai_assistant_list', title: activeActivity.title, component: 'category_full', source: 'ai_assistant_list', page: 1 });
                    }
                }
                setTimeout(function() { _this.preloadNextPage(); }, 1000);
            };

            if (window.ai_pagination.preloaded_results) {
                window.ai_pagination.is_loading = true;
                renderResults(window.ai_pagination.preloaded_results, window.ai_pagination.preloaded_raw_list);
            } else if (window.ai_pagination.is_preloading) {
                window.ai_pagination.is_loading = true;
                _this.updateStatus('Подбор результатов...');
                var waitInterval = setInterval(function() {
                    if (window.ai_pagination.preloaded_results) {
                        clearInterval(waitInterval);
                        renderResults(window.ai_pagination.preloaded_results, window.ai_pagination.preloaded_raw_list);
                    } else if (!window.ai_pagination.is_preloading) {
                        clearInterval(waitInterval);
                        window.ai_pagination.is_loading = false;
                        _this.hideStatus();
                        Lampa.Noty.show('Ошибка подбора, попробуйте еще раз');
                        if (window.ai_active_controller) Lampa.Controller.toggle(window.ai_active_controller);
                    }
                }, 500);
            } else {
                window.ai_pagination.is_loading = true;
                _this.updateStatus('Подбор результатов...');
                _this.fetchNextPageData(function(list, results) {
                    if(results && results.length) renderResults(results, list);
                    else { 
                        window.ai_pagination.is_loading = false; 
                        _this.hideStatus(); 
                        Lampa.Noty.show('Ничего не найдено'); 
                        if (window.ai_active_controller) Lampa.Controller.toggle(window.ai_active_controller);
                    }
                }, false);
            }
        };

        this.fetchList = function(base_prompt_task, title, card, btn, render, ctrl) {
            window.ai_pagination = { base_prompt: base_prompt_task, exclude_list: [], exclude_ids: [], preloaded_results: null, preloaded_raw_list: null, is_loading: false, is_preloading: false };
            
            window.ai_cached_results = [];
            window.ai_active_controller = ctrl || Lampa.Controller.enabled().name;
            
            var full_prompt = base_prompt_task + ' Respond ONLY with a valid JSON array: [{"uk":"Назва","orig":"Original Title","year":Year}]. No markdown, no intro text.';

            _this.updateStatus('Подбор результатов');
            _this.askGemini(full_prompt, function(text) {
                var list = _this.parseJsonSafe(text);
                
                if (Lampa.Activity.active().component !== 'full') {
                    _this.hideStatus();
                    return; 
                }

                if (!list || !list.length) { 
                    _this.hideStatus(); 
                    Lampa.Noty.show('Ничего не найдено или ошибка парсинга'); 
                    if (window.ai_active_controller) Lampa.Controller.toggle(window.ai_active_controller);
                    return; 
                }

                list.forEach(function(i) { window.ai_pagination.exclude_list.push(i.orig || i.uk); });

                _this.processAiList(list, function(results) {
                    _this.hideStatus();
                    if (Lampa.Activity.active().component !== 'full') return; 

                    if (!results.length) { 
                        Lampa.Noty.show('Ничего не найдено'); 
                        if (window.ai_active_controller) Lampa.Controller.toggle(window.ai_active_controller);
                        return; 
                    }

                    window.ai_cached_results = results;
                    window.ai_cached_results.push({ 
                        id: 'ai_load_more', is_load_more: true, name: '',
                        poster: 'https://bodya-elven.github.io/different/icons/more.webp',
                        img: 'https://bodya-elven.github.io/different/icons/more.webp'
                    });

                    Lampa.Activity.push({ url: 'ai_assistant_list', title: title, component: 'category_full', source: 'ai_assistant_list', page: 1 });
                    
                    setTimeout(function() { _this.preloadNextPage(); }, 1000);
                });
            }, null, false);
        };

        this.updateStatus = function(text) {
            if (!statusBox) {
                $('body').append('<div id="ai-assist-status"><div class="ai-toast"><div class="ai-spinner"></div><span class="status-text"></span></div></div>');
                statusBox = $('#ai-assist-status');
            }
            statusBox.find('.status-text').text(text);
            statusBox.fadeIn(200);
        };
        
        this.hideStatus = function() { 
            if(statusBox) statusBox.fadeOut(500); 
        };

        this.checkApiKey = function(btn, render, ctrl) {
            var rawValue = Lampa.Storage.get(STORAGE_KEY, '');
            if (!rawValue) {
                Lampa.Noty.show('ШИ спит 😴 Добавьте API ключ в настройках, чтобы разбудить его');
                if (btn && render) _this.restoreFocus(btn, render, ctrl);
                return false;
            }
            return true;
        };

        this.setupSettings = function() {
            Lampa.SettingsApi.addComponent({ component: 'ai_assistant_cfg', name: 'AI Ассистент', icon: PLUGIN_ICON });
            
            Lampa.SettingsApi.addParam({ 
                component: 'ai_assistant_cfg', param: { name: 'ai_key_trigger', type: 'trigger' }, 
                field: { name: 'Gemini API key', description: 'Получите ключ на aistudio.google.com/api-keys. Можно указать несколько через запятую' }, 
                onRender: function(item) {
                    var updateText = function() { var val = Lampa.Storage.get(STORAGE_KEY, ''); item.find('.settings-param__value').text(val ? 'Да' : 'Нет').css('color', val ? '#4b5' : '#f55'); };
                    updateText();
                    item.on('hover:enter', function() { Lampa.Input.edit({ title: 'Gemini API key', value: Lampa.Storage.get(STORAGE_KEY, ''), free: true }, function(v) { if(v !== undefined){ Lampa.Storage.set(STORAGE_KEY, v.trim()); updateText(); } }); });
                }
            });
            
            var modelValues = {};
            AI_MODELS_LIST.forEach(function(m) { modelValues[m.id] = '\u200B' + m.name; });

            var currentPrimaryModel = Lampa.Storage.get('ai_model', 'gemini-2.5-flash-lite');

            Lampa.SettingsApi.addParam({ 
                component: 'ai_assistant_cfg', 
                param: { name: 'ai_model', type: 'select', values: modelValues, default: 'gemini-2.5-flash-lite' }, 
                field: { name: 'Основная модель' },
                onChange: function(newModel) {
                    if (newModel !== currentPrimaryModel) {
                        var list = Lampa.Storage.get('ai_fallback_list', []);
                        var checked = Lampa.Storage.get('ai_fallback_checked', []);
                        
                        var listIdx = list.indexOf(newModel);
                        if (listIdx !== -1) {
                            list[listIdx] = currentPrimaryModel;
                        } else {
                            list.push(currentPrimaryModel);
                        }
                        
                        var checkedIdx = checked.indexOf(newModel);
                        if (checkedIdx !== -1) {
                            checked[checkedIdx] = currentPrimaryModel;
                        }
                        
                        Lampa.Storage.set('ai_fallback_list', list);
                        Lampa.Storage.set('ai_fallback_checked', checked);
                   
                        currentPrimaryModel = newModel;
                    }
                }
            });

            Lampa.SettingsApi.addParam({ 
                component: 'ai_assistant_cfg', 
                param: { type: 'button', name: 'ai_fallback_trigger' }, 
                field: { name: 'Автопереключение моделей', description: 'Резервные модели в случае исчерпания лимитов или ошибок' }, 
                onChange: function() { _this.showFallbackSelector(); } 
            });

            Lampa.SettingsApi.addParam({ component: 'ai_assistant_cfg', param: { name: 'ai_result_count', type: 'select', values: { '10':'10','20':'20','30':'30','50':'50' }, default: '20' }, field: { name: 'Количество результатов' } });
            
            Lampa.SettingsApi.addParam({ 
                component: 'ai_assistant_cfg', 
                param: { 
                    name: 'ai_font_size', 
                    type: 'select', 
                    values: { '1.1em':'1.1em','1.2em':'1.2em','1.3em':'1.3em','1.4em':'1.4em','1.5em':'1.5em','1.6em':'1.6em' }, 
                    default: '1.2em' 
                }, 
                field: { name: 'Размер текста' } 
            });
        };
    }

var pluginManifest = {
    type: 'other',
    version: '3.5',
    name: 'AI Ассистент',
    description: 'Ваш персональный ИИ помощник',
    author: '@bodya_elven',
    icon: PLUGIN_ICON
};

if (Lampa.Manifest && Lampa.Manifest.plugins) {
    Lampa.Manifest.plugins.ai_assistant = pluginManifest;
}

if (!window.plugin_ai_assistant_instance) {
    window.plugin_ai_assistant_instance = new AIAssistantPlugin();
    if (window.appready) window.plugin_ai_assistant_instance.init();
    else Lampa.Listener.follow('app', function(e) { if (e.type == 'ready') window.plugin_ai_assistant_instance.init(); });
}
})();
