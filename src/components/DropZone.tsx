import { useRef, type DragEvent } from 'react'

interface Props {
  fullscreen?: boolean
  isDragging: boolean
  onFiles: (files: File[]) => void
  onDragChange: (v: boolean) => void
}

export default function DropZone({ fullscreen, isDragging, onFiles, onDragChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const collect = (e: DragEvent) => {
    const files: File[] = []
    if (e.dataTransfer.items) {
      for (const item of Array.from(e.dataTransfer.items)) {
        if (item.kind === 'file') {
          const f = item.getAsFile()
          if (f) files.push(f)
        }
      }
    } else {
      files.push(...Array.from(e.dataTransfer.files))
    }
    return files
  }

  const containerStyle: React.CSSProperties = fullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,17,23,0.97)' }
    : { flex: 1 }

  return (
    <div
      style={{
        ...containerStyle,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}
      onDragOver={e => { e.preventDefault(); onDragChange(true) }}
      onDragLeave={() => onDragChange(false)}
      onDrop={e => { e.preventDefault(); onDragChange(false); onFiles(collect(e)) }}
    >
      <div style={{
        border: `2px dashed ${isDragging ? '#388bfd' : '#30363d'}`,
        borderRadius: 12, padding: '48px 64px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        background: isDragging ? 'rgba(31,111,235,0.06)' : '#0d1117',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
      }}
        onClick={() => inputRef.current?.click()}
      >
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="4" y="4" width="32" height="32" rx="8" stroke="#30363d" strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="7" stroke="#f0883e" strokeWidth="1.5"/>
          <circle cx="20" cy="20" r="2.5" fill="#f0883e"/>
          <line x1="20" y1="4" x2="20" y2="13" stroke="#30363d" strokeWidth="1.5"/>
          <line x1="20" y1="27" x2="20" y2="36" stroke="#30363d" strokeWidth="1.5"/>
          <line x1="4" y1="20" x2="13" y2="20" stroke="#30363d" strokeWidth="1.5"/>
          <line x1="27" y1="20" x2="36" y2="20" stroke="#30363d" strokeWidth="1.5"/>
        </svg>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 500, marginBottom: 8 }}>
            Drop PET DICOM files
          </div>
          <div style={{ fontSize: 14, color: '#8b949e' }}>
            or click to browse — folder or individual .dcm files
          </div>
        </div>

        <div className="mono" style={{
          marginTop: 4, padding: '10px 14px',
          background: '#0b3d20', border: '1px solid #238636',
          borderRadius: 6, color: '#7ee787',
          fontSize: 13, letterSpacing: '0.02em',
        }}>
          100% CLIENT-SIDE &nbsp;·&nbsp; FILES NEVER LEAVE YOUR BROWSER
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={e => {
          if (e.target.files) onFiles(Array.from(e.target.files))
          e.target.value = ''
        }}
      />
    </div>
  )
}
