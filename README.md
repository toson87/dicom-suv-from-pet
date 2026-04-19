# dicom-suv-from-pet

Browser-based tool for automatic SUV (Standardized Uptake Value) conversion from PET DICOM series. 100% client-side — files never leave the browser.

## What it does

Loads a PET DICOM folder, extracts dose/timing/weight metadata, applies decay correction, and computes SUVbw maps per voxel. Displays PET images with an SUV colormap overlay and a stats panel.

## SUV calculation

- Rescales pixel values to Bq/mL using `RescaleSlope` / `RescaleIntercept`
- Applies decay correction from `RadiopharmaceuticalStartTime` → `AcquisitionTime`
- Computes: `SUVbw = (Bq/mL × patient_weight_g) / decay_corrected_dose_Bq`
- Falls back to manual input if required tags are missing

## Stack

- React 19 + TypeScript + Vite (`es2020`)
- Tailwind CSS, IBM Plex Sans/Mono
- `dicom-parser` for tag extraction
- Canvas rendering with hot-scale SUV colormap

## Layout

Three-panel AppShell (per DICOM tools style guide):
- **Left:** PET series/slice list with PT modality badge
- **Main:** Canvas viewer with SUV colormap overlay
- **Right:** SUV stats, patient metadata, editable dose/weight inputs
