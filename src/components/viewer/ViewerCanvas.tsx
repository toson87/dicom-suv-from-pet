import { useCallback, useEffect, useRef } from 'react'
import type { PetSeries, SuvStats, SuvType } from '../../types'
import type { ViewportState } from '../../lib/imaging/viewport'
import { renderFrameToImageData, renderCtFrameToImageData } from '../../lib/imaging/render'

interface Props {
  series: PetSeries | null
  overlayPetSeries: PetSeries | null
  currentFrame: number
  onFrameChange: (n: number) => void
  suvType: SuvType
  manualWeight?: number
  manualDose?: number
  vp: ViewportState
  onVpChange: (patch: Partial<ViewportState>) => void
  onStatsChange: (s: SuvStats | null) => void
}

export default function ViewerCanvas({
  series, overlayPetSeries, currentFrame, onFrameChange,
  suvType, manualWeight, manualDose,
  vp, onVpChange, onStatsChange,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const hoverRef     = useRef<HTMLDivElement>(null)
  const vpRef        = useRef(vp)
  const frameRef     = useRef(currentFrame)
  const seriesRef    = useRef(series)
  const suvArrayRef  = useRef<Float32Array | null>(null)
  const dragRef      = useRef<{ mode: 'pan' | 'wl' | 'ctWl' | 'zoom'; startX: number; startY: number; startVp: ViewportState } | null>(null)

  useEffect(() => { vpRef.current = vp })
  useEffect(() => { frameRef.current = currentFrame }, [currentFrame])
  useEffect(() => { seriesRef.current = series }, [series])

  const isPrimaryCt = series?.modality === 'CT'

  // ── drawMain ──────────────────────────────────────────────────────────────
  const drawMain = useCallback(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    const off = offscreenRef.current
    if (!canvas || !container || !off || off.width === 0) return

    const dpr  = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    canvas.width  = rect.width  * dpr
    canvas.height = rect.height * dpr
    canvas.style.width  = `${rect.width}px`
    canvas.style.height = `${rect.height}px`

    const ctx = canvas.getContext('2d')!
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.fillStyle = '#0d1117'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const { zoom, panX, panY } = vpRef.current
    const baseScale = Math.min(rect.width / off.width, rect.height / off.height) * 0.95
    const scale = baseScale * zoom * dpr
    const cx = canvas.width  / 2 + panX * dpr
    const cy = canvas.height / 2 + panY * dpr

    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(off, -off.width / 2, -off.height / 2)
  }, [])

  // ── Effect 1: regenerate offscreen ────────────────────────────────────────
  useEffect(() => {
    if (!series || series.frames.length === 0) return
    const frame = series.frames[currentFrame]
    if (!frame) return

    let imageData: ImageData
    let stats: SuvStats | null
    let suvArray: Float32Array | null

    if (series.modality === 'CT') {
      const petFrame = overlayPetSeries
        ? overlayPetSeries.frames[Math.round(currentFrame * overlayPetSeries.frames.length / series.frames.length)]
        : undefined
      ;({ imageData, stats, suvArray } = renderCtFrameToImageData(
        frame, vp, petFrame, overlayPetSeries ?? undefined,
        suvType, manualWeight, manualDose,
      ))
    } else {
      ;({ imageData, stats, suvArray } = renderFrameToImageData(
        frame, series, suvType, vp, manualWeight, manualDose,
      ))
    }

    suvArrayRef.current = suvArray

    if (!offscreenRef.current) offscreenRef.current = document.createElement('canvas')
    const off = offscreenRef.current
    off.width  = frame.cols
    off.height = frame.rows
    off.getContext('2d')!.putImageData(imageData, 0, 0)

    onStatsChange(stats)
    drawMain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, currentFrame, suvType, manualWeight, manualDose,
      vp.colormap, vp.suvCenter, vp.suvWidth, vp.ctCenter, vp.ctWidth,
      vp.petOpacity, overlayPetSeries, drawMain])

  // ── Effect 2: pan/zoom redraw ──────────────────────────────────────────────
  useEffect(() => {
    drawMain()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vp.zoom, vp.panX, vp.panY, drawMain])

  // ── Resize observer ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => drawMain())
    ro.observe(el)
    return () => ro.disconnect()
  }, [drawMain])

  // ── Pixel value lookup (imperative — no React state) ──────────────────────
  function getPixelInfo(clientX: number, clientY: number): string | null {
    const canvas = canvasRef.current
    const container = containerRef.current
    const off = offscreenRef.current
    const s = seriesRef.current
    if (!canvas || !container || !off || !s) return null

    const frame = s.frames[frameRef.current]
    if (!frame) return null

    const dpr = window.devicePixelRatio || 1
    const rect = container.getBoundingClientRect()
    const { zoom, panX, panY } = vpRef.current
    const baseScale = Math.min(rect.width / off.width, rect.height / off.height) * 0.95
    const scale = baseScale * zoom * dpr
    const cx = canvas.width / 2 + panX * dpr
    const cy = canvas.height / 2 + panY * dpr

    const ix = Math.round((clientX - rect.left) * dpr - cx) / scale + off.width  / 2
    const iy = Math.round((clientY - rect.top)  * dpr - cy) / scale + off.height / 2
    const x = Math.floor(ix), y = Math.floor(iy)

    if (x < 0 || x >= frame.cols || y < 0 || y >= frame.rows) return null
    const idx = y * frame.cols + x
    const parts: string[] = []

    if (s.modality === 'CT') {
      const hu = frame.pixelData[idx] * frame.rescaleSlope + frame.rescaleIntercept
      parts.push(`HU ${Math.round(hu)}`)
      const suv = suvArrayRef.current
      if (suv && idx < suv.length && suv[idx] > 0) parts.push(`SUV ${suv[idx].toFixed(2)}`)
    } else {
      const suv = suvArrayRef.current
      if (suv && idx < suv.length) {
        parts.push(`SUV ${suv[idx].toFixed(2)}`)
      } else {
        const bqMl = frame.pixelData[idx] * frame.rescaleSlope + frame.rescaleIntercept
        parts.push(`${Math.round(bqMl)} Bq/mL`)
      }
    }

    return parts.join('  ·  ')
  }

  // ── Mouse interactions ─────────────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    if (e.button === 1) {
      dragRef.current = { mode: 'zoom', startX: e.clientX, startY: e.clientY, startVp: { ...vpRef.current } }
      return
    }
    const isRight = e.button === 2 || e.ctrlKey
    let mode: 'pan' | 'wl' | 'ctWl'
    if (!isRight) {
      mode = 'pan'
    } else if (isPrimaryCt) {
      mode = e.altKey ? 'wl' : 'ctWl'
    } else {
      mode = 'wl'
    }
    dragRef.current = { mode, startX: e.clientX, startY: e.clientY, startVp: { ...vpRef.current } }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const drag = dragRef.current
    if (drag) {
      const dx = e.clientX - drag.startX
      const dy = e.clientY - drag.startY
      if (drag.mode === 'zoom') {
        const dy2 = drag.startY - e.clientY
        const factor = Math.pow(1.01, dy2)
        onVpChange({ zoom: Math.max(0.05, Math.min(20, drag.startVp.zoom * factor)) })
      } else if (drag.mode === 'pan') {
        onVpChange({ panX: drag.startVp.panX + dx, panY: drag.startVp.panY + dy })
      } else if (drag.mode === 'wl') {
        const scale = Math.max(0.01, drag.startVp.suvWidth / 256)
        onVpChange({
          suvWidth:  Math.max(0.1, drag.startVp.suvWidth  + dx * scale),
          suvCenter: drag.startVp.suvCenter - dy * scale,
        })
      } else {
        const scale = Math.max(1, drag.startVp.ctWidth / 256)
        onVpChange({
          ctWidth:  Math.max(1, drag.startVp.ctWidth  + dx * scale),
          ctCenter: drag.startVp.ctCenter - dy * scale,
        })
      }
    }

    // Pixel value HUD — imperatively update DOM to avoid 60fps re-renders
    const overlay = hoverRef.current
    const container = containerRef.current
    if (!overlay || !container) return
    const info = getPixelInfo(e.clientX, e.clientY)
    if (info) {
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      overlay.textContent = info
      overlay.style.display = 'block'
      const flipLeft = x + 14 + 160 > rect.width
      overlay.style.left = flipLeft ? `${Math.max(4, x - 14 - overlay.offsetWidth)}px` : `${x + 14}px`
      overlay.style.top  = `${Math.max(4, y - 20)}px`
    } else {
      overlay.style.display = 'none'
    }
  }

  function handleMouseLeave() {
    dragRef.current = null
    if (hoverRef.current) hoverRef.current.style.display = 'none'
  }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const frameCount = series?.frames.length ?? 0
    if (frameCount > 1) {
      const delta = e.deltaY > 0 ? 1 : -1
      const next = Math.max(0, Math.min(frameCount - 1, frameRef.current + delta))
      if (next !== frameRef.current) onFrameChange(next)
    }
  }

  function handleDoubleClick() {
    onVpChange({ zoom: 1, panX: 0, panY: 0 })
  }

  const hasOverlay = isPrimaryCt && !!overlayPetSeries

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', flex: 1, background: '#0d1117', overflow: 'hidden', cursor: 'crosshair', minHeight: 0 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => { dragRef.current = null }}
      onMouseLeave={handleMouseLeave}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Pixel value HUD — imperatively updated */}
      <div ref={hoverRef} style={{
        position: 'absolute', pointerEvents: 'none', display: 'none',
        background: 'rgba(0,0,0,0.72)', border: '1px solid #30363d',
        borderRadius: 4, padding: '3px 8px',
        color: '#e6edf3', fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 12, whiteSpace: 'nowrap',
      }} />

      {/* Interaction hints */}
      {series && (
        <div style={{ position: 'absolute', bottom: 8, right: 8, pointerEvents: 'none', textAlign: 'right' }}>
          <div className="mono" style={{ fontSize: 11, color: '#484f58', lineHeight: 1.6 }}>
            {isPrimaryCt ? (
              <>
                <div>Drag — pan &nbsp;·&nbsp; Right-drag — CT window &nbsp;·&nbsp; Middle-drag — zoom</div>
                {hasOverlay && <div>Alt+Right-drag — PET window</div>}
              </>
            ) : (
              <div>Drag — pan &nbsp;·&nbsp; Right-drag — SUV window &nbsp;·&nbsp; Middle-drag — zoom</div>
            )}
            {series.frames.length > 1
              ? <div>Scroll — slices &nbsp;·&nbsp; Dbl-click — reset view</div>
              : <div>Dbl-click — reset view</div>
            }
          </div>
        </div>
      )}
    </div>
  )
}
