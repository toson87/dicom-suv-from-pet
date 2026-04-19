import * as dicomParser from 'dicom-parser'
import type { DicomFrame, PetSeries, RadiopharmInfo } from '../../types'
import { TAGS } from './tags'

function str(ds: dicomParser.DataSet, tag: string): string | undefined {
  try { return ds.string(tag)?.trim() || undefined } catch { return undefined }
}

function num(ds: dicomParser.DataSet, tag: string): number | undefined {
  try {
    const v = ds.floatString(tag)
    return v !== undefined && !isNaN(v) ? v : undefined
  } catch { return undefined }
}

function uint16(ds: dicomParser.DataSet, tag: string): number | undefined {
  try { return ds.uint16(tag) } catch { return undefined }
}

function extractPixelData(ds: dicomParser.DataSet): DicomFrame['pixelData'] | null {
  const el = ds.elements[TAGS.pixelData]
  if (!el) return null
  const bits = uint16(ds, TAGS.bitsAllocated) ?? 16
  const repr = uint16(ds, TAGS.pixelRepresentation) ?? 0
  const offset = el.dataOffset
  const len    = el.length
  if (bits === 16) {
    return repr === 1
      ? new Int16Array(ds.byteArray.buffer.slice(offset, offset + len))
      : new Uint16Array(ds.byteArray.buffer.slice(offset, offset + len))
  }
  return new Uint8Array(ds.byteArray.buffer.slice(offset, offset + len))
}

async function parseFile(file: File): Promise<{ uid: string; series: Partial<PetSeries>; frame: DicomFrame } | null> {
  const buffer = await file.arrayBuffer()
  let ds: dicomParser.DataSet
  try {
    ds = dicomParser.parseDicom(new Uint8Array(buffer))
  } catch {
    return null
  }

  const uid = str(ds, TAGS.seriesInstanceUID)
  if (!uid) return null

  const rows        = uint16(ds, TAGS.rows) ?? 0
  const cols        = uint16(ds, TAGS.cols) ?? 0
  const pixelData   = extractPixelData(ds)
  if (!pixelData || rows === 0 || cols === 0) return null

  const rescaleSlope     = num(ds, TAGS.rescaleSlope) ?? 1
  const rescaleIntercept = num(ds, TAGS.rescaleIntercept) ?? 0
  const instanceNumber   = parseInt(str(ds, TAGS.instanceNumber) ?? '0', 10)
  const sliceLocation    = num(ds, TAGS.sliceLocation)

  const frame: DicomFrame = { instanceNumber, sliceLocation, pixelData, rows, cols, rescaleSlope, rescaleIntercept, sourceFile: file }

  // RadiopharmaceuticalInformationSequence
  let radiopharmInfo: RadiopharmInfo | undefined
  const seqEl = ds.elements[TAGS.radiopharmSeq]
  if (seqEl?.items?.[0]?.dataSet) {
    const pd = seqEl.items[0].dataSet
    const injectedDose  = num(pd, TAGS.injectedDose)
    const halfLife      = num(pd, TAGS.halfLife)
    const injectionTime = str(pd, TAGS.injectionTime)
    if (injectedDose && halfLife && injectionTime) {
      radiopharmInfo = {
        injectedDose,
        halfLife,
        injectionTime,
        radiopharmaceutical: str(pd, TAGS.radiopharmaceutical),
      }
    }
  }

  const decayStr = str(ds, TAGS.decayCorrection)?.toUpperCase()
  const decayCorrected = decayStr === 'START' || decayStr === 'ADMIN'

  const partial: Partial<PetSeries> = {
    seriesInstanceUID:  uid,
    seriesDescription:  str(ds, TAGS.seriesDescription),
    modality:           str(ds, TAGS.modality) ?? 'PT',
    acquisitionDate:    str(ds, TAGS.acquisitionDate),
    acquisitionTime:    str(ds, TAGS.acquisitionTime),
    patientName:        str(ds, TAGS.patientName)?.replace(/\^/g, ' '),
    patientID:          str(ds, TAGS.patientID),
    patientWeight:      num(ds, TAGS.patientWeight),
    patientSize:        num(ds, TAGS.patientSize),
    patientSex:         str(ds, TAGS.patientSex),
    units:              str(ds, TAGS.units)?.toUpperCase(),
    decayCorrected,
    radiopharmInfo,
  }

  return { uid, series: partial, frame }
}

export async function parseFiles(files: File[]): Promise<PetSeries[]> {
  const dicomFiles = files.filter(f => !f.name.endsWith('.json') && !f.name.endsWith('.txt'))

  const results = await Promise.all(dicomFiles.map(parseFile))
  const valid   = results.filter((r): r is NonNullable<typeof r> => r !== null)

  const byUID = new Map<string, { meta: Partial<PetSeries>; frames: DicomFrame[] }>()

  for (const { uid, series, frame } of valid) {
    if (!byUID.has(uid)) {
      byUID.set(uid, { meta: series, frames: [] })
    }
    const entry = byUID.get(uid)!
    // Prefer frames from instances that have radiopharm info
    if (series.radiopharmInfo && !entry.meta.radiopharmInfo) {
      Object.assign(entry.meta, series)
    }
    entry.frames.push(frame)
  }

  const seriesList: PetSeries[] = []

  for (const [uid, { meta, frames }] of byUID) {
    frames.sort((a, b) => a.instanceNumber - b.instanceNumber)

    const warnings: string[] = []
    if (!meta.radiopharmInfo) warnings.push('No radiopharmaceutical injection data found — SUV cannot be calculated')
    if (!meta.patientWeight)  warnings.push('Patient weight missing — enter manually to enable SUVbw')
    if (meta.units && meta.units !== 'BQML') warnings.push(`Pixel units are "${meta.units}" (expected BQML) — SUV values may be incorrect`)

    seriesList.push({
      seriesInstanceUID: uid,
      seriesDescription: meta.seriesDescription,
      modality:          meta.modality ?? 'PT',
      acquisitionDate:   meta.acquisitionDate,
      acquisitionTime:   meta.acquisitionTime,
      patientName:       meta.patientName,
      patientID:         meta.patientID,
      patientWeight:     meta.patientWeight,
      patientSize:       meta.patientSize,
      patientSex:        meta.patientSex,
      radiopharmInfo:    meta.radiopharmInfo,
      decayCorrected:    meta.decayCorrected ?? false,
      units:             meta.units,
      frames,
      warnings,
    })
  }

  return seriesList
}
