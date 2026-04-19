/** PET hot-metal colormap. t ∈ [0, 1] → [r, g, b] ∈ [0, 255] */
export function hotColormap(t: number): [number, number, number] {
  const c = Math.max(0, Math.min(1, t))
  const r = Math.min(1, c * 3)
  const g = Math.min(1, Math.max(0, c * 3 - 1))
  const b = Math.min(1, Math.max(0, c * 3 - 2))
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

export function renderSuvToImageData(
  suv: Float32Array,
  rows: number,
  cols: number,
  maxSuv: number,
): ImageData {
  const data = new Uint8ClampedArray(rows * cols * 4)
  for (let i = 0; i < rows * cols; i++) {
    const [r, g, b] = hotColormap(suv[i] / maxSuv)
    data[i * 4]     = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = 255
  }
  return new ImageData(data, cols, rows)
}
