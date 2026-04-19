import type { PetSeries, SuvType } from '../../types'
import { calcSuvForFrame } from '../suv/calculate'

function generateUID(): string {
  const ts = Date.now().toString()
  const rand = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0')
  return `2.25.${ts}${rand}`
}

function padToEven(buf: Uint8Array, padByte = 0x20): Uint8Array {
  if (buf.length % 2 === 0) return buf
  const out = new Uint8Array(buf.length + 1)
  out.set(buf)
  out[buf.length] = padByte
  return out
}

const LONG_VRS = new Set(['OB','OD','OF','OL','OW','SQ','UC','UN','UR','UT','OV','SV','UV'])

function writeElement(group: number, el: number, vr: string, value: Uint8Array): Uint8Array {
  const isLong = LONG_VRS.has(vr)
  const padded = padToEven(value, vr === 'UI' ? 0x00 : 0x20)
  const headerLen = isLong ? 12 : 8
  const out = new Uint8Array(headerLen + padded.length)
  const view = new DataView(out.buffer)
  view.setUint16(0, group, true)
  view.setUint16(2, el,    true)
  out[4] = vr.charCodeAt(0)
  out[5] = vr.charCodeAt(1)
  if (isLong) {
    view.setUint16(6, 0, true)               // reserved
    view.setUint32(8, padded.length, true)
  } else {
    view.setUint16(6, padded.length, true)
  }
  out.set(padded, headerLen)
  return out
}

function writeUS(group: number, el: number, val: number): Uint8Array {
  const v = new Uint8Array(2)
  new DataView(v.buffer).setUint16(0, val, true)
  return writeElement(group, el, 'US', v)
}

function writeDS(group: number, el: number, val: string): Uint8Array {
  return writeElement(group, el, 'DS', new TextEncoder().encode(val))
}

function writeLO(group: number, el: number, val: string): Uint8Array {
  return writeElement(group, el, 'LO', new TextEncoder().encode(val))
}

function writeUI(group: number, el: number, val: string): Uint8Array {
  return writeElement(group, el, 'UI', new TextEncoder().encode(val))
}

function writeCS(group: number, el: number, val: string): Uint8Array {
  return writeElement(group, el, 'CS', new TextEncoder().encode(val))
}

function writeOW(group: number, el: number, pixelData: Uint16Array): Uint8Array {
  return writeElement(group, el, 'OW', new Uint8Array(pixelData.buffer))
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

/**
 * Build a minimal but valid Explicit VR Little Endian DICOM file for a single frame
 * carrying SUV pixel data scaled ×1000 → uint16 (RescaleSlope=0.001).
 */
async function buildSuvDicom(
  sourceFile: File,
  scaledPixels: Uint16Array,
  newSeriesUID: string,
  seriesDescription: string,
): Promise<ArrayBuffer> {
  const buf = await sourceFile.arrayBuffer()
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dicomParser = (await import('dicom-parser')).default as typeof import('dicom-parser')
  const ds = dicomParser.parseDicom(new Uint8Array(buf))

  const s = (tag: string) => { try { return ds.string(tag) ?? '' } catch { return '' } }
  const u = (tag: string) => { try { return ds.uint16(tag) ?? 0 } catch { return 0 } }

  const rows = u('x00280010')
  const cols = u('x00280011')
  const sopClassUID = s('x00080016') || '1.2.840.10008.5.1.4.1.1.128'
  const newSOPUID = generateUID()

  // Preamble
  const preamble = new Uint8Array(128)
  const magic = new TextEncoder().encode('DICM')

  // Meta group (0002)
  const metaElements = concat([
    writeOB_seq(0x0002, 0x0001, new Uint8Array([0x00, 0x01])),   // FileMetaInformationVersion
    writeUI(0x0002, 0x0002, sopClassUID),                        // MediaStorageSOPClassUID
    writeUI(0x0002, 0x0003, newSOPUID),                          // MediaStorageSOPInstanceUID
    writeUI(0x0002, 0x0010, '1.2.840.10008.1.2.1'),              // TransferSyntaxUID (Explicit LE)
  ])
  // Prefix meta group length element
  const metaLen = new Uint8Array(4)
  new DataView(metaLen.buffer).setUint32(0, metaElements.length, true)
  const metaGroupLength = writeElement(0x0002, 0x0000, 'UL', metaLen)
  const metaGroup = concat([metaGroupLength, metaElements])

  // Copy selected patient / study tags from original (read as raw byte spans)
  const passThroughTags = [
    'x00080020', // StudyDate
    'x00080030', // StudyTime
    'x00080050', // AccessionNumber
    'x00080060', // Modality
    'x00100010', // PatientName
    'x00100020', // PatientID
    'x00100030', // PatientBirthDate
    'x00100040', // PatientSex
    'x00101030', // PatientWeight
    'x00101020', // PatientSize
    'x00200010', // StudyID
    'x00200011', // SeriesNumber
    'x00200013', // InstanceNumber
    'x00201041', // SliceLocation
  ]

  const passElems: Uint8Array[] = []
  for (const tag of passThroughTags) {
    try {
      const raw = ds.string(tag)
      if (raw !== undefined) {
        const g = parseInt(tag.slice(1, 5), 16)
        const e = parseInt(tag.slice(5, 9), 16)
        passElems.push(writeLO(g, e, raw))
      }
    } catch { /* skip */ }
  }

  // Dataset
  const dataset = concat([
    ...passElems,
    writeUI(0x0008, 0x0016, sopClassUID),                         // SOPClassUID
    writeUI(0x0008, 0x0018, newSOPUID),                           // SOPInstanceUID
    writeLO(0x0008, 0x103E, seriesDescription),                   // SeriesDescription
    writeUI(0x0020, 0x000D, s('x0020000d') || generateUID()),     // StudyInstanceUID
    writeUI(0x0020, 0x000E, newSeriesUID),                        // SeriesInstanceUID
    writeUS(0x0028, 0x0010, rows),                                // Rows
    writeUS(0x0028, 0x0011, cols),                                // Columns
    writeUS(0x0028, 0x0100, 16),                                  // BitsAllocated
    writeUS(0x0028, 0x0101, 16),                                  // BitsStored
    writeUS(0x0028, 0x0102, 15),                                  // HighBit
    writeUS(0x0028, 0x0103, 0),                                   // PixelRepresentation (unsigned)
    writeUS(0x0028, 0x0002, 1),                                   // SamplesPerPixel
    writeCS(0x0028, 0x0004, 'MONOCHROME2'),                       // PhotometricInterpretation
    writeDS(0x0028, 0x1052, '0'),                                  // RescaleIntercept
    writeDS(0x0028, 0x1053, '0.001'),                              // RescaleSlope (SUV×1000→uint16)
    writeCS(0x0054, 0x1001, 'CNTS'),                              // Units
    writeOW(0x7FE0, 0x0010, scaledPixels),                        // PixelData
  ])

  const result = concat([preamble, magic, metaGroup, dataset])
  return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer
}

// OB element (for FileMetaInformationVersion which needs OB not UI)
function writeOB_seq(group: number, el: number, value: Uint8Array): Uint8Array {
  return writeElement(group, el, 'OB', value)
}

export async function exportSuvSeries(
  series: PetSeries,
  suvType: SuvType,
  manualWeightKg?: number,
  manualDoseBq?: number,
): Promise<Blob> {
  const JSZip = (await import('jszip')).default
  const zip = new JSZip()

  const newSeriesUID = generateUID()
  const suvLabel = suvType.toUpperCase()
  const desc = `${series.seriesDescription ?? 'PET'}_SUV${suvLabel}`
  let exported = 0

  for (let i = 0; i < series.frames.length; i++) {
    const frame = series.frames[i]
    if (!frame.sourceFile) continue

    const suv = calcSuvForFrame(frame, series, suvType, manualWeightKg, manualDoseBq)
    if (!suv) continue

    // Scale SUV × 1000 → uint16  (preserves 3 decimal places, max representable = 65.535)
    const scaledPixels = new Uint16Array(suv.length)
    for (let j = 0; j < suv.length; j++) {
      scaledPixels[j] = Math.min(65535, Math.round(suv[j] * 1000))
    }

    try {
      const dcmBuffer = await buildSuvDicom(frame.sourceFile, scaledPixels, newSeriesUID, desc)
      zip.file(`${desc}_${String(i + 1).padStart(4, '0')}.dcm`, dcmBuffer)
      exported++
    } catch { /* skip failed frames */ }
  }

  if (exported === 0) throw new Error('No frames could be exported — ensure weight and dose are available')
  return zip.generateAsync({ type: 'blob', compression: 'STORE' })
}
