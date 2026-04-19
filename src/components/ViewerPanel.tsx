import type { PetSeries, SuvStats, SuvType } from '../types'
import type { ViewportState } from '../lib/imaging/viewport'
import { LUTS } from '../lib/imaging/colormaps'
import ViewerCanvas from './viewer/ViewerCanvas'
import ViewerToolbar from './viewer/ViewerToolbar'

interface Props {
  series: PetSeries | null
  ctSeries: PetSeries[]
  selectedCtUID: string | null
  onSelectCt: (uid: string | null) => void
  currentFrame: number
  onFrameChange: (n: number) => void
  suvType: SuvType
  manualWeight?: number
  manualDose?: number
  vp: ViewportState
  onVpChange: (patch: Partial<ViewportState>) => void
  onReset: () => void
  onStatsChange: (s: SuvStats | null) => void
}

export default function ViewerPanel({
  series, ctSeries, selectedCtUID, onSelectCt,
  currentFrame, onFrameChange,
  suvType, manualWeight, manualDose,
  vp, onVpChange, onReset, onStatsChange,
}: Props) {
  const frameCount   = series?.frames.length ?? 0
  const selectedCt   = ctSeries.find(s => s.seriesInstanceUID === selectedCtUID) ?? null

  const suvMin = vp.suvCenter - vp.suvWidth / 2
  const suvMax = vp.suvCenter + vp.suvWidth / 2

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
      <ViewerToolbar
        series={series}
        ctSeries={ctSeries}
        selectedCtUID={selectedCtUID}
        onSelectCt={onSelectCt}
        suvType={suvType}
        vp={vp}
        onVpChange={onVpChange}
        onReset={onReset}
        manualWeight={manualWeight}
        manualDose={manualDose}
      />

      <ViewerCanvas
        series={series}
        ctSeries={selectedCt}
        currentFrame={currentFrame}
        suvType={suvType}
        manualWeight={manualWeight}
        manualDose={manualDose ? manualDose * 1e6 : undefined}
        vp={vp}
        onVpChange={onVpChange}
        onStatsChange={onStatsChange}
      />

      {/* Colormap scale bar */}
      {series && (
        <ColormapBar
          colormap={vp.colormap}
          suvMin={suvMin}
          suvMax={suvMax}
          hasSlices={frameCount > 1}
        />
      )}

      {/* Slice scrubber */}
      {series && frameCount > 1 && (
        <div style={{
          borderTop: '1px solid #21262d', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0d1117', flexShrink: 0,
        }}>
          <button
            onClick={() => onFrameChange(Math.max(0, currentFrame - 1))}
            disabled={currentFrame === 0}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
              color: currentFrame === 0 ? '#484f58' : '#c9d1d9',
              padding: '4px 10px', cursor: currentFrame === 0 ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >‹</button>
          <input
            type="range" min={0} max={frameCount - 1} value={currentFrame}
            onChange={e => onFrameChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#f0883e' }}
          />
          <button
            onClick={() => onFrameChange(Math.min(frameCount - 1, currentFrame + 1))}
            disabled={currentFrame === frameCount - 1}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
              color: currentFrame === frameCount - 1 ? '#484f58' : '#c9d1d9',
              padding: '4px 10px', cursor: currentFrame === frameCount - 1 ? 'not-allowed' : 'pointer', fontSize: 13,
            }}
          >›</button>
          <span className="mono" style={{ fontSize: 13, color: '#8b949e', minWidth: 60, textAlign: 'right' }}>
            {currentFrame + 1} / {frameCount}
          </span>
        </div>
      )}
    </div>
  )
}

function ColormapBar({ colormap, suvMin, suvMax, hasSlices }: {
  colormap: ViewportState['colormap']
  suvMin: number
  suvMax: number
  hasSlices: boolean
}) {
  const lut = LUTS[colormap]
  const stops = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9
    const li = Math.round(t * 255) * 3
    const r = lut[li], g = lut[li + 1], b = lut[li + 2]
    return `rgb(${r},${g},${b}) ${Math.round(t * 100)}%`
  }).join(', ')

  return (
    <div style={{
      position: 'absolute',
      bottom: hasSlices ? 56 : 10,
      left: 12,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      pointerEvents: 'none',
    }}>
      <span className="mono" style={{ fontSize: 10, color: '#8b949e' }}>{suvMax.toFixed(1)}</span>
      <div style={{
        width: 10, height: 80,
        background: `linear-gradient(to bottom, ${stops})`,
        borderRadius: 2, border: '1px solid #30363d',
      }}/>
      <span className="mono" style={{ fontSize: 10, color: '#8b949e' }}>{suvMin.toFixed(1)}</span>
    </div>
  )
}
