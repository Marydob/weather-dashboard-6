const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';
const GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search';
const timeoutSignal = (ms = 12000) => AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;

async function getJson(url, options = {}) {
  const timeout = timeoutSignal();
  let signal = options.signal;
  if (signal && timeout && AbortSignal.any) signal = AbortSignal.any([signal, timeout]);
  else if (!signal) signal = timeout;
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(response.status === 429 ? 'Слишком много запросов. Попробуйте чуть позже.' : `Сервис временно недоступен (${response.status}).`);
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Сервис вернул некорректный ответ. Попробуйте ещё раз.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Сервер вернул некорректные данные.');
  if (data.error) throw new Error(data.reason || 'Не удалось получить данные о погоде.');
  return data;
}

export const weatherDescription = (code) => {
  if (code === 0) return { label: 'Ясно', icon: 'sun' };
  if ([1, 2].includes(code)) return { label: 'Переменная облачность', icon: 'cloud-sun' };
  if (code === 3) return { label: 'Пасмурно', icon: 'cloud' };
  if ([45, 48].includes(code)) return { label: 'Туман', icon: 'cloud-fog' };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: 'Морось', icon: 'cloud-drizzle' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: 'Дождь', icon: 'cloud-rain' };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: 'Снег', icon: 'snowflake' };
  if ([95, 96, 99].includes(code)) return { label: 'Гроза', icon: 'cloud-lightning' };
  return { label: 'Погодные условия', icon: 'cloud' };
};

export class WeatherApiService {
  static async searchCity(query) {
    const params = new URLSearchParams({ name: query.trim(), count: '6', language: 'ru', format: 'json' });
    const data = await getJson(`${GEOCODING}?${params}`);
    return (data.results || []).map(place => ({
      name: place.name, country: place.country || '', admin1: place.admin1 || '',
      latitude: place.latitude, longitude: place.longitude, timezone: place.timezone || 'auto'
    }));
  }

  static async getOpenMeteo(city, options = {}) {
    const params = new URLSearchParams({
      latitude: city.latitude, longitude: city.longitude, timezone: 'auto', forecast_days: '7',
      current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m,surface_pressure',
      hourly: 'temperature_2m,precipitation_probability,weather_code,relative_humidity_2m,visibility',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
      forecast_hours: '24', wind_speed_unit: 'kmh'
    });
    return getJson(`${OPEN_METEO}?${params}`, options);
  }

  static async getOpenWeather(city, options = {}) {
    const key = import.meta.env.VITE_OPENWEATHER_API_KEY;
    if (!key) return null;
    const params = new URLSearchParams({ lat: city.latitude, lon: city.longitude, appid: key, units: 'metric', lang: 'ru', exclude: 'current,minutely,daily,alerts' });
    const data = await getJson(`https://api.openweathermap.org/data/3.0/onecall?${params}`, options);
    if (!Array.isArray(data.hourly)) throw new Error('В ответе OpenWeather нет почасового прогноза.');
    return { source: 'OpenWeather', updatedAt: data.current?.dt ? data.current.dt * 1000 : Date.now(), hourly: data.hourly.slice(0, 24).map(h => ({ time: h.dt * 1000, temp: h.temp, weatherCode: h.weather?.[0]?.icon || '', precipitationProbability: (h.pop || 0) * 100 })) };
  }

  static async getHourlyForecast(city, options = {}) {
    // Prefer the required OpenWeather One Call API when configured; Open-Meteo is a reliable fallback.
    try {
      const openWeather = await this.getOpenWeather(city, options);
      if (openWeather) return openWeather;
    } catch (error) {
      if (options.signal?.aborted) throw error;
    }
    const data = await this.getOpenMeteo(city, options);
    if (!Array.isArray(data.hourly?.time) || !Array.isArray(data.hourly?.temperature_2m)) {
      throw new Error('Почасовой прогноз временно недоступен.');
    }
    return {
      source: 'Open-Meteo', updatedAt: Date.now(),
      hourly: data.hourly.time.slice(0, 24).map((time, i) => ({
        time: new Date(time).getTime(), temp: data.hourly.temperature_2m[i],
        weatherCode: data.hourly.weather_code?.[i] ?? 3,
        precipitationProbability: data.hourly.precipitation_probability?.[i] ?? 0
      }))
    };
  }
}
