import { useState } from 'react'
import type { PetSeries, SuvStats, SuvType } from './types'
import { parseFiles } from './lib/dicom/parseSeries'
import TopBar from './components/TopBar'
import DropZone from './components/DropZone'
import SeriesPanel from './components/SeriesPanel'
import ViewerPanel from './components/ViewerPanel'
import StatsPanel from './components/StatsPanel'

export default function App() {
  const [series, setSeries]           = useState<PetSeries[]>([])
  const [selectedUID, setSelectedUID] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [suvType, setSuvType]         = useState<SuvType>('bw')
  const [manualWeight, setManualWeight] = useState<number | undefined>()
  const [manualDose, setManualDose]   = useState<number | undefined>()
  const [isDragging, setIsDragging]   = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats]             = useState<SuvStats | null>(null)
  const [suvMax, setSuvMax]           = useState(10)

  const selectedSeries = series.find(s => s.seriesInstanceUID === selectedUID) ?? null
  const hasFiles = series.length > 0

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const parsed = await parseFiles(files)
      if (parsed.length === 0) return
      setSeries(parsed)
      setSelectedUID(parsed[0].seriesInstanceUID)
      setCurrentFrame(0)
      setManualWeight(undefined)
      setManualDose(undefined)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSeriesSelect = (uid: string) => {
    setSelectedUID(uid)
    setCurrentFrame(0)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar
        seriesCount={series.length}
        frameCount={selectedSeries?.frames.length ?? 0}
      />

      {!hasFiles && !isProcessing && (
        <DropZone
          fullscreen
          isDragging={isDragging}
          onFiles={handleFiles}
          onDragChange={setIsDragging}
        />
      )}

      {isProcessing && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(13,17,23,0.97)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 16,
        }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
            <circle cx="16" cy="16" r="12" stroke="#30363d" strokeWidth="3"/>
            <path d="M16 4a12 12 0 0 1 12 12" stroke="#f0883e" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <div style={{ color: '#8b949e', fontSize: 14 }}>Parsing DICOM files…</div>
        </div>
      )}

      {hasFiles && isDragging && (
        <DropZone
          fullscreen
          isDragging
          onFiles={handleFiles}
          onDragChange={setIsDragging}
        />
      )}

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '280px 1fr 380px',
        minHeight: 0,
        visibility: hasFiles ? 'visible' : 'hidden',
      }}>
        <SeriesPanel
          series={series}
          selectedUID={selectedUID}
          onSelect={handleSeriesSelect}
        />
        <ViewerPanel
          series={selectedSeries}
          currentFrame={currentFrame}
          onFrameChange={setCurrentFrame}
          suvType={suvType}
          manualWeight={manualWeight}
          manualDose={manualDose ? manualDose * 1e6 : undefined}
          onStatsChange={setStats}
          suvMax={suvMax}
          onSuvMaxChange={setSuvMax}
        />
        <StatsPanel
          series={selectedSeries}
          stats={stats}
          suvType={suvType}
          onSuvTypeChange={setSuvType}
          manualWeight={manualWeight}
          manualDose={manualDose}
          onManualWeightChange={setManualWeight}
          onManualDoseChange={setManualDose}
        />
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
