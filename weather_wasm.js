// --- 1️⃣ Setup Leaflet map ---
const map = L.map("map").setView([52.52, 13.41], 5); // default center
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// When user clicks on map, fetch lat/lon and update chart
map.on("click", async (e) => {
  const { lat, lng } = e.latlng;
  console.log(`Selected location: ${lat}, ${lng}`);
  await loadWeatherAndPlot(lat, lng);
});

// --- 2️⃣ Fetch weather from Open-Meteo ---
async function fetchWeatherData(lat, lon) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 10);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&start_date=${startDate
    .toISOString()
    .slice(0, 10)}&end_date=${endDate.toISOString().slice(0, 10)}`;

  const response = await fetch(url);
  const data = await response.json();
  return data.hourly.temperature_2m;
}

// --- 3️⃣ Load WASM ---
async function loadWASMModule() {
  const response = await fetch("w1.wasm");
  const bytes = await response.arrayBuffer();
  const wasmModule = await WebAssembly.instantiate(bytes, {});
  return wasmModule.instance.exports;
}

// --- 4️⃣ WASM wrappers ---
function computeMovingAverage(exports, arr, window) {
  const n = arr.length;
  const mem = new Float64Array(exports.memory.buffer, 0, n);
  for (let i = 0; i < n; i++) mem[i] = arr[i];
  exports.moving_average(0, n, window);
  return Array.from(mem.slice(0, n));
}

function computeMean(exports, arr) {
  const n = arr.length;
  const mem = new Float64Array(exports.memory.buffer, 0, n);
  for (let i = 0; i < n; i++) mem[i] = arr[i];
  return exports.mean_sub(0, n);
}
function computeLinearRegression(exports, yArray) {
  const n = yArray.length;
  const bytesPerElement = Float64Array.BYTES_PER_ELEMENT;

  // Allocate memory offsets
  const xOffset = 0;
  const yOffset = xOffset + n * bytesPerElement;
  const aOffset = yOffset + n * bytesPerElement;
  const bOffset = aOffset + bytesPerElement;

  // Create Float64Array view of WASM memory
  const mem = new Float64Array(exports.memory.buffer);

  // Fill x array with indices 1..n
  for (let i = 0; i < n; i++) mem[i] = i + 1; // x
  for (let i = 0; i < n; i++) mem[n + i] = yArray[i]; // y

  // Call WASM linear regression
  exports.linear_regression(xOffset, yOffset, n, aOffset, bOffset);

  // Read results from memory
  const slope = mem[aOffset / bytesPerElement];
  const intercept = mem[bOffset / bytesPerElement];

  return { slope, intercept };
}

// function computeLinearRegression(exports, arr) {
//   const n = arr.length;
//   const mem = new Float64Array(exports.memory.buffer, 0, n);
//   for (let i = 0; i < n; i++) mem[i] = arr[i];
//   // Adjust to match your linear_regression signature
//   exports.linear_regression(0, n, 0, 0, 0);
//   const slope = new Float64Array(exports.memory.buffer, 0, 1)[0];
//   const intercept = new Float64Array(exports.memory.buffer, 8, 1)[0];
//   return { slope, intercept };
// }

// --- 5️⃣ Draw chart using D3 ---
function drawChart(raw, smoothed, regression) {
  d3.select("#chart").selectAll("*").remove(); // clear previous chart

  const svg = d3.select("#chart"),
    margin = { top: 20, right: 30, bottom: 30, left: 50 },
    width = +svg.attr("width") - margin.left - margin.right,
    height = +svg.attr("height") - margin.top - margin.bottom;

  const x = d3
    .scaleLinear()
    .domain([0, raw.length - 1])
    .range([0, width]);
  const y = d3
    .scaleLinear()
    .domain([d3.min(raw), d3.max(raw)])
    .range([height, 0]);

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  g.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x));
  g.append("g").call(d3.axisLeft(y));

  const lineRaw = d3
    .line()
    .x((d, i) => x(i))
    .y((d) => y(d));
  const lineSmooth = d3
    .line()
    .x((d, i) => x(i))
    .y((d) => y(d));
  const lineTrend = d3
    .line()
    .x((d, i) => x(i))
    .y((_, i) => y(regression.slope * i + regression.intercept));

  g.append("path").datum(raw).attr("class", "line raw").attr("d", lineRaw);
  g.append("path")
    .datum(smoothed)
    .attr("class", "line smoothed")
    .attr("d", lineSmooth);
  g.append("path").datum(raw).attr("class", "line trend").attr("d", lineTrend);

  // Legend
  const legend = svg
    .append("g")
    .attr("transform", `translate(${width - 150},20)`);
  legend.append("rect").attr("width", 140).attr("height", 70);
  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 20)
    .text("Raw Temp")
    .attr("fill", "steelblue");
  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 40)
    .text("Moving Avg")
    .attr("fill", "orange");
  legend
    .append("text")
    .attr("x", 10)
    .attr("y", 60)
    .text("Linear Trend")
    .attr("fill", "green");
}

// --- 6️⃣ Main loader ---
let wasmExports;
(async () => {
  wasmExports = await loadWASMModule();
})();

async function loadWeatherAndPlot(lat, lon) {
  if (!wasmExports) return;

  const raw = await fetchWeatherData(lat, lon);
  const smoothed = computeMovingAverage(wasmExports, raw, 3);
  const meanVal = computeMean(wasmExports, raw);
  const regression = computeLinearRegression(wasmExports, raw);

  console.log("Mean:", meanVal);
  console.log("Regression:", regression);

  drawChart(raw, smoothed, regression);
}
