import type { DicomFrame, PetSeries, SuvStats, SuvType } from '../../types'
import { elapsedSeconds } from '../dicom/timeUtils'

export function decayFactor(halfLifeSeconds: number, deltaSeconds: number): number {
  return Math.exp(-Math.LN2 * deltaSeconds / halfLifeSeconds)
}

/** DuBois body surface area in m² */
function bsa(weightKg: number, heightM: number): number {
  return 0.007184 * Math.pow(heightM * 100, 0.725) * Math.pow(weightKg, 0.425)
}

/** James lean body mass in kg */
function lbm(weightKg: number, heightM: number, sex: string): number {
  const hcm = heightM * 100
  if (sex.toUpperCase() === 'F') {
    return 1.07 * weightKg - 148 * Math.pow(weightKg / hcm, 2)
  }
  return 1.10 * weightKg - 128 * Math.pow(weightKg / hcm, 2)
}

/**
 * Returns the decay-corrected dose in Bq for the given series/frame.
 * If the scanner already applied decay correction to scan start (decayCorrected=true),
 * we use the injected dose as-is; otherwise we decay-correct to acquisition time.
 */
export function correctedDoseBq(series: PetSeries, manualDoseBq?: number): number | null {
  const info = series.radiopharmInfo
  if (!info) return null
  const dose = manualDoseBq ?? info.injectedDose
  if (!dose) return null

  if (series.decayCorrected) return dose

  const acqTime = series.acquisitionTime
  if (!acqTime) return dose   // can't compute delta, return as-is

  const delta = elapsedSeconds(info.injectionTime, acqTime)
  return dose * decayFactor(info.halfLife, delta)
}

export function pixelToActivityConc(pixel: number, slope: number, intercept: number): number {
  return pixel * slope + intercept
}

export function suvBw(bqPerMl: number, correctedDoseBq: number, weightKg: number): number {
  return bqPerMl / (correctedDoseBq / (weightKg * 1000))
}

export function suvBsa(bqPerMl: number, correctedDoseBq: number, weightKg: number, heightM: number): number {
  const bsaM2 = bsa(weightKg, heightM)
  return bqPerMl / (correctedDoseBq / (bsaM2 * 10000))
}

export function suvLbm(bqPerMl: number, correctedDoseBq: number, weightKg: number, heightM: number, sex: string): number {
  const lbmKg = lbm(weightKg, heightM, sex)
  return bqPerMl / (correctedDoseBq / (lbmKg * 1000))
}

export function calcSuvForFrame(
  frame: DicomFrame,
  series: PetSeries,
  suvType: SuvType,
  manualWeightKg?: number,
  manualDoseBq?: number,
): Float32Array | null {
  const dose = correctedDoseBq(series, manualDoseBq)
  if (!dose) return null

  const weight = manualWeightKg ?? series.patientWeight
  if (!weight) return null

  const height = series.patientSize
  const sex    = series.patientSex ?? 'M'

  if ((suvType === 'bsa' || suvType === 'lbm') && !height) return null

  const { pixelData, rows, cols, rescaleSlope, rescaleIntercept } = frame
  const n = rows * cols
  const out = new Float32Array(n)

  for (let i = 0; i < n; i++) {
    const bqMl = pixelToActivityConc(pixelData[i], rescaleSlope, rescaleIntercept)
    if (bqMl <= 0) { out[i] = 0; continue }
    switch (suvType) {
      case 'bw':  out[i] = suvBw(bqMl, dose, weight); break
      case 'bsa': out[i] = suvBsa(bqMl, dose, weight, height!); break
      case 'lbm': out[i] = suvLbm(bqMl, dose, weight, height!, sex); break
    }
  }
  return out
}

export function calcStats(suv: Float32Array): SuvStats {
  let sum = 0, max = -Infinity, min = Infinity, count = 0
  for (let i = 0; i < suv.length; i++) {
    const v = suv[i]
    if (v > 0) { sum += v; count++; if (v > max) max = v; if (v < min) min = v }
  }
  return {
    mean:       count > 0 ? sum / count : 0,
    max:        count > 0 ? max : 0,
    min:        count > 0 ? min : 0,
    voxelCount: count,
  }
}
