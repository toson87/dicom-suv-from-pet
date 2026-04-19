import type { PetSeries, SuvStats, SuvType } from '../types'
import { formatDicomTime, formatSeconds, elapsedSeconds } from '../lib/dicom/timeUtils'
import { correctedDoseBq } from '../lib/suv/calculate'

interface Props {
  series: PetSeries | null
  stats: SuvStats | null
  suvType: SuvType
  onSuvTypeChange: (t: SuvType) => void
  manualWeight?: number
  manualDose?: number
  onManualWeightChange: (v: number | undefined) => void
  onManualDoseChange: (v: number | undefined) => void
  onExport: () => void
  exporting: boolean
  exportError: string | null
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #21262d' }}>
      <span style={{ fontSize: 13, color: '#8b949e' }}>{label}</span>
      <span className="mono" style={{ fontSize: 13, color: '#e6edf3' }}>{value}</span>
    </div>
  )
}

function Section({ title }: { title: string }) {
  return (
    <div style={{ fontSize: 11, color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 0 6px' }}>
      {title}
    </div>
  )
}

export default function StatsPanel({
  series, stats, suvType, onSuvTypeChange,
  manualWeight, manualDose, onManualWeightChange, onManualDoseChange,
  onExport, exporting, exportError,
}: Props) {
  const inputStyle: React.CSSProperties = {
    background: '#21262d', border: '1px solid #30363d', borderRadius: 4,
    color: '#e6edf3', padding: '4px 8px', fontSize: 13,
    fontFamily: 'IBM Plex Mono, monospace', width: '100%', boxSizing: 'border-box',
  }

  const dose = series ? correctedDoseBq(series, manualDose ? manualDose * 1e6 : undefined) : null

  const uptakeTime = (series?.radiopharmInfo && series?.acquisitionTime)
    ? elapsedSeconds(series.radiopharmInfo.injectionTime, series.acquisitionTime)
    : null

  return (
    <aside style={{
      background: '#161b22', borderLeft: '1px solid #30363d',
      display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
    }}>
      <div style={{
        padding: '10px 14px 8px',
        borderBottom: '1px solid #21262d',
        fontSize: 11, color: '#8b949e',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        SUV Analysis
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 14px 16px' }}>

        {/* SUV type selector */}
        <Section title="SUV Type" />
        <div style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
          {(['bw', 'bsa', 'lbm'] as SuvType[]).map(t => (
            <button
              key={t}
              onClick={() => onSuvTypeChange(t)}
              style={{
                flex: 1, padding: '5px 0', borderRadius: 4, fontSize: 13, cursor: 'pointer',
                background: suvType === t ? '#1f6feb' : '#21262d',
                color: suvType === t ? '#fff' : '#c9d1d9',
                border: `1px solid ${suvType === t ? '#1f6feb' : '#30363d'}`,
                fontFamily: 'IBM Plex Mono, monospace',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Stats */}
        <Section title="Statistics" />
        {stats ? (
          <>
            <Row label="Mean SUV" value={stats.mean.toFixed(3)} />
            <Row label="Max SUV"  value={stats.max.toFixed(3)} />
            <Row label="Min SUV"  value={stats.min.toFixed(3)} />
            <Row label="Voxels >0" value={stats.voxelCount.toLocaleString()} />
          </>
        ) : (
          <div style={{ fontSize: 13, color: '#484f58', padding: '8px 0' }}>
            {series ? 'Missing data — see warnings' : 'Load a series to see stats'}
          </div>
        )}

        {/* Patient */}
        {series && (
          <>
            <Section title="Patient" />
            <Row label="Name"   value={series.patientName ?? '—'} />
            <Row label="ID"     value={series.patientID ?? '—'} />
            <Row label="Sex"    value={series.patientSex ?? '—'} />
          </>
        )}

        {/* Radiopharm */}
        {series && (
          <>
            <Section title="Radiopharmaceutical" />
            <Row label="Agent" value={series.radiopharmInfo?.radiopharmaceutical ?? '—'} />
            <Row label="Injection time" value={formatDicomTime(series.radiopharmInfo?.injectionTime ?? '')} />
            <Row label="Injected dose"
              value={series.radiopharmInfo ? `${(series.radiopharmInfo.injectedDose / 1e6).toFixed(1)} MBq` : '—'} />
            <Row label="Decay t½"
              value={series.radiopharmInfo ? `${(series.radiopharmInfo.halfLife / 60).toFixed(0)} min` : '—'} />
            <Row label="Uptake time"
              value={uptakeTime !== null ? formatSeconds(uptakeTime) : '—'} />
            <Row label="Corrected dose"
              value={dose ? `${(dose / 1e6).toFixed(1)} MBq` : '—'} />
            <Row label="Decay corrected" value={series.decayCorrected ? 'Yes' : 'No'} />
            <Row label="Units" value={series.units ?? '—'} />
          </>
        )}

        {/* Manual overrides */}
        {series && (
          <>
            <Section title="Manual Overrides" />
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 4 }}>
                Weight (kg) {series.patientWeight ? `— tag: ${series.patientWeight}` : '— missing'}
              </div>
              <input
                type="number" min={1} max={300} step={0.1}
                placeholder={series.patientWeight?.toString() ?? 'enter kg'}
                value={manualWeight ?? ''}
                onChange={e => onManualWeightChange(e.target.value ? Number(e.target.value) : undefined)}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#8b949e', marginBottom: 4 }}>
                Injected dose (MBq) {series.radiopharmInfo ? `— tag: ${(series.radiopharmInfo.injectedDose / 1e6).toFixed(1)}` : '— missing'}
              </div>
              <input
                type="number" min={1} max={10000} step={1}
                placeholder={series.radiopharmInfo ? (series.radiopharmInfo.injectedDose / 1e6).toFixed(1) : 'enter MBq'}
                value={manualDose ?? ''}
                onChange={e => onManualDoseChange(e.target.value ? Number(e.target.value) : undefined)}
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* Warnings */}
        {series && series.warnings.length > 0 && (
          <>
            <Section title="Warnings" />
            {series.warnings.map((w, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '6px 8px', marginBottom: 6,
                background: '#3d240f', border: '1px solid #f0883e', borderRadius: 6,
              }}>
                <svg width="14" height="14" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M6 1L11 10H1L6 1Z" stroke="#f0883e" strokeWidth="1.2" fill="none"/>
                  <line x1="6" y1="5" x2="6" y2="7.5" stroke="#f0883e" strokeWidth="1.2"/>
                  <circle cx="6" cy="9" r="0.6" fill="#f0883e"/>
                </svg>
                <span style={{ fontSize: 12, color: '#ffb484', lineHeight: 1.4 }}>{w}</span>
              </div>
            ))}
          </>
        )}
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid #21262d', flexShrink: 0 }}>
        <button
          onClick={onExport}
          disabled={!series || exporting}
          style={{
            width: '100%', padding: '7px 0', borderRadius: 4, fontSize: 13, border: 'none',
            cursor: series && !exporting ? 'pointer' : 'not-allowed',
            background: series && !exporting ? '#238636' : '#21262d',
            color: series && !exporting ? '#fff' : '#484f58',
          }}
        >
          {exporting ? 'Exporting…' : 'Export SUV DICOM'}
        </button>
        {exportError && (
          <div style={{ fontSize: 11, color: '#ff8a80', marginTop: 4 }}>{exportError}</div>
        )}
      </div>
    </aside>
  )
}
