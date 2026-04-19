interface Props {
  seriesCount: number
  frameCount: number
}

export default function TopBar({ seriesCount, frameCount }: Props) {
  return (
    <header style={{
      height: 48, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 18px',
      background: '#010409', borderBottom: '1px solid #30363d',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: '#0d1117',
          display: 'grid', placeItems: 'center', border: '1px solid #30363d',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="6" stroke="#f0883e" strokeWidth="1.5"/>
            <circle cx="8" cy="8" r="2.5" fill="#f0883e"/>
          </svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, letterSpacing: '-0.005em' }}>
            PET SUV Calculator
          </div>
          <div className="mono" style={{ fontSize: 12, color: '#8b949e', marginTop: -1 }}>
            suv-from-pet
          </div>
        </div>
      </div>

      <div className="mono" style={{ fontSize: 13, color: '#8b949e', display: 'flex', gap: 16 }}>
        {seriesCount > 0 && (
          <>
            <span>{seriesCount} series</span>
            <span>·</span>
            <span>{frameCount} slices</span>
          </>
        )}
      </div>
    </header>
  )
}
