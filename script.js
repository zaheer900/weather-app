// Open-Meteo API: koi API key nahi chahiye, free hai.
const GEO = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=";
const FORECAST = "https://api.open-meteo.com/v1/forecast?timezone=auto&forecast_days=6" +
  "&current=temperature_2m,relative_humidity_2m,apparent_temperature,pressure_msl,wind_speed_10m,weather_code" +
  "&daily=weather_code,temperature_2m_max,temperature_2m_min";

const $ = id => document.getElementById(id);
const msg = $("msg"), current = $("current"), forecast = $("forecast");

// ---------- Weather code -> label + icon ----------
const sun = `<circle cx="50" cy="50" r="20" fill="#ffb02e"/>` +
  [0,45,90,135,180,225,270,315].map(a => `<line x1="50" y1="12" x2="50" y2="23" stroke="#ffc933" stroke-width="5" stroke-linecap="round" transform="rotate(${a} 50 50)"/>`).join("");
const cloud = `<path d="M28 68a14 14 0 0 1 2-28 20 20 0 0 1 38 4 12 12 0 0 1 0 24z" fill="#f2f6fa"/>`;
const smallSun = `<circle cx="66" cy="32" r="13" fill="#ffb02e"/>`;
const rain = [36,50,64].map(x => `<line x1="${x}" y1="76" x2="${x-4}" y2="90" stroke="#7cc4ff" stroke-width="4" stroke-linecap="round"/>`).join("");
const snow = [36,50,64].map(x => `<circle cx="${x}" cy="84" r="3.5" fill="#fff"/>`).join("");
const bolt = `<path d="M50 62l-8 14h8l-4 14 13-18h-8l6-10z" fill="#ffc933"/>`;
const fog = [40,52,64,76].map(y => `<line x1="22" y1="${y}" x2="78" y2="${y}" stroke="#eaf1f7" stroke-width="4" stroke-linecap="round"/>`).join("");

function info(code) {
  if (code === 0) return ["Clear sky", sun];
  if (code <= 2) return ["Partly cloudy", smallSun + cloud];
  if (code === 3) return ["Overcast", cloud];
  if (code <= 48) return ["Fog", fog];
  if (code <= 57) return ["Drizzle", cloud + rain];
  if (code <= 67) return ["Rain", cloud + rain];
  if (code <= 77) return ["Snow", cloud + snow];
  if (code <= 82) return ["Rain showers", cloud + rain];
  if (code <= 86) return ["Snow showers", cloud + snow];
  return ["Thunderstorm", cloud + bolt];
}
const svg = inner => `<svg viewBox="0 0 100 100">${inner}</svg>`;

// ---------- Fetch ----------
async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("http " + res.status);
  return res.json();
}

async function searchCity(name) {
  msg.hidden = false; msg.textContent = "Loading...";
  try {
    const geo = await getJSON(GEO + encodeURIComponent(name));
    if (!geo.results) { showError("City nahi mili. Spelling check karo."); return; }
    const p = geo.results[0];
    await loadWeather(p.latitude, p.longitude, p.name);
    saveRecent(p.name);
  } catch (e) { showError("Internet ya API ka masla hai. Dobara try karo."); }
}

async function loadWeather(lat, lon, cityName) {
  try {
    const d = await getJSON(`${FORECAST}&latitude=${lat}&longitude=${lon}`);
    render(d, cityName);
  } catch (e) { showError("Weather load nahi hua. Dobara try karo."); }
}

function showError(text) { msg.hidden = false; msg.textContent = text; current.hidden = true; forecast.hidden = true; }

// ---------- Render ----------
function render(d, cityName) {
  const c = d.current, [label, icon] = info(c.weather_code);
  $("icon").innerHTML = svg(icon);
  $("temp").textContent = Math.round(c.temperature_2m) + "°c";
  $("city").textContent = cityName;
  $("desc").textContent = label;
  $("humidity").textContent = c.relative_humidity_2m + "%";
  $("wind").textContent = c.wind_speed_10m.toFixed(1) + " km/h";
  $("feels").textContent = Math.round(c.apparent_temperature) + "°c";
  $("pressure").textContent = Math.round(c.pressure_msl) + " hPa";

  // next 5 days (index 0 = today, skip it)
  $("days").innerHTML = d.daily.time.slice(1, 6).map((t, i) => {
    const day = new Date(t + "T00:00").toLocaleDateString("en", { weekday: "short" });
    const k = i + 1;
    return `<div class="day"><b>${day}</b>${svg(info(d.daily.weather_code[k])[1])}` +
      `<small>${Math.round(d.daily.temperature_2m_max[k])}° / ${Math.round(d.daily.temperature_2m_min[k])}°</small></div>`;
  }).join("");

  msg.hidden = true; current.hidden = false; forecast.hidden = false;
}

// ---------- Recent searches (localStorage) ----------
function saveRecent(name) {
  let list = JSON.parse(localStorage.getItem("recent") || "[]").filter(n => n !== name);
  list.unshift(name); list = list.slice(0, 5);
  localStorage.setItem("recent", JSON.stringify(list));
  drawRecent();
}
function drawRecent() {
  const list = JSON.parse(localStorage.getItem("recent") || "[]");
  $("recent").innerHTML = list.map(n => `<button type="button">${n}</button>`).join("");
  $("recent").querySelectorAll("button").forEach(b => b.onclick = () => searchCity(b.textContent));
}

// ---------- Events ----------
$("form").addEventListener("submit", e => {
  e.preventDefault();
  const v = $("cityInput").value.trim();
  if (v) searchCity(v);
});
$("locBtn").addEventListener("click", () => {
  if (!navigator.geolocation) return showError("Browser location support nahi karta.");
  msg.hidden = false; msg.textContent = "Location dhoondh raha hoon...";
  navigator.geolocation.getCurrentPosition(
    p => loadWeather(p.coords.latitude, p.coords.longitude, "Your location"),
    () => showError("Location permission nahi mili. City search use karo.")
  );
});

drawRecent();
searchCity("Karachi");
