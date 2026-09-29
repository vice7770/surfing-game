# Padang Padang build sheet

The swell reaches Padang Padang only by wrapping around the Bukit's western tip. The reef faces north-north-west, so a south-west swell cannot hit it head-on. Build the spot as the waves actually arrive, from the west-north-west, over a ramp, a focus and a wedge; there is no platform.

| Parameter | Value | Basis |
| --- | --- | --- |
| Reef components | Ramp, focus, wedge, pinnacle: "very steep/hollow and very fast" | Mead's survey ([PhD thesis 2000](https://hdl.handle.net/10289/13967)) |
| Slope under the barrel | About 1:18–1:20 along the wave's path, inside the wedge range (1:4–1:40) | Inverted from Mead & Black's fit (inferred) |
| Coast and reef edge | Coast trends 063–067°, facing 337–340°. Reef edge trends 078°, then 066° over the last 500 m | OpenStreetMap; [Allen Coral Atlas](https://allencoralatlas.org/geoserver/ows?service=wfs&version=2.0.0&request=GetFeature&typeNames=coral-atlas:geomorphic_data_verbose&outputFormat=application/json&srsName=EPSG:4326&bbox=-8.822,115.088,-8.800,115.118,urn:ogc:def:crs:EPSG::4326) satellite map |
| Swell direction | Offshore from 203–209°; it wraps around the Bukit's tip and arrives from about 295–320° when it breaks | [Meteo-France wave model](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_direction,swell_wave_height,swell_wave_period,swell_wave_direction&models=meteofrance_wave&start_date=2025-08-05&end_date=2025-08-07&timezone=Asia%2FSingapore); breaking direction inferred |
| Offshore depth | A terrace 20–45 m deep to the north-west; 50 m at 6–8 km | GEBCO 2026 via [GMRT](https://www.gmrt.org/about/), 460 m grid |
| Reef flat | About 1 m of water at mid tide; dry at spring lows | Inferred from reports and Bingin's survey |
| Breaking edge | About 2–4 m of water at mid tide | Inferred from Bingin's wedge (0–3 m below lowest tide) |
| Channel | About 200 m wide at the shore, 300 m at the reef edge; depth not found, likely over 10 m | Satellite map; inferred |
| Sections | 2–4 barrels. The reef edge steps inward (from 125 m to 45 m off the coast) before the channel: the likely end-section pinch | Surf guides; satellite map |
| Tide | Monthly range 1.69–2.46 m; dry-season lows 0.76–0.86 m below mean sea level | Benoa gauge, via [paper](https://iopscience.iop.org/article/10.1088/1755-1315/1350/1/012016) |
| Swell, June–September | Mean Hs 2.0–2.2 m, median period 14.2–14.5 s; periods of 16 s or more in 15–17 % of hours | [ERA5, 2005–2024](https://marine-api.open-meteo.com/v1/marine?latitude=-9.0&longitude=115.0&hourly=wave_height,wave_peak_period,wave_direction&models=era5_ocean&start_date=2005-01-01&end_date=2024-12-31&timezone=Asia%2FSingapore) |
| Contest days | 5–6 ft and up (faces about 3–4 m), with offshore Hs of 2.3–3.6 m at about 17 s | Contest reports; ERA5 |
| Wind, June–September | From 105–124°: about 7 kn at dawn, 12.6–13 kn at 13:00–16:00. Nearly straight offshore to the wrapped waves | [Denpasar airport records](https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?station=WADD&data=drct&data=sknt&year1=2015&month1=1&day1=1&year2=2025&month2=1&day2=1&tz=Asia%2FMakassar&format=onlycomma&latlon=no&elev=no&missing=M&trace=T&direct=no&report_type=3&report_type=4), 2015–2024 |
| Directional spread at the tank edge | cos-2s exponent s ≈ 150 at 10 m (sweep 100–250, never below 75). Long-travelled swell starts near s = 75, and refraction in shallow water narrows it past 100 | Goda, Takayama & Suzuki 1978 (Eq. 17, Fig. 5); the value at 10 m is a provisional ruling |

**What it changes in the build:**

- Feed the tank from its west-north-west side with the wrapped swell, not from the south-west.
- Build ramp, focus and wedge, with pinnacles for the sections.
- Anchor the size presets on face heights, because the wrap makes local heights differ from offshore ones.

No depths of Padang Padang itself are published. Mead's raw survey exists but is unpublished; asking eCoast (Shaw Mead) is the only route to real soundings.
