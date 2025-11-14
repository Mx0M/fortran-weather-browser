# Browser Weather Analytics with Fortran and WebAssembly

This project is a **browser-based weather analytics application** using **Fortran compiled to WebAssembly (WASM)**. It fetches weather data for a selected location and processes it using Fortran routines for **mean, moving average, and linear regression**. Results are visualized interactively with **D3.js**, and users can select locations on a map.

**Live Demo:** [https://apps.mkswebs.com/fortran-weather-browser/](https://apps.mkswebs.com/fortran-weather-browser/)

---

## Features

- Fetch weather data from a free API (Open-Meteo)
- Compute:
  - **Mean temperature**
  - **Moving average**
  - **Linear regression** (trend line)
- Interactive chart visualization with **D3.js**
- Select latitude and longitude on a **map** for location-specific data
- Fully client-side with **WebAssembly**, no server computation required

---

## Technologies

- **Fortran** (`weather.f90`) compiled to WASM
- **LLVM / Flang** for compilation
- **WebAssembly (WASM)** for in-browser computation
- **JavaScript** for API fetch, WASM integration, and charting
- **D3.js** for line charts
- **Leaflet.js** for interactive map selection

---
