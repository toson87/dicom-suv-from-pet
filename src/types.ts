export interface RadiopharmInfo {
  injectedDose: number       // Bq
  injectionTime: string      // raw HHMMSS.FFFFFF
  halfLife: number           // seconds
  radiopharmaceutical?: string
}

export interface DicomFrame {
  instanceNumber: number
  sliceLocation?: number
  pixelData: Int16Array | Uint16Array | Uint8Array
  rows: number
  cols: number
  rescaleSlope: number
  rescaleIntercept: number
}

export interface PetSeries {
  seriesInstanceUID: string
  seriesDescription?: string
  modality: string
  acquisitionDate?: string   // YYYYMMDD
  acquisitionTime?: string   // HHMMSS.FFFFFF
  patientName?: string
  patientID?: string
  patientWeight?: number     // kg
  patientSize?: number       // m
  patientSex?: string        // M / F / O
  radiopharmInfo?: RadiopharmInfo
  decayCorrected: boolean
  units?: string
  frames: DicomFrame[]
  warnings: string[]
}

export type SuvType = 'bw' | 'bsa' | 'lbm'

export interface SuvStats {
  mean: number
  max: number
  min: number
  voxelCount: number
}
