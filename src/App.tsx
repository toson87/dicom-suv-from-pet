import { useState } from 'react'
import type { PetSeries, SuvStats, SuvType } from './types'
import { parseFiles } from './lib/dicom/parseSeries'
import { exportSuvSeries } from './lib/dicom/exportSuv'
import { useDropzone } from './hooks/useDropzone'
import { useViewport } from './lib/imaging/viewport'
import TopBar from './components/TopBar'
import DropZone from './components/DropZone'
import SeriesPanel from './components/SeriesPanel'
import ViewerPanel from './components/ViewerPanel'
import StatsPanel from './components/StatsPanel'

function isPet(s: PetSeries) { return s.modality === 'PT' || s.modality === 'NM' }

export default function App() {
  const [allSeries, setAllSeries]         = useState<PetSeries[]>([])
  const [selectedUID, setSelectedUID]     = useState<string | null>(null)   // any modality
  const [petOverlayUID, setPetOverlayUID] = useState<string | null>(null)   // PET for CT overlay
  const [petOverlayEnabled, setPetOverlayEnabled] = useState(true)
  const [currentFrame, setCurrentFrame]   = useState(0)
  const [suvType, setSuvType]             = useState<SuvType>('bw')
  const [manualWeight, setManualWeight]   = useState<number | undefined>()
  const [manualDose, setManualDose]       = useState<number | undefined>()
  const [isProcessing, setIsProcessing]   = useState(false)
  const [stats, setStats]                 = useState<SuvStats | null>(null)
  const [exporting, setExporting]         = useState(false)
  const [exportError, setExportError]     = useState<string | null>(null)

  const { vp, update: updateVp, resetTransform, resetAll } = useViewport()

  const petSeries = allSeries.filter(isPet)
  const ctSeries  = allSeries.filter(s => s.modality === 'CT')
  const hasFiles  = allSeries.length > 0

  const selectedSeries = allSeries.find(s => s.seriesInstanceUID === selectedUID) ?? null
  const isPrimaryCt = selectedSeries?.modality === 'CT'

  // PET series used for SUV stats and export
  const petSeriesForStats = isPrimaryCt
    ? (petSeries.find(s => s.seriesInstanceUID === petOverlayUID) ?? petSeries[0] ?? null)
    : selectedSeries

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true)
    try {
      const parsed = await parseFiles(files)
      if (parsed.length === 0) return
      setAllSeries(prev => {
        const existingUIDs = new Set(prev.map(s => s.seriesInstanceUID))
        const incoming = parsed.filter(s => !existingUIDs.has(s.seriesInstanceUID))
        return [...prev, ...incoming]
      })
      // Auto-select first PET on initial load
      const firstPet = parsed.find(isPet)
      if (firstPet && !selectedUID) {
        setSelectedUID(firstPet.seriesInstanceUID)
        setCurrentFrame(0)
      }
      // Track first PET for CT overlay
      if (firstPet && !petOverlayUID) setPetOverlayUID(firstPet.seriesInstanceUID)
    } finally {
      setIsProcessing(false)
    }
  }

  const { isDragging, inputRef, handleInputChange, openFolderPicker } = useDropzone({ onFiles: handleFiles })

  const handleSeriesSelect = (uid: string) => {
    const s = allSeries.find(s => s.seriesInstanceUID === uid)
    if (!s) return
    setSelectedUID(uid)
    setCurrentFrame(0)
    // When switching to CT, ensure petOverlayUID is set
    if (s.modality === 'CT' && !petOverlayUID) {
      const first = allSeries.find(isPet)
      if (first) setPetOverlayUID(first.seriesInstanceUID)
    }
  }

  const handleExport = async () => {
    if (!petSeriesForStats) return
    setExporting(true)
    setExportError(null)
    try {
      const manualDoseBq = manualDose ? manualDose * 1e6 : undefined
      const blob = await exportSuvSeries(petSeriesForStats, suvType, manualWeight, manualDoseBq)
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = `${petSeriesForStats.seriesDescription ?? 'PET'}_SUV${suvType.toUpperCase()}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError((err as Error).message)
    } finally {
      setExporting(false)
    }
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
        <SeriesPanel
          series={petSeries}
          ctSeries={ctSeries}
          selectedUID={selectedUID}
          onSelect={handleSeriesSelect}
        />

        <ViewerPanel
          series={selectedSeries}
          petSeries={petSeries}
          overlayPetUID={petOverlayUID}
          onOverlayPetChange={setPetOverlayUID}
          petOverlayEnabled={petOverlayEnabled}
          onPetOverlayToggle={setPetOverlayEnabled}
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
          series={petSeriesForStats}
          stats={stats}
          suvType={suvType}
          onSuvTypeChange={t => { setSuvType(t); resetAll() }}
          manualWeight={manualWeight}
          manualDose={manualDose}
          onManualWeightChange={setManualWeight}
          onManualDoseChange={setManualDose}
          onExport={handleExport}
          exporting={exporting}
          exportError={exportError}
        />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
