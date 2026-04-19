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
const enc = (v: string) => new TextEncoder().encode(v)

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
    view.setUint16(6, 0, true)
    view.setUint32(8, padded.length, true)
  } else {
    view.setUint16(6, padded.length, true)
  }
  out.set(padded, headerLen)
  return out
}

// Short-VR helpers — all safe to call with empty string (writes zero-length element)
const writeUI = (g: number, e: number, v: string) => writeElement(g, e, 'UI', enc(v))
const writeCS = (g: number, e: number, v: string) => writeElement(g, e, 'CS', enc(v))
const writeLO = (g: number, e: number, v: string) => writeElement(g, e, 'LO', enc(v))
const writeDA = (g: number, e: number, v: string) => writeElement(g, e, 'DA', enc(v))
const writeTM = (g: number, e: number, v: string) => writeElement(g, e, 'TM', enc(v))
const writeSH = (g: number, e: number, v: string) => writeElement(g, e, 'SH', enc(v))
const writePN = (g: number, e: number, v: string) => writeElement(g, e, 'PN', enc(v))
const writeIS = (g: number, e: number, v: string) => writeElement(g, e, 'IS', enc(v))
const writeDS = (g: number, e: number, v: string) => writeElement(g, e, 'DS', enc(v))

function writeUS(group: number, el: number, val: number): Uint8Array {
  const v = new Uint8Array(2)
  new DataView(v.buffer).setUint16(0, val, true)
  return writeElement(group, el, 'US', v)
}

function writeOW(group: number, el: number, pixelData: Uint16Array): Uint8Array {
  return writeElement(group, el, 'OW', new Uint8Array(pixelData.buffer))
}

function writeOB(group: number, el: number, value: Uint8Array): Uint8Array {
  return writeElement(group, el, 'OB', value)
}

function concat(arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

/**
 * Build a conformant Explicit VR Little Endian DICOM file for a single SUV frame.
 * Tags are written in strict ascending (group, element) order with correct VRs.
 * Pixel values = SUV × 1000 (uint16); RescaleSlope=0.001 restores true SUV.
 * Units=GML (g/mL) correctly identifies this as an SUV image.
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

  const rows        = u('x00280010')
  const cols        = u('x00280011')
  const sopClassUID = '1.2.840.10008.5.1.4.1.1.7'  // Secondary Capture — viewers apply RescaleSlope faithfully
  const newSOPUID   = generateUID()

  // ── Meta group (0002) ──────────────────────────────────────────────────────
  const metaElems = concat([
    writeOB(0x0002, 0x0001, new Uint8Array([0x00, 0x01])),  // FileMetaInformationVersion
    writeUI(0x0002, 0x0002, sopClassUID),                    // MediaStorageSOPClassUID
    writeUI(0x0002, 0x0003, newSOPUID),                      // MediaStorageSOPInstanceUID
    writeUI(0x0002, 0x0010, '1.2.840.10008.1.2.1'),          // TransferSyntaxUID (Explicit LE)
  ])
  const metaLen = new Uint8Array(4)
  new DataView(metaLen.buffer).setUint32(0, metaElems.length, true)
  const metaGroup = concat([writeElement(0x0002, 0x0000, 'UL', metaLen), metaElems])

  // ── Dataset — strict ascending (group, element) order ─────────────────────
  const dataset = concat([
    // Group 0008
    writeUI(0x0008, 0x0016, sopClassUID),                          // SOPClassUID
    writeUI(0x0008, 0x0018, newSOPUID),                            // SOPInstanceUID
    writeDA(0x0008, 0x0020, s('x00080020')),                       // StudyDate
    writeTM(0x0008, 0x0030, s('x00080030')),                       // StudyTime
    writeSH(0x0008, 0x0050, s('x00080050')),                       // AccessionNumber
    writeCS(0x0008, 0x0060, 'OT'),                                   // Modality — derived/other, not PT
    writeLO(0x0008, 0x103E, seriesDescription),                    // SeriesDescription
    // Group 0010
    writePN(0x0010, 0x0010, s('x00100010')),                       // PatientName
    writeLO(0x0010, 0x0020, s('x00100020')),                       // PatientID
    writeDA(0x0010, 0x0030, s('x00100030')),                       // PatientBirthDate
    writeCS(0x0010, 0x0040, s('x00100040')),                       // PatientSex
    writeDS(0x0010, 0x1020, s('x00101020')),                       // PatientSize
    writeDS(0x0010, 0x1030, s('x00101030')),                       // PatientWeight
    // Group 0020
    writeUI(0x0020, 0x000D, s('x0020000d') || generateUID()),      // StudyInstanceUID
    writeUI(0x0020, 0x000E, newSeriesUID),                         // SeriesInstanceUID
    writeSH(0x0020, 0x0010, s('x00200010')),                       // StudyID
    writeIS(0x0020, 0x0011, s('x00200011')),                       // SeriesNumber
    writeIS(0x0020, 0x0013, s('x00200013')),                       // InstanceNumber
    writeDS(0x0020, 0x1041, s('x00201041')),                       // SliceLocation
    // Group 0028 — image pixel description (ascending element order)
    writeUS(0x0028, 0x0002, 1),                                    // SamplesPerPixel
    writeCS(0x0028, 0x0004, 'MONOCHROME2'),                        // PhotometricInterpretation
    writeUS(0x0028, 0x0010, rows),                                 // Rows
    writeUS(0x0028, 0x0011, cols),                                 // Columns
    writeUS(0x0028, 0x0100, 16),                                   // BitsAllocated
    writeUS(0x0028, 0x0101, 16),                                   // BitsStored
    writeUS(0x0028, 0x0102, 15),                                   // HighBit
    writeUS(0x0028, 0x0103, 0),                                    // PixelRepresentation (unsigned)
    writeDS(0x0028, 0x1052, '0'),                                  // RescaleIntercept
    writeDS(0x0028, 0x1053, '0.001'),                              // RescaleSlope (÷1000 → SUV)
    writeCS(0x0028, 0x1054, 'US'),                                 // RescaleType
    // Group 0054 — PET
    writeCS(0x0054, 0x1001, 'GML'),                                // Units: g/mL = SUV
    // Pixel data
    writeOW(0x7FE0, 0x0010, scaledPixels),
  ])

  const preamble = new Uint8Array(128)
  const magic    = enc('DICM')
  const result   = concat([preamble, magic, metaGroup, dataset])
  return result.buffer.slice(result.byteOffset, result.byteOffset + result.byteLength) as ArrayBuffer
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

    // Scale SUV × 1000 → uint16 (preserves 3 decimal places; max SUV = 65.535)
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
