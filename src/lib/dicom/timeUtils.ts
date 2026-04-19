/** Parse a DICOM time string (HHMMSS.FFFFFF) into total seconds since midnight. */
export function dicomTimeToSeconds(t: string): number {
  if (!t) return 0
  const clean = t.replace(/[^0-9.]/g, '')
  const h = parseInt(clean.slice(0, 2) || '0', 10)
  const m = parseInt(clean.slice(2, 4) || '0', 10)
  const s = parseFloat(clean.slice(4) || '0')
  return h * 3600 + m * 60 + s
}

/**
 * Compute elapsed seconds between two DICOM time strings,
 * handling midnight rollover (scan after midnight, injection before).
 */
export function elapsedSeconds(injectionTime: string, acquisitionTime: string): number {
  const inj = dicomTimeToSeconds(injectionTime)
  const acq = dicomTimeToSeconds(acquisitionTime)
  let delta = acq - inj
  if (delta < 0) delta += 86400  // midnight rollover
  return delta
}

export function formatSeconds(s: number): string {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = Math.round(s % 60)
  if (h > 0) return `${h}h ${m}m ${sec}s`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

export function formatDicomTime(t: string): string {
  if (!t) return '—'
  const h = t.slice(0, 2)
  const m = t.slice(2, 4)
  const s = t.slice(4, 6)
  return `${h}:${m}:${s}`
}
