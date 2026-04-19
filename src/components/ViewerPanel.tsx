import { useEffect, useRef, useState } from 'react'
import type { PetSeries, SuvType } from '../types'
import { calcSuvForFrame, calcStats } from '../lib/suv/calculate'
import { renderSuvToImageData } from '../lib/suv/colormap'

interface Props {
  series: PetSeries | null
  currentFrame: number
  onFrameChange: (n: number) => void
  suvType: SuvType
  manualWeight?: number
  manualDose?: number
  onStatsChange?: (stats: { mean: number; max: number; min: number; voxelCount: number } | null) => void
  suvMax: number
  onSuvMaxChange: (v: number) => void
}

export default function ViewerPanel({
  series, currentFrame, onFrameChange,
  suvType, manualWeight, manualDose,
  onStatsChange, suvMax, onSuvMaxChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Render current frame to canvas whenever relevant state changes
  useEffect(() => {
    if (!series || series.frames.length === 0) return
    const frame = series.frames[currentFrame]
    if (!frame) return

    const suv = calcSuvForFrame(frame, series, suvType, manualWeight, manualDose)

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!suv) {
      // Render raw pixel grayscale if SUV can't be computed
      const { pixelData, rows, cols, rescaleSlope, rescaleIntercept } = frame
      const imageData = new ImageData(cols, rows)
      let rawMax = 0
      for (let i = 0; i < rows * cols; i++) {
        const v = pixelData[i] * rescaleSlope + rescaleIntercept
        if (v > rawMax) rawMax = v
      }
      for (let i = 0; i < rows * cols; i++) {
        const v = Math.max(0, pixelData[i] * rescaleSlope + rescaleIntercept)
        const g = rawMax > 0 ? Math.round((v / rawMax) * 255) : 0
        imageData.data[i * 4] = g
        imageData.data[i * 4 + 1] = g
        imageData.data[i * 4 + 2] = g
        imageData.data[i * 4 + 3] = 255
      }
      canvas.width = frame.cols
      canvas.height = frame.rows
      ctx.putImageData(imageData, 0, 0)
      onStatsChange?.(null)
      return
    }

    const stats = calcStats(suv)
    onStatsChange?.(stats)

    const displayMax = suvMax > 0 ? suvMax : Math.max(stats.max, 5)
    const imgData = renderSuvToImageData(suv, frame.rows, frame.cols, displayMax)
    canvas.width = frame.cols
    canvas.height = frame.rows
    ctx.putImageData(imgData, 0, 0)
  }, [series, currentFrame, suvType, manualWeight, manualDose, suvMax, onStatsChange])

  // Keep container size for CSS scaling
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setCanvasSize({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const frameCount = series?.frames.length ?? 0

  return (
    <div style={{
      background: '#0d1117', display: 'flex', flexDirection: 'column',
      minHeight: 0, position: 'relative',
    }}>
      {/* Canvas area */}
      <div ref={containerRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', minHeight: 0 }}>
        {series ? (
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: canvasSize.w,
              maxHeight: canvasSize.h,
              objectFit: 'contain',
              imageRendering: 'pixelated',
            }}
          />
        ) : (
          <div style={{ color: '#484f58', fontSize: 14 }}>Select a series</div>
        )}
      </div>

      {/* Controls bar */}
      {series && frameCount > 1 && (
        <div style={{
          borderTop: '1px solid #21262d', padding: '8px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#0d1117',
        }}>
          <button
            onClick={() => onFrameChange(Math.max(0, currentFrame - 1))}
            disabled={currentFrame === 0}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
              color: currentFrame === 0 ? '#484f58' : '#c9d1d9',
              padding: '4px 10px', cursor: currentFrame === 0 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >‹</button>

          <input
            type="range"
            min={0}
            max={frameCount - 1}
            value={currentFrame}
            onChange={e => onFrameChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#f0883e' }}
          />

          <button
            onClick={() => onFrameChange(Math.min(frameCount - 1, currentFrame + 1))}
            disabled={currentFrame === frameCount - 1}
            style={{
              background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
              color: currentFrame === frameCount - 1 ? '#484f58' : '#c9d1d9',
              padding: '4px 10px', cursor: currentFrame === frameCount - 1 ? 'not-allowed' : 'pointer',
              fontSize: 13,
            }}
          >›</button>

          <span className="mono" style={{ fontSize: 13, color: '#8b949e', minWidth: 60, textAlign: 'right' }}>
            {currentFrame + 1} / {frameCount}
          </span>
        </div>
      )}

      {/* SUV window control */}
      {series && (
        <div style={{
          position: 'absolute', bottom: frameCount > 1 ? 52 : 10, right: 12,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <span style={{ fontSize: 12, color: '#8b949e' }}>max SUV</span>
          <input
            type="number"
            min={1} max={50} step={0.5}
            value={suvMax}
            onChange={e => onSuvMaxChange(Number(e.target.value))}
            style={{
              width: 54, background: '#1c2128', border: '1px solid #30363d',
              borderRadius: 4, color: '#e6edf3', padding: '3px 6px',
              fontSize: 13, fontFamily: 'IBM Plex Mono, monospace',
            }}
          />
        </div>
      )}

      {/* Colormap scale bar */}
      {series && (
        <div style={{
          position: 'absolute', bottom: frameCount > 1 ? 56 : 14, left: 12,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <div style={{
            width: 12, height: 80,
            background: 'linear-gradient(to bottom, white, yellow, red, black)',
            borderRadius: 2, border: '1px solid #30363d',
          }}/>
          <div className="mono" style={{ fontSize: 10, color: '#8b949e', textAlign: 'center' }}>
            {suvMax}
          </div>
          <div className="mono" style={{ fontSize: 10, color: '#8b949e', textAlign: 'center', marginTop: 56 }}>
            0
          </div>
        </div>
      )}
    </div>
  )
}
