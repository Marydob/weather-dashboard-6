import { StorageService } from './storage.js';
import { WeatherApiService } from './weather-api.js';
import { WIDGETS, WIDGET_META, icon } from './widgets.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const dateLabel = () => new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

export class DashboardManager {
  constructor(root) {
    this.root = root;
    this.state = StorageService.load();
    this.busy = new Set();
    this.controllers = new Map();
    this.searchResults = [];
    this.searchTimer = null;
    this.searchBusy = false;
    this.init();
  }
  init() {
    this.render();
    this.bindEvents();
    this.refresh('current');
    this.refresh('hourly');
  }
  persist() { StorageService.save(this.state); }
  render() {
    const city = this.state.city;
    this.root.innerHTML = `<main class="app-shell"><header class="topbar"><a class="brand" href="#" aria-label="Weather — на главную"><span class="brand-mark">${icon('cloud-sun',22)}</span><span>weather<span class="brand-dot">.</span></span></a><div class="top-date"><span class="date-day">${esc(dateLabel())}</span><span class="date-caption">Ваш личный прогноз</span></div><div class="top-controls"><form class="search-form" id="city-search" role="search"><span class="search-icon">${icon('search',18)}</span><input id="city-input" name="city" value="${esc(city.name)}" placeholder="Найти город" autocomplete="off" aria-label="Поиск города"/><button type="submit" aria-label="Найти город">${icon('search',17)}</button><div class="search-results" id="search-results" hidden></div></form><div class="unit-toggle" aria-label="Единицы температуры"><button data-unit="C" class="${this.state.unit==='C'?'active':''}" aria-pressed="${this.state.unit==='C'}">°C</button><button data-unit="F" class="${this.state.unit==='F'?'active':''}" aria-pressed="${this.state.unit==='F'}">°F</button></div><div class="add-wrap"><button class="add-widget-btn" id="add-widget" aria-expanded="false">${icon('plus',17)}<span>Добавить виджет</span></button><div class="add-menu" id="add-menu" hidden>${Object.entries(WIDGET_META).map(([key,m])=>`<button class="add-option" data-add="${key}"><span class="option-icon">${icon(m.icon,18)}</span><span><strong>${m.title}</strong><small>${m.desc}</small></span><span class="option-plus">${icon('plus',15)}</span></button>`).join('')}</div></div></div></header>
      <section class="welcome-row"><div><div class="welcome-kicker"><span class="live-dot"></span> ВАША ПОГОДА СЕГОДНЯ</div><h1>Добрый день<span class="welcome-period">.</span></h1><p>Пусть день будет лёгким — мы позаботились о прогнозе.</p></div><div class="welcome-city"><div class="city-pin">${icon('compass',19)}</div><div><strong id="city-heading">${esc(city.name)}</strong><span id="city-subheading">${esc(city.country)} · местное время</span></div></div></section>
      <section class="favorites-panel" aria-label="Избранные города"><div class="favorites-heading"><span>ИЗБРАННЫЕ ГОРОДА</span><small>Быстрый доступ к погоде</small></div><div class="favorite-list">${(this.state.favorites||[]).map((f,i)=>`<div class="favorite-city ${f.latitude===city.latitude&&f.longitude===city.longitude?'selected':''}"><button class="favorite-select" data-favorite="${i}" title="Показать погоду: ${esc(f.name)}"><span class="favorite-dot"></span><span>${esc(f.name)}</span><small>${esc(f.country)}</small></button><button class="favorite-remove" data-remove-favorite="${i}" aria-label="Убрать ${esc(f.name)} из избранного" title="Убрать из избранного">×</button></div>`).join('')}<button class="favorite-add" id="favorite-add" title="Добавить текущий город в избранное">${icon('plus',15)}<span>Сохранить город</span></button></div></section>
      <section class="dashboard-grid" id="dashboard-grid" aria-label="Погодные виджеты">${this.state.widgets.map(type=>this.widgetHtml(type)).join('')}</section><footer class="app-footer"><span>${icon('heart',14)} Сделано для спокойных дней</span><span>Погодные данные: Open-Meteo${import.meta.env.VITE_OPENWEATHER_API_KEY ? ' · OpenWeather' : ''}</span></footer><div class="toast" id="toast" role="status" aria-live="polite"></div></main>`;
    this.applyWidgetOrder();
  }
  widgetHtml(type) { const Ctor = WIDGETS[type]; return Ctor ? new Ctor(this).render() : ''; }
  applyWidgetOrder() { const grid=this.root.querySelector('#dashboard-grid'); if (!grid) return; this.state.widgets.forEach(type=>{const el=grid.querySelector(`[data-widget="${type}"]`); if(el) grid.appendChild(el);}); }
  bindEvents() {
    this.root.addEventListener('click', e => {
      const unit = e.target.closest('[data-unit]'); if (unit) { this.state.unit=unit.dataset.unit; this.persist(); this.render(); return; }
      const add = e.target.closest('#add-widget'); if (add) { const menu=this.root.querySelector('#add-menu'); menu.hidden=!menu.hidden; add.setAttribute('aria-expanded',String(!menu.hidden)); return; }
      const option = e.target.closest('[data-add]'); if(option) { this.addWidget(option.dataset.add); return; }
      const action=e.target.closest('[data-action]'); if(action) { const type=action.dataset.type; if(action.dataset.action==='refresh') this.refresh(type); if(action.dataset.action==='collapse') this.toggleCollapse(type); if(action.dataset.action==='remove') this.removeWidget(type); if(action.dataset.action==='toggle-task') this.toggleTask(action.dataset.id); if(action.dataset.action==='delete-task') this.deleteTask(action.dataset.id); return; }
      const addFavResult=e.target.closest('[data-add-result-favorite]'); if(addFavResult){this.addFavorite(this.searchResults[Number(addFavResult.dataset.addResultFavorite)]);return;}
      const result=e.target.closest('[data-result]'); if(result) this.selectCity(Number(result.dataset.result));
      const fav=e.target.closest('[data-favorite]'); if(fav) this.chooseCity(this.state.favorites[Number(fav.dataset.favorite)]);
      const removeFav=e.target.closest('[data-remove-favorite]'); if(removeFav){const i=Number(removeFav.dataset.removeFavorite);this.state.favorites.splice(i,1);this.persist();this.render();return;}
      if(e.target.closest('#favorite-add')){this.addFavorite(this.state.city);return;}
      if(!e.target.closest('.add-wrap')) { const menu=this.root.querySelector('#add-menu'); if(menu) menu.hidden=true; const b=this.root.querySelector('#add-widget'); if(b)b.setAttribute('aria-expanded','false'); }
      if(!e.target.closest('.search-form')) this.hideResults();
    });
    this.root.addEventListener('submit', e=>{
      if(e.target.matches('#city-search')) { e.preventDefault(); this.searchCity(this.root.querySelector('#city-input').value, true); }
      if(e.target.matches('[data-form="todo"]')) { e.preventDefault(); const input=e.target.elements.task; const text=input.value.trim(); if(text){this.state.tasks.push({id:crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,text,done:false});this.persist();this.updateWidget('todo');} }
    });
    this.root.addEventListener('input', e=>{ if(e.target.id==='city-input'){clearTimeout(this.searchTimer); const value=e.target.value.trim(); if(value.length<2){this.hideResults();return;} this.searchTimer=setTimeout(()=>this.searchCity(value,false),350); } });
    this.root.addEventListener('keydown', e=>{ if(e.key==='Escape'){this.hideResults();const menu=this.root.querySelector('#add-menu');if(menu)menu.hidden=true;} });
  }
  async refresh(type) {
    if(this.busy.has(type)) return;
    if(!['current','hourly','weekly','details','todo'].includes(type)) return;
    if(type==='todo') { this.updateWidget(type); return; }
    this.busy.add(type);
    const controller = new AbortController();
    this.controllers.set(type, controller);
    if (type === 'current') { delete this.state.cache.currentError; this.updateWidget('current'); }
    try {
      if(type==='current'||type==='weekly'||type==='details') {
        const cityAtRequest = { ...this.state.city };
        const data=await WeatherApiService.getOpenMeteo(cityAtRequest, { signal: controller.signal });
        if (controller.signal.aborted || !this.state.widgets.includes(type) || cityAtRequest.latitude !== this.state.city.latitude || cityAtRequest.longitude !== this.state.city.longitude) return;
        this.state.cache.current=data;
        this.state.cache.currentUpdated=Date.now();
        this.updateWidget('current');this.updateWidget('weekly');this.updateWidget('details');
        const heading=this.root.querySelector('#city-heading'), sub=this.root.querySelector('#city-subheading'); if(heading)heading.textContent=this.state.city.name;if(sub)sub.textContent=`${this.state.city.country} · местное время`;
      } else if(type==='hourly') {
        const cityAtRequest = { ...this.state.city };
        const result=await WeatherApiService.getHourlyForecast(cityAtRequest, { signal: controller.signal });
        if (controller.signal.aborted || !this.state.widgets.includes(type) || cityAtRequest.latitude !== this.state.city.latitude || cityAtRequest.longitude !== this.state.city.longitude) return;
        this.state.cache.hourly={...result};
        this.updateWidget('hourly');
      }
      this.persist();
    } catch(error) {
      if (error.name === 'AbortError' || controller.signal.aborted) return;
      const message=error.name==='TimeoutError'?'Превышено время ожидания. Проверьте соединение.':(error.message||'Не удалось загрузить данные.');
      if(type==='hourly') this.state.cache.hourly={...(this.state.cache.hourly||{}),error:message};
      else if(type === 'current' && !this.state.cache.current) this.state.cache.currentError = message;
      else if(this.state.cache.current) this.state.cache.currentStale=true;
      this.updateWidget(type); this.toast(message);
    } finally { if (this.controllers.get(type) === controller) { this.controllers.delete(type); this.busy.delete(type); } }
  }
  updateWidget(type) { const old=this.root.querySelector(`[data-widget="${type}"]`); if(!old)return; old.outerHTML=this.widgetHtml(type); this.applyWidgetOrder(); }
  addWidget(type) {
    if(!WIDGETS[type])return;
    if(this.state.widgets.includes(type)){this.toast('Этот виджет уже добавлен.');return;}
    this.state.widgets.push(type); this.persist();
    const grid=this.root.querySelector('#dashboard-grid');grid.insertAdjacentHTML('beforeend',this.widgetHtml(type));
    const menu=this.root.querySelector('#add-menu');if(menu)menu.hidden=true;const b=this.root.querySelector('#add-widget');if(b)b.setAttribute('aria-expanded','false');
    if(type!=='todo')this.refresh(type); this.toast('Виджет добавлен.');
  }
  removeWidget(type) { if(!this.state.widgets.includes(type))return; if(!confirm(`Удалить виджет «${WIDGET_META[type].title}» с панели?`))return;this.controllers.get(type)?.abort();this.controllers.delete(type);this.busy.delete(type);this.state.widgets=this.state.widgets.filter(x=>x!==type);delete this.state.collapsed[type];this.persist();this.root.querySelector(`[data-widget="${type}"]`)?.remove();this.toast('Виджет удалён.'); }
  toggleCollapse(type) { this.state.collapsed[type]=!this.state.collapsed[type];this.persist();this.updateWidget(type); }
  toggleTask(id) { const task=this.state.tasks.find(t=>t.id===id);if(task)task.done=!task.done;this.persist();this.updateWidget('todo'); }
  deleteTask(id) { this.state.tasks=this.state.tasks.filter(t=>t.id!==id);this.persist();this.updateWidget('todo'); }
  async searchCity(query, submit) {
    if(!query.trim()||query.trim().length<2){if(submit)this.toast('Введите название города.');return;}
    if(this.searchBusy)return;this.searchBusy=true;
    try {
      const results=await WeatherApiService.searchCity(query);
      if(!results.length){this.searchResults=[];this.showResults('<div class="search-empty">Город не найден. Попробуйте другое название.</div>');return;}
      this.searchResults=results;
      if(submit&&results.length===1){this.chooseCity(results[0]);return;}
      this.showResults(results.map((r,i)=>`<div class="search-result-row"><button class="search-result" data-result="${i}"><span class="result-pin">${icon('compass',17)}</span><span><strong>${esc(r.name)}</strong><small>${esc([r.admin1,r.country].filter(Boolean).join(', '))}</small></span></button><button class="result-fav" data-add-result-favorite="${i}" title="Добавить в избранное" aria-label="Добавить ${esc(r.name)} в избранное">${icon('plus',16)}</button></div>`).join(''));
    } catch(error){this.toast(error.message||'Не удалось найти город.');this.hideResults();}
    finally{this.searchBusy=false;}
  }
  showResults(html){const box=this.root.querySelector('#search-results');if(box){box.innerHTML=html;box.hidden=false;}}
  hideResults(){const box=this.root.querySelector('#search-results');if(box)box.hidden=true;}
  selectCity(index){const city=this.searchResults[index];if(city)this.chooseCity(city);}
  chooseCity(city){for (const controller of this.controllers.values()) controller.abort();this.controllers.clear();this.busy.clear();this.state.city=city;this.state.cache.current=null;this.state.cache.currentError=null;this.state.cache.hourly=null;this.state.cache.currentStale=false;this.persist();this.hideResults();const input=this.root.querySelector('#city-input');if(input)input.value=city.name;this.refresh('current');this.refresh('hourly');this.toast(`Загружаем погоду для ${city.name}.`);}
  addFavorite(city){if(!city)return;const exists=(this.state.favorites||[]).some(f=>f.latitude===city.latitude&&f.longitude===city.longitude);if(exists){this.toast('Этот город уже в избранном.');return;}this.state.favorites.push({...city});this.persist();this.render();this.toast(`${city.name} добавлен в избранное.`);}
  toast(message){const el=this.root.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>el.classList.remove('show'),3000);}
}
