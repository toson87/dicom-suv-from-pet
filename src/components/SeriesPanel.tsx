import type { PetSeries } from '../types'

interface Props {
  series: PetSeries[]
  ctSeries: PetSeries[]
  selectedUID: string | null
  onSelect: (uid: string) => void
}

function ModalityBadge({ modality, ct }: { modality: string; ct?: boolean }) {
  return (
    <span className="mono" style={{
      fontSize: 11, padding: '2px 6px', borderRadius: 4,
      background: ct ? '#0d2942' : '#3d240f',
      color: ct ? '#79c0ff' : '#ffb484',
      border: `1px solid ${ct ? '#388bfd' : '#f0883e'}`,
      letterSpacing: '0.04em',
    }}>
      {modality}
    </span>
  )
}

function SeriesItem({
  s, selected, accent, onClick,
}: {
  s: PetSeries; selected: boolean; accent: string; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px', cursor: 'pointer',
        background: selected ? '#1c2128' : 'transparent',
        borderLeft: `3px solid ${selected ? accent : 'transparent'}`,
        transition: 'background 0.1s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ModalityBadge modality={s.modality} ct={s.modality === 'CT'} />
        <span className="mono" style={{ fontSize: 13, color: '#8b949e' }}>
          {s.frames.length} sl
        </span>
      </div>
      <div style={{ fontSize: 14, color: selected ? '#e6edf3' : '#c9d1d9', marginBottom: 2 }}>
        {s.seriesDescription ?? (s.modality === 'CT' ? 'CT Series' : 'PET Series')}
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
}

export default function SeriesPanel({
  series, ctSeries, selectedUID, onSelect,
}: Props) {
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
        {series.map(s => (
          <SeriesItem
            key={s.seriesInstanceUID}
            s={s}
            selected={s.seriesInstanceUID === selectedUID}
            accent="#f0883e"
            onClick={() => onSelect(s.seriesInstanceUID)}
          />
        ))}

        {ctSeries.length > 0 && (
          <>
            {series.length > 0 && <div style={{ height: 1, background: '#21262d', margin: '4px 0' }} />}
            {ctSeries.map(s => (
              <SeriesItem
                key={s.seriesInstanceUID}
                s={s}
                selected={s.seriesInstanceUID === selectedUID}
                accent="#388bfd"
                onClick={() => onSelect(s.seriesInstanceUID)}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  )
}
