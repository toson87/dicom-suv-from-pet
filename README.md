# PET SUV Calculator

## 🌐 [Use it now → https://toson87.github.io/dicom-suv-from-pet/](https://toson87.github.io/dicom-suv-from-pet/)

A browser-based tool for computing Standardized Uptake Values (SUV) from PET DICOM series. All processing is 100% client-side — files never leave your browser.

## Features

- **100% client-side** — all DICOM parsing and SUV computation runs in the browser; no data is uploaded
- **Three SUV types** — SUVbw (body weight), SUVbsa (DuBois body surface area), SUVlbm (James lean body mass)
- **Decay correction** — computed from `RadiopharmaceuticalStartTime` → `AcquisitionTime`
- **Manual override** — enter weight and injected dose manually when DICOM tags are missing
- **PET/CT overlay** — fuse a PET series onto a CT series with configurable opacity
- **Six colormaps** — Hot Metal, Turbo, Viridis, Plasma, Rainbow, Grayscale
- **Pixel value hover** — SUV shown at cursor position in real time
- **Export** — download results as CSV, JSON, or as a DICOM series (SUV map with RescaleSlope)
- **DICOM viewer** — zoom, pan, window/level, multi-slice scrubbing

## Getting started

```bash
npm install
npm run dev        # http://localhost:5175
```

### Build for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve production build locally
```

## Self-hosting

The app is a static single-page application. Copy `dist/` to any web server.

A reference nginx config is at `nginx/dicom-suv-from-pet.conf`. The `deploy.sh` script builds and deploys to a local nginx setup.

## How it works

1. Drop a PET DICOM folder onto the app — series are parsed and grouped automatically
2. Select a PET series; if `PatientWeight`, `RadionuclideTotalDose`, and `RadiopharmaceuticalStartTime` are present they are pre-filled; missing values can be entered manually
3. Choose SUV type and colormap; the SUV map is computed and rendered per-voxel
4. Hover over the image to read the SUV at any voxel
5. Export: CSV/JSON for ROI statistics, or DICOM ZIP for use in other viewers

## SUV formulas

```
decay_corrected_dose = total_dose × exp(−ln(2) × Δt / half_life)

SUVbw  = (Bq/mL × weight_g)         / decay_corrected_dose
SUVbsa = (Bq/mL × BSA_m² × 10 000) / decay_corrected_dose   # DuBois BSA
SUVlbm = (Bq/mL × LBM_g)            / decay_corrected_dose   # James LBM
```

`Δt` = AcquisitionTime − RadiopharmaceuticalStartTime (seconds), with midnight rollover handling.

## Tech stack

- React 19 + TypeScript + Vite
- [dicom-parser](https://github.com/cornerstonejs/dicomParser) — DICOM tag extraction
- [JSZip](https://stuk.github.io/jszip/) — DICOM/ZIP export
- Tailwind CSS, IBM Plex Sans/Mono
- Canvas 2D API for image rendering

## Limitations

- Requires a modern browser with ES2020 support
- Decay correction requires `RadiopharmaceuticalStartTime` in the DICOM header; falls back to manual dose entry if absent
- Burned-in pixel data and proprietary scanner corrections (scatter, attenuation) are not re-applied — SUV accuracy depends on the corrections already embedded in the DICOM
- Exported DICOM SUV maps use Secondary Capture SOP class (`1.2.840.10008.5.1.4.1.1.7`) so that external viewers apply `RescaleSlope` faithfully rather than attempting their own PET normalization

## License

MIT — see [LICENSE](LICENSE)

## Feedback

Bug reports, feature requests, or general feedback welcome — reach out at minhson.to@gmail.com
