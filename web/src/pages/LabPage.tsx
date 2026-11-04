import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@react-three/drei'
import LabScene from '../lab/LabScene'
import type { PlayerHandle } from '../lab/Player'
import { getExperiment, type ExperimentId } from '../lab/experiments'
import { getExperimentConfig } from '../experiments/registry'
import ExperimentRunner from '../experiments/ExperimentRunner'
import EyeFatigueStation from '../experiments/EyeFatigueStation'
import RecordsPanel from '../experiments/RecordsPanel'

/** The walkable lab. `demo` = no login (the default until accounts are set up). */
export default function LabPage({ demo = false }: { demo?: boolean }) {
  const playerRef = useRef<PlayerHandle | null>(null)
  // ?hud=0 hides the start overlay (for screenshots).
  const hideOverlay = new URLSearchParams(window.location.search).get('hud') === '0'
  const [locked, setLocked] = useState(false)
  const [nearId, setNearId] = useState<ExperimentId | null>(null)
  const [openId, setOpenId] = useState<ExperimentId | null>(null)
  const [showRecords, setShowRecords] = useState(false)

  const openStation = useCallback((id: ExperimentId) => {
    setOpenId(id)
    playerRef.current?.unlock()
  }, [])

  // Dev-only handle for automated tests (headless browsers can't grant pointer lock).
  useEffect(() => {
    if (import.meta.env.DEV) (window as unknown as { __openStation: typeof openStation }).__openStation = openStation
  }, [openStation])

  const backToLab = useCallback(() => {
    setOpenId(null)
    setShowRecords(false)
    playerRef.current?.lock()
  }, [])

  // E or a click opens the station the player is standing at.
  useEffect(() => {
    if (!locked || !nearId) return
    const onKey = (e: KeyboardEvent) => { if (e.code === 'KeyE') openStation(nearId) }
    const onClick = (e: MouseEvent) => { if (e.button === 0) openStation(nearId) }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [locked, nearId, openStation])

  const open = getExperiment(openId)
  const config = getExperimentConfig(openId)
  const near = getExperiment(nearId)
  const panelOpen = Boolean(open) || showRecords

  return (
    <div className="lab-root">
      {/* Pause the room while an experiment or records panel covers it. */}
      <Canvas camera={{ fov: 70, near: 0.05, far: 60 }} dpr={[1, 2]} frameloop={panelOpen ? 'never' : 'always'}>
        <Suspense fallback={null}>
          <LabScene nearId={nearId} playerRef={playerRef} onLockChange={setLocked} onNearStation={setNearId} />
        </Suspense>
      </Canvas>
      <Loader />

      {locked && <div className="crosshair" />}
      {locked && near && (
        <div className="hud-prompt">
          <kbd>E</kbd> Open <strong>{near.title}</strong>
        </div>
      )}

      {!locked && !panelOpen && !hideOverlay && (
        <div className="lab-overlay">
          <div className="card">
            <h2>WSD Virtual Lab{demo && <span className="tag">Demo</span>}</h2>
            <p className="muted small">Work System Design &amp; Virtual Reality Lab</p>
            <ul className="controls">
              <li><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move · <kbd>Shift</kbd> Run</li>
              <li><kbd>Mouse</kbd> Look around</li>
              <li><kbd>E</kbd> / click Open a glowing station</li>
              <li><kbd>Esc</kbd> Pause</li>
            </ul>
            <button className="btn" onClick={() => playerRef.current?.lock()}>Click to enter the lab</button>
            <button className="btn secondary" onClick={() => setShowRecords(true)}>My Records</button>
            {!demo && <Link className="btn link" to="/">Leave lab</Link>}
          </div>
        </div>
      )}

      {open && config && (
        <ExperimentRunner
          key={open.id}
          config={config}
          onExit={backToLab}
          onShowRecords={() => { setOpenId(null); setShowRecords(true) }}
        />
      )}

      {open?.id === 'eye-fatigue' && (
        <EyeFatigueStation
          onExit={backToLab}
          onShowRecords={() => { setOpenId(null); setShowRecords(true) }}
        />
      )}

      {open && !config && open.id !== 'eye-fatigue' && (
        <div className="lab-overlay">
          <div className="card wide station-panel">
            <h2>{open.title}</h2>
            <p>{open.summary}</p>
            <p className="muted">This experiment is not available yet.</p>
            <button className="btn" onClick={backToLab}>Back to lab</button>
          </div>
        </div>
      )}

      {showRecords && <RecordsPanel onClose={backToLab} />}
    </div>
  )
}
