import { WeatherApiService, weatherDescription } from './weather-api.js';

const icons = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  'cloud-sun': '<path d="M12 2v2m-7.07.93 1.42 1.42M2 12h2m14-5 1.4-1.4"/><path d="M20 16.2a4.8 4.8 0 0 0-8.6-2.9A4 4 0 1 0 8 20h11a3 3 0 0 0 1-5.8Z"/>',
  cloud: '<path d="M20 16.2A4.8 4.8 0 0 0 11.4 13 4 4 0 1 0 8 20h11a3 3 0 0 0 1-3.8Z"/>',
  'cloud-fog': '<path d="M20 14.2A4.8 4.8 0 0 0 11.4 11 4 4 0 1 0 8 18h11a3 3 0 0 0 1-3.8Z"/><path d="M4 21h14M7 24h10"/>',
  'cloud-drizzle': '<path d="M20 14.2A4.8 4.8 0 0 0 11.4 11 4 4 0 1 0 8 18h11a3 3 0 0 0 1-3.8Z"/><path d="m9 21-1 2m7-2-1 2"/>',
  'cloud-rain': '<path d="M20 14.2A4.8 4.8 0 0 0 11.4 11 4 4 0 1 0 8 18h11a3 3 0 0 0 1-3.8Z"/><path d="m8 20-1 2m7-2-1 2m7-2-1 2"/>',
  snowflake: '<path d="M12 2v20M4 6l16 12M4 18 20 6M8 4l4 2 4-2M8 20l4-2 4 2"/>',
  'cloud-lightning': '<path d="M20 14.2A4.8 4.8 0 0 0 11.4 11 4 4 0 1 0 8 18h5"/><path d="m13 16-3 4h4l-1 4 5-7h-4l1-1"/>',
  wind: '<path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M4 16h6a3 3 0 1 1-3 3"/>',
  droplet: '<path d="M12 22a7 7 0 0 0 7-7c0-4-7-13-7-13S5 11 5 15a7 7 0 0 0 7 7Z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3 6.3-2.1Z"/>',
  sunrise: '<path d="M12 2v8m-4-4 4 4 4-4M2 18h20M4 14a8 8 0 0 1 16 0"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  gauge: '<path d="M12 14l4-4M3.3 16a9 9 0 1 1 17.4 0"/><path d="M12 2v2M4.9 5.1l1.4 1.4M2 12h2m16 0h2"/>',
  check: '<path d="m5 12 4 4L19 6"/>', plus: '<path d="M12 5v14M5 12h14"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 17 5l3 2M4 17l3 2a7 7 0 0 0 11.5-4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>', trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
  heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  x: '<path d="m18 6-12 12M6 6l12 12"/>'
};
export const icon = (name, size = 20) => `<svg aria-hidden="true" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[name] || icons.cloud}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const fmt = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : '—';
const temp = (value, unit) => `${Math.round(unit === 'F' ? value * 9 / 5 + 32 : value)}°`;
const time = value => value ? new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '—';
const day = value => new Date(`${value}T12:00:00`).toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');

export class Widget {
  constructor(manager, type, title, subtitle = '') { this.manager = manager; this.type = type; this.title = title; this.subtitle = subtitle; }
  shell(content, opts = {}) {
    const collapsed = !!this.manager.state.collapsed[this.type];
    return `<article class="widget ${opts.className || ''}" data-widget="${this.type}">
      <header class="widget-head"><div class="widget-title-wrap"><span class="widget-icon">${icon(opts.icon || 'cloud', 18)}</span><div><h2>${this.title}</h2>${this.subtitle ? `<p>${this.subtitle}</p>` : ''}</div></div>
      <div class="widget-actions"><button class="icon-btn" data-action="refresh" data-type="${this.type}" aria-label="Обновить ${this.title}" title="Обновить">${icon('refresh', 16)}</button><button class="icon-btn" data-action="collapse" data-type="${this.type}" aria-label="${collapsed ? 'Развернуть' : 'Свернуть'} ${this.title}" title="${collapsed ? 'Развернуть' : 'Свернуть'}">${icon('chevron', 17)}</button><button class="icon-btn remove-btn" data-action="remove" data-type="${this.type}" aria-label="Удалить ${this.title}" title="Удалить">${icon('x', 16)}</button></div></header>
      <div class="widget-content ${collapsed ? 'is-collapsed' : ''}">${content}</div></article>`;
  }
  stateContent(message = 'Не удалось загрузить данные.') { return `<div class="error-state"><span>${esc(message)}</span><button class="text-btn" data-action="refresh" data-type="${this.type}">Повторить</button></div>`; }
  async refresh() { return ''; }
}

export class WeatherWidget extends Widget {
  constructor(manager) { super(manager, 'current', 'Сейчас', 'Погода в вашем городе · Open-Meteo'); }
  render() {
    const data = this.manager.state.cache.current;
    if (!data && this.manager.state.cache.currentError) return this.shell(this.stateContent(this.manager.state.cache.currentError), { icon: 'sun', className: 'current-widget' });
    if (!data) return this.shell('<div class="skeleton hero-skeleton" role="status" aria-label="Загрузка текущей погоды"></div>', { icon: 'sun', className: 'current-widget' });
    const c = data.current, d = weatherDescription(c.weather_code), unit = this.manager.state.unit;
    return this.shell(`<div class="weather-hero"><div class="hero-copy"><span class="eyebrow">${esc(this.manager.state.city.name)}, ${esc(this.manager.state.city.country)}</span><div class="hero-temp">${temp(c.temperature_2m, unit)}<span>${unit === 'C' ? 'C' : 'F'}</span></div><div class="hero-condition">${icon(d.icon, 22)}<span>${d.label}</span></div><p class="feels-like">Ощущается как ${temp(c.apparent_temperature, unit)}</p></div><div class="weather-art ${d.icon}">${icon(d.icon, 94)}<span class="art-orbit orbit-one"></span><span class="art-orbit orbit-two"></span></div><div class="hero-bottom"><div><span>Влажность</span><strong>${fmt(c.relative_humidity_2m)}%</strong></div><div><span>Ветер</span><strong>${fmt(c.wind_speed_10m)} <small>км/ч</small></strong></div><div><span>Осадки</span><strong>${fmt(c.precipitation, 1)} <small>мм</small></strong></div></div></div><div class="updated-line">${icon('clock', 13)} Обновлено ${time(data.current.time)}</div>`, { icon: 'sun', className: 'current-widget' });
  }
}

export class HourlyForecastWidget extends Widget {
  constructor(manager) { super(manager, 'hourly', 'Ближайшие 24 часа', 'Почасовой прогноз'); }
  render() {
    const cached = this.manager.state.cache.hourly;
    if (cached?.error) return this.shell(this.stateContent(cached.error), { icon: 'clock' });
    if (!Array.isArray(cached?.hourly) || !cached.hourly.length) return this.shell('<div class="skeleton hourly-skeleton" role="status" aria-label="Загрузка почасового прогноза"></div>', { icon: 'clock' });
    const unit = this.manager.state.unit;
    const hours = cached.hourly.slice(0, 24);
    const vals = hours.slice(0, 12).map(h => Number(h.temp)).filter(Number.isFinite);
    if (!vals.length) return this.shell(this.stateContent('Почасовой прогноз временно недоступен.'), { icon: 'clock' });
    const min = Math.min(...vals), max = Math.max(...vals), range = max - min || 1;
    const points = vals.map((v, i) => `${12 + i * 22},${72 - ((v - min) / range) * 48}`).join(' ');
    return this.shell(`<div class="hourly-chart"><svg viewBox="0 0 270 88" preserveAspectRatio="none" role="img" aria-label="График температуры по часам"><defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#8bbde9" stop-opacity=".32"/><stop offset="1" stop-color="#8bbde9" stop-opacity="0"/></linearGradient></defs><polygon points="${points} 254,88 12,88" fill="url(#chartFill)"/><polyline points="${points}" fill="none" stroke="#6a9bc8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>${vals.map((v,i)=>`<circle cx="${12+i*22}" cy="${72-((v-min)/range)*48}" r="2.5" fill="#fff" stroke="#6a9bc8" stroke-width="1.5"/>`).join('')}</svg><div class="chart-range"><span>${temp(min, unit)}</span><span>Изменение температуры</span><span>${temp(max, unit)}</span></div></div><div class="hourly-scroll">${hours.map((h,i)=>{ const code=String(h.weatherCode ?? ''); const ico = this.weatherIcon(code); return `<div class="hour-item"><span class="hour-time">${i===0?'Сейчас':time(h.time)}</span><span class="hour-icon">${ico}</span><strong>${temp(h.temp, unit)}</strong><span class="hour-rain">${Math.round(h.precipitationProbability||0)}% <small>осадки</small></span></div>`; }).join('')}</div><div class="updated-line">${icon('clock', 13)} Данные ${cached.source || 'Open-Meteo'} · ${time(cached.updatedAt || Date.now())}</div>`, { icon: 'clock', className: 'hourly-widget' });
  }
  weatherIcon(code) {
    if (/^09|^10/.test(code)) return icon('cloud-rain', 21);
    if (/^01/.test(code)) return icon('sun', 21);
    if (/^13/.test(code)) return icon('snowflake', 21);
    if (/^11/.test(code)) return icon('cloud-lightning', 21);
    if (/^4[5-8]|^5[1-7]|^6[1-7]|^8[0-2]|^9[5-9]/.test(code)) return icon('cloud-rain', 21);
    return icon(weatherDescription(Number(code)).icon, 21);
  }
}

export class WeeklyForecastWidget extends Widget {
  constructor(manager) { super(manager, 'weekly', '7 дней', 'Прогноз на неделю'); }
  render() {
    const data = this.manager.state.cache.current;
    if (!data?.daily) return this.shell('<div class="skeleton week-skeleton"></div>', { icon: 'calendar' });
    const unit = this.manager.state.unit;
    return this.shell(`<div class="week-list">${data.daily.time.map((date,i)=>{ const w=weatherDescription(data.daily.weather_code[i]); return `<div class="week-row"><span class="week-day">${i===0?'Сегодня':day(date)}</span><span class="week-weather">${icon(w.icon,19)}<span>${w.label}</span></span><span class="week-rain">${Number.isFinite(data.daily.precipitation_probability_max?.[i]) ? `${data.daily.precipitation_probability_max[i]}%` : '—'}</span><div class="temp-range"><span>${temp(data.daily.temperature_2m_min[i],unit)}</span><div class="range-track"><i style="left:${Math.max(0,Math.min(100,(data.daily.temperature_2m_min[i]+10)*3))}%;width:${Math.max(12,Math.min(76,(data.daily.temperature_2m_max[i]-data.daily.temperature_2m_min[i])*4))}%"></i></div><strong>${temp(data.daily.temperature_2m_max[i],unit)}</strong></div></div>`;}).join('')}</div><div class="updated-line">${icon('clock',13)} Прогноз Open-Meteo · ${time(data.current.time)}</div>`, { icon: 'calendar' });
  }
}

export class WeatherDetailsWidget extends Widget {
  constructor(manager) { super(manager, 'details', 'Детали погоды', 'Показатели окружающей среды'); }
  render() {
    const data = this.manager.state.cache.current;
    if (!data?.current) return this.shell('<div class="skeleton details-skeleton"></div>', { icon: 'gauge' });
    const c = data.current, d = data.daily, unit = this.manager.state.unit;
    const items = [
      { label: 'Восход', value: time(d.sunrise?.[0]), icon: 'sunrise', color: 'gold' },
      { label: 'Закат', value: time(d.sunset?.[0]), icon: 'sun', color: 'coral' },
      { label: 'УФ-индекс', value: Number.isFinite(d.uv_index_max?.[0]) ? fmt(d.uv_index_max[0],1) : 'Нет данных', icon: 'sun', color: 'violet' },
      { label: 'Видимость', value: Number.isFinite(data.hourly?.visibility?.[0]) ? `${(data.hourly.visibility[0]/1000).toFixed(1)} км` : 'Нет данных', icon: 'eye', color: 'blue' },
      { label: 'Давление', value: Number.isFinite(c.surface_pressure) ? `${Math.round(c.surface_pressure)} гПа` : 'Нет данных', icon: 'gauge', color: 'green' },
      { label: 'Влажность', value: Number.isFinite(c.relative_humidity_2m) ? `${c.relative_humidity_2m}%` : 'Нет данных', icon: 'droplet', color: 'blue' }
    ];
    return this.shell(`<div class="details-grid">${items.map(it=>`<div class="detail-tile"><span class="detail-icon ${it.color}">${icon(it.icon,19)}</span><span class="detail-label">${it.label}</span><strong>${it.value}</strong></div>`).join('')}</div>`, { icon: 'gauge' });
  }
}

export class TodoWidget extends Widget {
  constructor(manager) { super(manager, 'todo', 'Планы на день', 'Маленькие шаги к хорошему дню'); }
  render() {
    const tasks = this.manager.state.tasks;
    const done = tasks.filter(t=>t.done).length;
    return this.shell(`<form class="todo-form" data-form="todo"><label class="sr-only" for="new-task">Новая задача</label><input id="new-task" name="task" maxlength="120" placeholder="Добавить задачу..." autocomplete="off"/><button class="add-task-btn" type="submit" aria-label="Добавить задачу">${icon('plus',18)}</button></form><div class="todo-progress"><span>${done} из ${tasks.length} выполнено</span><div class="progress-track"><i style="width:${tasks.length?done/tasks.length*100:0}%"></i></div><span>${tasks.length-done} осталось</span></div>${tasks.length ? `<ul class="task-list">${tasks.map(t=>`<li class="task-row ${t.done?'task-done':''}"><button class="task-check ${t.done?'checked':''}" data-action="toggle-task" data-id="${esc(t.id)}" aria-label="${t.done?'Отметить невыполненной':'Отметить выполненной'}: ${esc(t.text)}">${t.done?icon('check',14):''}</button><span>${esc(t.text)}</span><button class="task-delete" data-action="delete-task" data-id="${esc(t.id)}" aria-label="Удалить задачу: ${esc(t.text)}">${icon('x',15)}</button></li>`).join('')}</ul>` : '<div class="empty-tasks">Все планы начинаются с одной маленькой задачи.</div>'}`, { icon: 'list' });
  }
}

export const CurrentWeatherWidget = WeatherWidget;

export const WIDGETS = { current: WeatherWidget, hourly: HourlyForecastWidget, weekly: WeeklyForecastWidget, details: WeatherDetailsWidget, todo: TodoWidget };
export const WIDGET_META = {
  current: { title: 'Текущая погода', desc: 'Температура и условия прямо сейчас', icon: 'sun' },
  hourly: { title: 'Почасовой прогноз', desc: 'Следующие 24 часа', icon: 'clock' },
  weekly: { title: 'Прогноз на 7 дней', desc: 'Погода на всю неделю', icon: 'calendar' },
  details: { title: 'Детали погоды', desc: 'Восход, УФ-индекс и другие показатели', icon: 'gauge' },
  todo: { title: 'Список дел', desc: 'Задачи и планы на день', icon: 'list' }
};
