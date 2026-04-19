import type { PetSeries, SuvType } from '../../types'
import type { ViewportState } from '../../lib/imaging/viewport'
import { COLORMAP_LABELS, type ColormapName } from '../../lib/imaging/colormaps'
import { CT_PRESETS } from '../../lib/imaging/viewport'

interface Props {
  series: PetSeries | null
  petSeries: PetSeries[]           // available PET series for overlay when primary=CT
  overlayPetUID: string | null
  onOverlayPetChange: (uid: string | null) => void
  petOverlayEnabled: boolean
  onPetOverlayToggle: (v: boolean) => void
  overlayMatches: boolean          // false = matrix mismatch
  suvType: SuvType
  vp: ViewportState
  onVpChange: (patch: Partial<ViewportState>) => void
  onReset: () => void
}

const COLORMAPS = Object.entries(COLORMAP_LABELS) as [ColormapName, string][]
const SUV_TYPES: SuvType[] = ['bw', 'bsa', 'lbm']

export default function ViewerToolbar({
  series, petSeries, overlayPetUID, onOverlayPetChange,
  petOverlayEnabled, onPetOverlayToggle, overlayMatches,
  suvType, vp, onVpChange, onReset,
}: Props) {
  const suvMin = vp.suvCenter - vp.suvWidth / 2
  const suvMax = vp.suvCenter + vp.suvWidth / 2
  const isPrimaryCt = series?.modality === 'CT'

  const btnBase: React.CSSProperties = {
    padding: '4px 10px', borderRadius: 4, fontSize: 13, cursor: 'pointer',
    border: '1px solid #30363d',
  }
  const btnActive: React.CSSProperties = { ...btnBase, background: '#1f6feb', color: '#fff', border: 'none' }
  const btnGhost: React.CSSProperties  = { ...btnBase, background: 'transparent', color: '#8b949e' }
  const btnToggleOn: React.CSSProperties  = { ...btnBase, background: '#1f6feb', color: '#fff', border: 'none', fontSize: 12 }
  const btnToggleOff: React.CSSProperties = { ...btnBase, background: '#21262d', color: '#8b949e', fontSize: 12 }

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

      {/* ── CT primary: PET overlay controls + CT window presets ── */}
      {isPrimaryCt && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>PET overlay</span>

            {petSeries.length === 0 ? (
              <span style={{ fontSize: 12, color: '#484f58' }}>— load PET files</span>
            ) : (
              <>
                <button
                  onClick={() => onPetOverlayToggle(!petOverlayEnabled)}
                  style={petOverlayEnabled ? btnToggleOn : btnToggleOff}
                >
                  {petOverlayEnabled ? 'On' : 'Off'}
                </button>

                {petSeries.length > 1 && (
                  <select
                    value={overlayPetUID ?? ''}
                    onChange={e => onOverlayPetChange(e.target.value || null)}
                    style={{
                      background: '#1c2128', border: '1px solid #30363d', borderRadius: 4,
                      color: '#e6edf3', padding: '3px 6px', fontSize: 13, cursor: 'pointer',
                    }}
                  >
                    {petSeries.map(s => (
                      <option key={s.seriesInstanceUID} value={s.seriesInstanceUID}>
                        {s.seriesDescription ?? 'PET Series'}
                      </option>
                    ))}
                  </select>
                )}

                {petOverlayEnabled && overlayMatches && (
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

                {petOverlayEnabled && !overlayMatches && petSeries.length > 0 && (
                  <span style={{ fontSize: 12, color: '#ff8a80', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M6 1L11 10H1L6 1Z" stroke="#ff8a80" strokeWidth="1.2" fill="none"/>
                      <line x1="6" y1="5" x2="6" y2="7.5" stroke="#ff8a80" strokeWidth="1.2"/>
                      <circle cx="6" cy="9" r="0.6" fill="#ff8a80"/>
                    </svg>
                    Matrix mismatch — overlay disabled
                  </span>
                )}
              </>
            )}
          </div>

          <div style={{ width: 1, height: 20, background: '#30363d' }} />

          {/* CT window presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 12, color: '#8b949e' }}>CT window</span>
            {CT_PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => onVpChange({ ctCenter: p.center, ctWidth: p.width })}
                style={btnGhost}
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── PET primary: SUV type selector ── */}
      {!isPrimaryCt && (
        <div style={{ display: 'flex', gap: 4 }}>
          {SUV_TYPES.map(t => (
            <button
              key={t}
              style={t === suvType ? btnActive : btnGhost}
              title={`Displaying SUV${t.toUpperCase()}`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      )}

    </div>
  )
}
