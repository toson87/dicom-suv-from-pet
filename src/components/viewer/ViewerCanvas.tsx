import { useCallback, useEffect, useRef } from 'react'
import type { PetSeries, SuvStats, SuvType } from '../../types'
import type { ViewportState } from '../../lib/imaging/viewport'
import { renderFrameToImageData } from '../../lib/imaging/render'

interface Props {
  series: PetSeries | null
  ctSeries: PetSeries | null        // matched CT series for overlay (null = off)
  currentFrame: number
  suvType: SuvType
  manualWeight?: number
  manualDose?: number
  vp: ViewportState
  onVpChange: (patch: Partial<ViewportState>) => void
  onStatsChange: (s: SuvStats | null) => void
}

export default function ViewerCanvas({
  series, ctSeries, currentFrame, suvType, manualWeight, manualDose,
  vp, onVpChange, onStatsChange,
}: Props) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null)
  const vpRef        = useRef(vp)
  const dragRef      = useRef<{ mode: 'pan' | 'wl' | 'ctWl'; startX: number; startY: number; startVp: ViewportState } | null>(null)

  useEffect(() => { vpRef.current = vp })

  // ── drawMain: composites offscreen → visible canvas with zoom/pan ──────────
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

  // ── Effect 1: regenerate offscreen when image content changes ──────────────
  useEffect(() => {
    if (!series || series.frames.length === 0) return
    const frame = series.frames[currentFrame]
    if (!frame) return

    const ctFrame = ctSeries
      ? ctSeries.frames[Math.round(currentFrame * ctSeries.frames.length / series.frames.length)]
      : undefined

    const { imageData, stats } = renderFrameToImageData(
      frame, series, suvType, vp, manualWeight, manualDose, ctFrame,
    )

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
      vp.petOpacity, ctSeries, drawMain])

  // ── Effect 2: redraw on pan/zoom only (cheap) ──────────────────────────────
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

  // ── Mouse interactions ─────────────────────────────────────────────────────
  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault()
    const isRight = e.button === 2 || e.ctrlKey
    const isCtWl  = isRight && e.altKey && !!ctSeries
    dragRef.current = {
      mode: isCtWl ? 'ctWl' : isRight ? 'wl' : 'pan',
      startX: e.clientX,
      startY: e.clientY,
      startVp: { ...vpRef.current },
    }
  }

  function handleMouseMove(e: React.MouseEvent) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY

    if (drag.mode === 'pan') {
      onVpChange({ panX: drag.startVp.panX + dx, panY: drag.startVp.panY + dy })
    } else if (drag.mode === 'wl') {
      // Horizontal = SUV width, vertical = SUV center
      const scale = Math.max(0.01, drag.startVp.suvWidth / 256)
      onVpChange({
        suvWidth:  Math.max(0.1, drag.startVp.suvWidth  + dx * scale),
        suvCenter: drag.startVp.suvCenter - dy * scale,
      })
    } else {
      // CT window: horizontal = width, vertical = center
      const scale = Math.max(1, drag.startVp.ctWidth / 256)
      onVpChange({
        ctWidth:  Math.max(1, drag.startVp.ctWidth  + dx * scale),
        ctCenter: drag.startVp.ctCenter - dy * scale,
      })
    }
  }

  function handleMouseUp() { dragRef.current = null }

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    onVpChange({ zoom: Math.max(0.05, Math.min(20, vpRef.current.zoom * factor)) })
  }

  function handleDoubleClick() {
    onVpChange({ zoom: 1, panX: 0, panY: 0 })
  }

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', flex: 1, background: '#0d1117', overflow: 'hidden', cursor: 'crosshair', minHeight: 0 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas ref={canvasRef} style={{ display: 'block' }} />

      {/* Interaction hint */}
      {series && (
        <div style={{ position: 'absolute', bottom: 8, left: 8, pointerEvents: 'none' }}>
          <div className="mono" style={{ fontSize: 11, color: '#484f58', lineHeight: 1.6 }}>
            <div>Drag — pan &nbsp;·&nbsp; Right-drag — SUV window</div>
            {ctSeries && <div>Alt+Right-drag — CT window &nbsp;·&nbsp; Scroll — zoom</div>}
            <div>Dbl-click — reset view</div>
          </div>
        </div>
      )}
    </div>
  )
}
