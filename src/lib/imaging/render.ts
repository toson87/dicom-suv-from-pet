import type { DicomFrame, PetSeries, SuvType } from '../../types'
import type { ViewportState } from './viewport'
import { calcSuvForFrame, calcStats } from '../suv/calculate'
import { LUTS } from './colormaps'
import type { SuvStats } from '../../types'

export function renderFrameToImageData(
  frame: DicomFrame,
  series: PetSeries,
  suvType: SuvType,
  vp: ViewportState,
  manualWeightKg?: number,
  manualDoseBq?: number,
  ctFrame?: DicomFrame,
): { imageData: ImageData; stats: SuvStats | null } {
  const { rows, cols } = frame
  const n = rows * cols
  const data = new Uint8ClampedArray(n * 4)
  const lut = LUTS[vp.colormap]

  const suv = calcSuvForFrame(frame, series, suvType, manualWeightKg, manualDoseBq)
  const stats = suv ? calcStats(suv) : null

  // CT overlay validation: must match PET dimensions exactly
  const hasCt = !!ctFrame && ctFrame.rows === rows && ctFrame.cols === cols

  const suvMin = vp.suvCenter - vp.suvWidth / 2
  const suvMax = vp.suvCenter + vp.suvWidth / 2
  const suvRange = Math.max(0.001, suvMax - suvMin)

  const ctLow = vp.ctCenter - vp.ctWidth / 2
  const ctRange = Math.max(1, vp.ctWidth)

  for (let i = 0; i < n; i++) {
    let r: number, g: number, b: number

    if (suv) {
      const t = Math.max(0, Math.min(1, (suv[i] - suvMin) / suvRange))
      const li = Math.round(t * 255) * 3
      r = lut[li]; g = lut[li + 1]; b = lut[li + 2]
    } else {
      // Fallback grayscale from raw activity (Bq/mL)
      const bqMl = Math.max(0, frame.pixelData[i] * frame.rescaleSlope + frame.rescaleIntercept)
      const gray = Math.min(255, Math.round((bqMl / 50000) * 255))
      r = gray; g = gray; b = gray
    }

    if (hasCt) {
      const hu = ctFrame!.pixelData[i] * ctFrame!.rescaleSlope + ctFrame!.rescaleIntercept
      const ctGray = Math.max(0, Math.min(255, Math.round((hu - ctLow) / ctRange * 255)))
      // Only apply PET colour where SUV is above the display minimum
      const alpha = suv && suv[i] > suvMin ? vp.petOpacity : 0
      r = Math.round(r * alpha + ctGray * (1 - alpha))
      g = Math.round(g * alpha + ctGray * (1 - alpha))
      b = Math.round(b * alpha + ctGray * (1 - alpha))
    }

    data[i * 4]     = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }

  return { imageData: new ImageData(data, cols, rows), stats }
}
