import type { PetSeries, SuvStats, SuvType } from '../types'
import type { ViewportState } from '../lib/imaging/viewport'
import { LUTS } from '../lib/imaging/colormaps'
import ViewerCanvas from './viewer/ViewerCanvas'
import ViewerToolbar from './viewer/ViewerToolbar'

interface Props {
  series: PetSeries | null
  petSeries: PetSeries[]
  overlayPetUID: string | null
  onOverlayPetChange: (uid: string | null) => void
  petOverlayEnabled: boolean
  onPetOverlayToggle: (v: boolean) => void
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
  series, petSeries, overlayPetUID, onOverlayPetChange,
  petOverlayEnabled, onPetOverlayToggle,
  currentFrame, onFrameChange,
  suvType, manualWeight, manualDose,
  vp, onVpChange, onReset, onStatsChange,
}: Props) {
  const frameCount  = series?.frames.length ?? 0
  const isPrimaryCt = series?.modality === 'CT'
  const suvMin = vp.suvCenter - vp.suvWidth / 2
  const suvMax = vp.suvCenter + vp.suvWidth / 2

  const overlayPetSeries = isPrimaryCt && petOverlayEnabled && petSeries.length > 0
    ? petSeries.find(s => s.seriesInstanceUID === overlayPetUID) ?? petSeries[0]
    : null

  const primaryFrame0  = series?.frames[0]
  const overlayFrame0  = overlayPetSeries?.frames[0]
  const overlayMatches = !overlayPetSeries || !primaryFrame0 || !overlayFrame0 ||
    (primaryFrame0.rows === overlayFrame0.rows && primaryFrame0.cols === overlayFrame0.cols)

  const effectiveOverlay = overlayMatches ? overlayPetSeries : null
  const showColormap = series && (!isPrimaryCt || !!effectiveOverlay)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <ViewerToolbar
        series={series}
        petSeries={petSeries}
        overlayPetUID={overlayPetUID ?? petSeries[0]?.seriesInstanceUID ?? null}
        onOverlayPetChange={onOverlayPetChange}
        petOverlayEnabled={petOverlayEnabled}
        onPetOverlayToggle={onPetOverlayToggle}
        overlayMatches={overlayMatches}
        suvType={suvType}
        vp={vp}
        onVpChange={onVpChange}
        onReset={onReset}
      />

      {/* Canvas row — viewer + vertical scrubber */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <ViewerCanvas
          series={series}
          overlayPetSeries={effectiveOverlay}
          currentFrame={currentFrame}
          onFrameChange={onFrameChange}
          suvType={suvType}
          manualWeight={manualWeight}
          manualDose={manualDose ? manualDose * 1e6 : undefined}
          vp={vp}
          onVpChange={onVpChange}
          onStatsChange={onStatsChange}
        />

        {/* Colormap scale bar — bottom-left of canvas area */}
        {showColormap && (
          <ColormapBar colormap={vp.colormap} suvMin={suvMin} suvMax={suvMax} />
        )}

        {/* Vertical slice scrubber — right side */}
        {series && frameCount > 1 && (
          <VerticalScrubber
            currentFrame={currentFrame}
            frameCount={frameCount}
            onFrameChange={onFrameChange}
          />
        )}
      </div>
    </div>
  )
}

function VerticalScrubber({ currentFrame, frameCount, onFrameChange }: {
  currentFrame: number
  frameCount: number
  onFrameChange: (n: number) => void
}) {
  const atFirst = currentFrame === 0
  const atLast  = currentFrame === frameCount - 1

  const arrowBtn: React.CSSProperties = {
    background: 'none', border: 'none', padding: '4px',
    lineHeight: 1, cursor: 'pointer', fontSize: 14,
  }

  return (
    <div style={{
      width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '8px 0', gap: 4, flexShrink: 0,
      background: '#0d1117', borderLeft: '1px solid #21262d',
    }}>
      <button
        onClick={() => onFrameChange(Math.max(0, currentFrame - 1))}
        disabled={atFirst}
        style={{ ...arrowBtn, color: atFirst ? '#484f58' : '#8b949e' }}
      >▲</button>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <input
          type="range"
          min={0} max={frameCount - 1}
          value={currentFrame}
          onChange={e => onFrameChange(Number(e.target.value))}
          style={{
            writingMode: 'vertical-lr' as React.CSSProperties['writingMode'],
            height: '100%',
            accentColor: '#f0883e',
            cursor: 'pointer',
          }}
        />
      </div>

      <button
        onClick={() => onFrameChange(Math.min(frameCount - 1, currentFrame + 1))}
        disabled={atLast}
        style={{ ...arrowBtn, color: atLast ? '#484f58' : '#8b949e' }}
      >▼</button>

      <div className="mono" style={{ fontSize: 10, color: '#8b949e', textAlign: 'center', lineHeight: 1.5 }}>
        {currentFrame + 1}<br/><span style={{ color: '#484f58' }}>{frameCount}</span>
      </div>
    </div>
  )
}

function ColormapBar({ colormap, suvMin, suvMax }: {
  colormap: ViewportState['colormap']
  suvMin: number
  suvMax: number
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
      position: 'absolute', bottom: 10, left: 12,
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
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
