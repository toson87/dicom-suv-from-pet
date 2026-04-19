import type { PetSeries } from '../types'

interface Props {
  series: PetSeries[]
  selectedUID: string | null
  onSelect: (uid: string) => void
}

function ModalityBadge({ modality }: { modality: string }) {
  return (
    <span className="mono" style={{
      fontSize: 11, padding: '2px 6px', borderRadius: 4,
      background: '#3d240f', color: '#ffb484', border: '1px solid #f0883e',
      letterSpacing: '0.04em',
    }}>
      {modality}
    </span>
  )
}

export default function SeriesPanel({ series, selectedUID, onSelect }: Props) {
  return (
    <aside style={{
      background: '#0d1117', borderRight: '1px solid #30363d',
      display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid #21262d',
        fontSize: 11, color: '#8b949e',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Series
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {series.map(s => {
          const selected = s.seriesInstanceUID === selectedUID
          return (
            <div
              key={s.seriesInstanceUID}
              onClick={() => onSelect(s.seriesInstanceUID)}
              style={{
                padding: '10px 14px', cursor: 'pointer',
                background: selected ? '#1c2128' : 'transparent',
                borderLeft: `3px solid ${selected ? '#f0883e' : 'transparent'}`,
                transition: 'background 0.1s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ModalityBadge modality={s.modality} />
                <span className="mono" style={{ fontSize: 13, color: '#8b949e' }}>
                  {s.frames.length} sl
                </span>
              </div>
              <div style={{ fontSize: 14, color: selected ? '#e6edf3' : '#c9d1d9', marginBottom: 2 }}>
                {s.seriesDescription ?? 'PET Series'}
              </div>
              {s.acquisitionDate && (
                <div className="mono" style={{ fontSize: 12, color: '#484f58' }}>
                  {s.acquisitionDate.slice(0, 4)}-{s.acquisitionDate.slice(4, 6)}-{s.acquisitionDate.slice(6, 8)}
                </div>
              )}
              {s.warnings.length > 0 && (
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 1L11 10H1L6 1Z" stroke="#f0883e" strokeWidth="1.2" fill="none"/>
                    <line x1="6" y1="5" x2="6" y2="7.5" stroke="#f0883e" strokeWidth="1.2"/>
                    <circle cx="6" cy="9" r="0.6" fill="#f0883e"/>
                  </svg>
                  <span style={{ fontSize: 12, color: '#f0883e' }}>
                    {s.warnings.length} warning{s.warnings.length > 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
