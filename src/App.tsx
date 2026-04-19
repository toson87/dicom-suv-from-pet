import { useState } from 'react'
import type { PetSeries, SuvStats, SuvType } from './types'
import { parseFiles } from './lib/dicom/parseSeries'
import { useDropzone } from './hooks/useDropzone'
import { useViewport } from './lib/imaging/viewport'
import TopBar from './components/TopBar'
import DropZone from './components/DropZone'
import SeriesPanel from './components/SeriesPanel'
import ViewerPanel from './components/ViewerPanel'
import StatsPanel from './components/StatsPanel'

export default function App() {
  const [allSeries, setAllSeries]       = useState<PetSeries[]>([])
  const [selectedUID, setSelectedUID]   = useState<string | null>(null)
  const [selectedCtUID, setSelectedCtUID] = useState<string | null>(null)
  const [currentFrame, setCurrentFrame] = useState(0)
  const [suvType, setSuvType]           = useState<SuvType>('bw')
  const [manualWeight, setManualWeight] = useState<number | undefined>()
  const [manualDose, setManualDose]     = useState<number | undefined>()
  const [isProcessing, setIsProcessing] = useState(false)
  const [stats, setStats]               = useState<SuvStats | null>(null)

  const { vp, update: updateVp, resetTransform, resetAll } = useViewport()

  const petSeries = allSeries.filter(s => s.modality === 'PT' || s.modality === 'NM')
  const ctSeries  = allSeries.filter(s => s.modality === 'CT')
  const hasFiles  = petSeries.length > 0

  const selectedSeries = petSeries.find(s => s.seriesInstanceUID === selectedUID) ?? null

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const parsed = await parseFiles(files)
      if (parsed.length === 0) return
      setAllSeries(prev => {
        // Merge: keep existing, add new (allow loading CT after PET)
        const existingUIDs = new Set(prev.map(s => s.seriesInstanceUID))
        const incoming = parsed.filter(s => !existingUIDs.has(s.seriesInstanceUID))
        return [...prev, ...incoming]
      })
      const firstPet = parsed.find(s => s.modality === 'PT' || s.modality === 'NM')
      if (firstPet && !selectedUID) {
        setSelectedUID(firstPet.seriesInstanceUID)
        setCurrentFrame(0)
      }
      // Auto-select CT for overlay if exactly one CT loaded
      const firstCt = parsed.find(s => s.modality === 'CT')
      if (firstCt && !selectedCtUID) setSelectedCtUID(firstCt.seriesInstanceUID)
    } finally {
      setIsProcessing(false)
    }
  }

  const { isDragging, inputRef, handleInputChange, openFolderPicker } = useDropzone({ onFiles: handleFiles })

  const handleSeriesSelect = (uid: string) => {
    setSelectedUID(uid)
    setCurrentFrame(0)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar seriesCount={petSeries.length} frameCount={selectedSeries?.frames.length ?? 0} />

      {!hasFiles && !isProcessing && (
        <DropZone fullscreen isDragging={isDragging} inputRef={inputRef}
          onInputChange={handleInputChange} onBrowseClick={openFolderPicker} />
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
        <DropZone fullscreen isDragging inputRef={inputRef}
          onInputChange={handleInputChange} onBrowseClick={openFolderPicker} />
      )}

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '280px 1fr 380px',
        minHeight: 0,
        visibility: hasFiles ? 'visible' : 'hidden',
      }}>
        <SeriesPanel series={petSeries} selectedUID={selectedUID} onSelect={handleSeriesSelect} />

        <ViewerPanel
          series={selectedSeries}
          ctSeries={ctSeries}
          selectedCtUID={selectedCtUID}
          onSelectCt={setSelectedCtUID}
          currentFrame={currentFrame}
          onFrameChange={setCurrentFrame}
          suvType={suvType}
          manualWeight={manualWeight}
          manualDose={manualDose}
          vp={vp}
          onVpChange={updateVp}
          onReset={resetTransform}
          onStatsChange={setStats}
        />

        <StatsPanel
          series={selectedSeries}
          stats={stats}
          suvType={suvType}
          onSuvTypeChange={t => { setSuvType(t); resetAll() }}
          manualWeight={manualWeight}
          manualDose={manualDose}
          onManualWeightChange={setManualWeight}
          onManualDoseChange={setManualDose}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
