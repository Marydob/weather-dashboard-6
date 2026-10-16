const KEY = 'weather-dashboard-v1';

const defaults = {
  city: { name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' },
  unit: 'C',
  favorites: [{ name: 'Amsterdam', country: 'Netherlands', latitude: 52.3676, longitude: 4.9041, timezone: 'Europe/Amsterdam' }],
  widgets: ['current', 'hourly', 'weekly', 'details', 'todo'],
  collapsed: {},
  tasks: [
    { id: 'task-1', text: 'Взять зонт', done: false },
    { id: 'task-2', text: 'Проверить прогноз на вечер', done: false },
    { id: 'task-3', text: 'Подготовить одежду по погоде', done: true }
  ],
  cache: {}
};

export class StorageService {
  static load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!saved || typeof saved !== 'object') return structuredClone(defaults);
      return {
        ...structuredClone(defaults), ...saved,
        city: saved.city && Number.isFinite(saved.city.latitude) ? saved.city : structuredClone(defaults.city),
        widgets: Array.isArray(saved.widgets) && saved.widgets.length ? saved.widgets.filter(id => ['current','hourly','weekly','details','todo'].includes(id)) : [...defaults.widgets],
        favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(c => c && c.name && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)) : structuredClone(defaults.favorites),
        tasks: Array.isArray(saved.tasks) ? saved.tasks : [...defaults.tasks],
        collapsed: saved.collapsed && typeof saved.collapsed === 'object' ? saved.collapsed : {},
        cache: saved.cache && typeof saved.cache === 'object' ? saved.cache : {}
      };
    } catch { return structuredClone(defaults); }
  }
  static save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { console.warn('Could not save dashboard state.', error); }
  }
}
