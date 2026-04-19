export type ColormapName = 'hot' | 'turbo' | 'viridis' | 'plasma' | 'rainbow' | 'grayscale'

export const COLORMAP_LABELS: Record<ColormapName, string> = {
  hot:       'Hot Metal',
  turbo:     'Turbo',
  viridis:   'Viridis',
  plasma:    'Plasma',
  rainbow:   'Rainbow',
  grayscale: 'Grayscale',
}

type Rgb = [number, number, number]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

function interpKeys(keys: [number, Rgb][], t: number): Rgb {
  t = Math.max(0, Math.min(1, t))
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, c0] = keys[i]
    const [t1, c1] = keys[i + 1]
    if (t >= t0 && t <= t1) {
      const a = (t - t0) / (t1 - t0)
      return [lerp(c0[0], c1[0], a), lerp(c0[1], c1[1], a), lerp(c0[2], c1[2], a)]
    }
  }
  return keys[keys.length - 1][1]
}

function buildLut(fn: (t: number) => Rgb): Uint8Array {
  const lut = new Uint8Array(256 * 3)
  for (let i = 0; i < 256; i++) {
    const [r, g, b] = fn(i / 255)
    lut[i * 3]     = Math.max(0, Math.min(255, Math.round(r)))
    lut[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(g)))
    lut[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(b)))
  }
  return lut
}

const VIRIDIS: [number, Rgb][] = [
  [0.000, [68,   1,  84]], [0.125, [70,  50, 127]], [0.250, [54,  92, 141]],
  [0.375, [39, 127, 142]], [0.500, [31, 161, 135]], [0.625, [74, 194, 120]],
  [0.750, [159, 217, 105]], [0.875, [234, 235,  79]], [1.000, [253, 231,  37]],
]

const PLASMA: [number, Rgb][] = [
  [0.000, [13,   8, 135]], [0.143, [84,   2, 163]], [0.286, [139,  10, 165]],
  [0.429, [185,  50, 137]], [0.571, [219,  92, 104]], [0.714, [244, 136,  73]],
  [0.857, [253, 188,  43]], [1.000, [240, 249,  33]],
]

const TURBO: [number, Rgb][] = [
  [0.00, [48,  18,  59]], [0.10, [86,  67, 176]], [0.20, [52, 133, 244]],
  [0.30, [35, 188, 210]], [0.40, [46, 230, 152]], [0.50, [131, 252,  86]],
  [0.60, [213, 243,  62]], [0.70, [253, 196,  53]], [0.80, [251, 139,  40]],
  [0.90, [237,  71,  28]], [1.00, [182,   8,  38]],
]

const RAINBOW: [number, Rgb][] = [
  [0.000, [0,   0, 255]], [0.167, [0, 255, 255]], [0.333, [0, 255,   0]],
  [0.500, [255, 255,  0]], [0.667, [255, 128,  0]], [0.833, [255,   0,  0]],
  [1.000, [128,   0,  0]],
]

export const LUTS: Record<ColormapName, Uint8Array> = {
  hot:       buildLut(t => [
               Math.min(1, t * 3) * 255,
               Math.min(1, Math.max(0, t * 3 - 1)) * 255,
               Math.min(1, Math.max(0, t * 3 - 2)) * 255,
             ]),
  viridis:   buildLut(t => interpKeys(VIRIDIS, t)),
  plasma:    buildLut(t => interpKeys(PLASMA, t)),
  turbo:     buildLut(t => interpKeys(TURBO, t)),
  rainbow:   buildLut(t => interpKeys(RAINBOW, t)),
  grayscale: buildLut(t => [t * 255, t * 255, t * 255]),
}
