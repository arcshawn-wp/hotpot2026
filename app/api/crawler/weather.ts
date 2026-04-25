import type { WeatherData, CrawlResult } from "./types";
import { fetchWithTimeout } from "./lib";

// ============================================================
// 天气数据采集 — Open-Meteo 免费 API（无需 API Key）
// 默认城市：杭州（latitude=30.27, longitude=120.15）
// ============================================================

const DEFAULT_CITY = "杭州市";
const LAT = 30.27;
const LON = 120.15;

interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  weather_code: number;
  wind_speed_10m: number;
}

interface OpenMeteoResponse {
  current: OpenMeteoCurrent;
}

// WMO Weather interpretation codes (WW)
function getWeatherCondition(code: number): { label: string; icon: string } {
  const map: Record<number, { label: string; icon: string }> = {
    0: { label: "晴", icon: "sunny" },
    1: { label: "多云", icon: "cloudy" },
    2: { label: "多云", icon: "cloudy" },
    3: { label: "阴", icon: "overcast" },
    45: { label: "雾", icon: "fog" },
    48: { label: "雾凇", icon: "fog" },
    51: { label: "毛毛雨", icon: "drizzle" },
    53: { label: "小雨", icon: "drizzle" },
    55: { label: "中雨", icon: "rain" },
    61: { label: "小雨", icon: "rain" },
    63: { label: "中雨", icon: "rain" },
    65: { label: "大雨", icon: "rain" },
    71: { label: "小雪", icon: "snow" },
    73: { label: "中雪", icon: "snow" },
    75: { label: "大雪", icon: "snow" },
    80: { label: "阵雨", icon: "rain" },
    81: { label: "强降雨", icon: "rain" },
    82: { label: "暴雨", icon: "rain" },
    95: { label: "雷雨", icon: "thunder" },
    96: { label: "雷雨伴冰雹", icon: "thunder" },
    99: { label: "雷雨伴冰雹", icon: "thunder" },
  };
  return map[code] || { label: "多云", icon: "cloudy" };
}

function generateWeatherTip(condition: string, humidity: number, temp: number): string {
  if (humidity > 85) {
    return "高湿度预警 → 除湿机/烘干机/防潮用品需求激增";
  }
  if (humidity > 70 && temp > 25) {
    return "闷热天气 → 空调/风扇/凉席需求上升";
  }
  if (temp > 35) {
    return "高温天气 → 空调/电扇/冷饮设备需求爆发";
  }
  if (temp < 5) {
    return "寒潮来袭 → 取暖器/电热毯/暖风机需求激增";
  }
  if (condition.includes("雨")) {
    return "降雨天气 → 雨具/烘干机/除湿设备需求上升";
  }
  if (condition.includes("雪")) {
    return "降雪天气 → 取暖设备/除雪工具需求上升";
  }
  return "天气适宜 → 户外运动/空气净化/换季收纳需求平稳";
}

export async function crawlWeather(): Promise<{ data: WeatherData; result: CrawlResult }> {
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", LAT.toString());
    url.searchParams.set("longitude", LON.toString());
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m");

    const res = await fetchWithTimeout(url.toString());
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

    const json = (await res.json()) as OpenMeteoResponse;
    const current = json.current;

    const conditionInfo = getWeatherCondition(current.weather_code);

    const temp = Number.isFinite(current.temperature_2m) ? Math.round(current.temperature_2m) : 22;
    const hum = Number.isFinite(current.relative_humidity_2m) ? Math.round(current.relative_humidity_2m) : 65;

    const data: WeatherData = {
      city: DEFAULT_CITY,
      temperature: temp,
      condition: conditionInfo.label,
      humidity: hum,
      tip: generateWeatherTip(conditionInfo.label, hum, temp),
      icon: conditionInfo.icon,
    };

    return {
      data,
      result: { source: "weather", status: "success", recordsCount: 1 },
    };
  } catch (err: any) {
    return {
      data: {
        city: DEFAULT_CITY,
        temperature: 22,
        condition: "多云",
        humidity: 65,
        tip: "天气数据获取失败，使用默认数据",
        icon: "cloudy",
      },
      result: {
        source: "weather",
        status: "error",
        recordsCount: 0,
        errorMessage: err.message || String(err),
      },
    };
  }
}
