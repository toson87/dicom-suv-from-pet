import { useCallback, useState } from 'react'
import type { ColormapName } from './colormaps'

export interface ViewportState {
  zoom: number
  panX: number
  panY: number
  // SUV display window
  suvCenter: number
  suvWidth: number
  // CT window (when overlay active)
  ctCenter: number
  ctWidth: number
  colormap: ColormapName
  petOpacity: number  // 0–1, used when CT overlay is active
}

export const DEFAULT_VIEWPORT: ViewportState = {
  zoom: 1,
  panX: 0,
  panY: 0,
  suvCenter: 5,
  suvWidth: 10,
  ctCenter: 40,
  ctWidth: 400,
  colormap: 'hot',
  petOpacity: 0.7,
}

export function useViewport() {
  const [vp, setVp] = useState<ViewportState>({ ...DEFAULT_VIEWPORT })

  const update = useCallback((patch: Partial<ViewportState>) =>
    setVp(prev => ({ ...prev, ...patch })), [])

  const resetTransform = useCallback(() =>
    setVp(prev => ({ ...prev, zoom: 1, panX: 0, panY: 0 })), [])

  const resetAll = useCallback(() =>
    setVp({ ...DEFAULT_VIEWPORT }), [])

  return { vp, update, resetTransform, resetAll }
}
