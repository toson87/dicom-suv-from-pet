import { useState } from 'react'
import type { PetSeries, SuvType } from '../../types'
import type { ViewportState } from '../../lib/imaging/viewport'
import { COLORMAP_LABELS, type ColormapName } from '../../lib/imaging/colormaps'
import { exportSuvSeries } from '../../lib/dicom/exportSuv'

interface Props {
  series: PetSeries | null
  ctSeries: PetSeries[]             // available CT series for overlay
  selectedCtUID: string | null
  onSelectCt: (uid: string | null) => void
  suvType: SuvType
  vp: ViewportState
  onVpChange: (patch: Partial<ViewportState>) => void
  onReset: () => void
  manualWeight?: number
  manualDose?: number
}

const COLORMAPS = Object.entries(COLORMAP_LABELS) as [ColormapName, string][]
const SUV_TYPES: SuvType[] = ['bw', 'bsa', 'lbm']

export default function ViewerToolbar({
  series, ctSeries, selectedCtUID, onSelectCt,
  suvType, vp, onVpChange, onReset,
  manualWeight, manualDose,
}: Props) {
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)

  const suvMin = vp.suvCenter - vp.suvWidth / 2
  const suvMax = vp.suvCenter + vp.suvWidth / 2

  async function handleExport() {
    if (!series) return
    setExporting(true)
    setExportError(null)
    try {
      const manualDoseBq = manualDose ? manualDose * 1e6 : undefined
      const blob = await exportSuvSeries(series, suvType, manualWeight, manualDoseBq)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${series.seriesDescription ?? 'PET'}_SUV${suvType.toUpperCase()}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError((err as Error).message)
    } finally {
      setExporting(false)
    }
  }

  const btnBase: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
    border: '1px solid #30363d',
  }
  const btnActive: React.CSSProperties = { ...btnBase, background: '#1f6feb', color: '#fff', border: 'none' }
  const btnGhost: React.CSSProperties  = { ...btnBase, background: 'transparent', color: '#8b949e' }

  return (
    <div style={{
      borderBottom: '1px solid #30363d', padding: '6px 12px',
      display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      background: '#0d1117', flexShrink: 0,
    }}>

      {/* Colormap */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#8b949e' }}>Colormap</span>
        <select
          value={vp.colormap}
          onChange={e => onVpChange({ colormap: e.target.value as ColormapName })}
          style={{
            background: '#1c2128', border: '1px solid #30363d', borderRadius: 4,
            color: '#e6edf3', padding: '3px 6px', fontSize: 13,
            fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer',
          }}
        >
          {COLORMAPS.map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
      </div>

      <div style={{ width: 1, height: 20, background: '#30363d' }} />

      {/* SUV window */}
      <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
        <span style={{ color: '#8b949e' }}>SUV</span>
        <span style={{ color: '#e6edf3' }}>{suvMin.toFixed(1)}–{suvMax.toFixed(1)}</span>
        <button onClick={onReset} style={btnGhost} title="Reset view">↺</button>
      </div>

      <div style={{ width: 1, height: 20, background: '#30363d' }} />

      {/* CT overlay */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 12, color: '#8b949e' }}>CT overlay</span>
        {ctSeries.length === 0 ? (
          <span style={{ fontSize: 12, color: '#484f58' }}>— load CT files</span>
        ) : (
          <>
            <select
              value={selectedCtUID ?? ''}
              onChange={e => onSelectCt(e.target.value || null)}
              style={{
                background: '#1c2128', border: '1px solid #30363d', borderRadius: 4,
                color: '#e6edf3', padding: '3px 6px', fontSize: 13, cursor: 'pointer',
              }}
            >
              <option value="">Off</option>
              {ctSeries.map(s => (
                <option key={s.seriesInstanceUID} value={s.seriesInstanceUID}>
                  {s.seriesDescription ?? 'CT Series'}
                </option>
              ))}
            </select>
            {selectedCtUID && (
              <>
                <span style={{ fontSize: 12, color: '#8b949e' }}>opacity</span>
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={vp.petOpacity}
                  onChange={e => onVpChange({ petOpacity: Number(e.target.value) })}
                  style={{ width: 70, accentColor: '#f0883e' }}
                />
                <span className="mono" style={{ fontSize: 12, color: '#8b949e', minWidth: 28 }}>
                  {Math.round(vp.petOpacity * 100)}%
                </span>
              </>
            )}
          </>
        )}
      </div>

      {/* CT matrix mismatch warning */}
      {selectedCtUID && series && (() => {
        const ct = ctSeries.find(s => s.seriesInstanceUID === selectedCtUID)
        if (!ct || !series.frames[0] || !ct.frames[0]) return null
        const f = series.frames[0]
        const c = ct.frames[0]
        if (f.rows !== c.rows || f.cols !== c.cols) {
          return (
            <span style={{ fontSize: 12, color: '#ff8a80', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 10H1L6 1Z" stroke="#ff8a80" strokeWidth="1.2" fill="none"/>
                <line x1="6" y1="5" x2="6" y2="7.5" stroke="#ff8a80" strokeWidth="1.2"/>
                <circle cx="6" cy="9" r="0.6" fill="#ff8a80"/>
              </svg>
              Matrix mismatch — PET {f.rows}×{f.cols} vs CT {c.rows}×{c.cols}
            </span>
          )
        }
        return null
      })()}

      <div style={{ flex: 1 }} />

      {/* SUV type */}
      <div style={{ display: 'flex', gap: 4 }}>
        {SUV_TYPES.map(t => (
          <button
            key={t}
            style={t === suvType ? btnActive : btnGhost}
            // suvType change is handled by parent via StatsPanel; display only
            title={`Displaying SUV${t.toUpperCase()}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      <div style={{ width: 1, height: 20, background: '#30363d' }} />

      {/* Export */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
        <button
          onClick={handleExport}
          disabled={!series || exporting}
          style={{
            ...btnBase,
            background: series && !exporting ? '#238636' : '#21262d',
            color: series && !exporting ? '#fff' : '#484f58',
            border: 'none',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          {exporting ? (
            <>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="6" cy="6" r="4" stroke="#484f58" strokeWidth="1.5"/>
                <path d="M6 2a4 4 0 0 1 4 4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Exporting…
            </>
          ) : 'Export SUV DICOM'}
        </button>
        {exportError && (
          <span style={{ fontSize: 11, color: '#ff8a80', maxWidth: 200, textAlign: 'right' }}>
            {exportError}
          </span>
        )}
      </div>
    </div>
  )
}
