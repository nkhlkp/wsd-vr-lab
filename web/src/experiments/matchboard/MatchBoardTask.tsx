import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { formatTime } from '../analysis'
import type { TaskProps } from '../types'

// Sloped board with a 5 × 6 grid of holes (30 matches per trial, as in the lab report)
// and a trough of matchsticks in front. Units are metres.
const COLS = 6
const ROWS = 5
const HOLE_COUNT = COLS * ROWS
const SPACING_X = 0.05
const SPACING_Y = 0.04
const BOARD = { w: 0.34, h: 0.24, d: 0.02 }
const TILT = -0.8 // radians about x: top edge leans away from the subject
const BOARD_POS: [number, number, number] = [0, 0.1, 0]
const TRAY_POS: [number, number, number] = [0, 0.012, 0.16]
const STICK_LEN = 0.045
const STICK_R = 0.0016
const HEAD_R = 0.0028
const WOOD = '#e2c48d'
const HEAD = '#b3261e'

const HOLES = Array.from({ length: HOLE_COUNT }, (_, i) => {
  const c = i % COLS
  const r = Math.floor(i / COLS)
  return new THREE.Vector3((c - (COLS - 1) / 2) * SPACING_X, ((ROWS - 1) / 2 - r) * SPACING_Y, BOARD.d / 2)
})

interface Hud {
  started: boolean
  elapsed: number
  placed: number
  holding: boolean
  hint: string | null
}

const INITIAL_HUD: Hud = { started: false, elapsed: 0, placed: 0, holding: false, hint: null }

export default function MatchBoardTask({ trialNo, onComplete }: TaskProps) {
  const [hud, setHud] = useState<Hud>(INITIAL_HUD)
  const done = useRef(onComplete)
  done.current = onComplete

  return (
    <div className="task-stage">
      <Canvas
        camera={{ position: [0, 0.42, 0.42], fov: 42, near: 0.01, far: 5 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.07, 0.03)}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#2a2d33']} />
        <hemisphereLight args={['#ffffff', '#5a5246', 1.5]} />
        <directionalLight position={[0.2, 0.8, 0.5]} intensity={1.6} />
        <Board key={trialNo} onHud={setHud} onDone={(seconds) => done.current({ value: seconds, faulty: false })} />
      </Canvas>
      <div className="task-hud">
        <span className="hud-time">{formatTime(hud.elapsed)}</span>
        <span>Inserted {hud.placed} / {HOLE_COUNT}</span>
        <span>{hud.holding ? 'Holding a match' : 'Hand empty'}</span>
      </div>
      {(!hud.started || hud.hint) && (
        <div className="task-banner top">
          {hud.hint ?? <>Trial {trialNo}: click the <strong>tray</strong> to pick a match, then click an empty <strong>hole</strong>. The clock starts with the first pick.</>}
        </div>
      )}
    </div>
  )
}

interface BoardProps {
  onHud: (hud: Hud) => void
  onDone: (seconds: number) => void
}

function Board({ onHud, onDone }: BoardProps) {
  const [filled, setFilled] = useState<boolean[]>(() => Array(HOLE_COUNT).fill(false))
  const [holding, setHolding] = useState(false)
  const [hover, setHover] = useState<number | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const t0 = useRef<number | null>(null)
  const finished = useRef(false)
  const hudTimer = useRef(0)
  const placed = filled.filter(Boolean).length

  const report = (elapsed: number) =>
    onHud({ started: t0.current !== null, elapsed, placed, holding, hint })

  // Push discrete changes (pick, place, hints) immediately; the clock updates in useFrame.
  useEffect(() => {
    report(t0.current === null ? 0 : (performance.now() - t0.current) / 1000)
  }, [placed, holding, hint])

  useFrame((_, dt) => {
    if (t0.current === null || finished.current) return
    hudTimer.current -= dt
    if (hudTimer.current > 0) return
    hudTimer.current = 0.1
    report((performance.now() - t0.current) / 1000)
  })

  useEffect(() => () => { document.body.style.cursor = '' }, [])

  const pick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (finished.current || holding) return
    t0.current ??= performance.now()
    setHolding(true)
    setHint(null)
  }

  const place = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (finished.current || filled[i]) return
    if (!holding) {
      setHint('Pick a match from the tray first.')
      return
    }
    const next = filled.map((f, j) => f || j === i)
    setFilled(next)
    setHolding(false)
    if (next.every(Boolean)) {
      finished.current = true
      const seconds = (performance.now() - t0.current!) / 1000
      report(seconds)
      onDone(seconds)
    }
  }

  const pointer = (on: boolean) => () => { document.body.style.cursor = on ? 'pointer' : '' }

  // Matches still lying in the tray (one is in the hand while holding).
  const inTray = HOLE_COUNT - placed - (holding ? 1 : 0)
  const trayMatches = useMemo(
    () => Array.from({ length: HOLE_COUNT }, (_, i) => ({
      x: (i - (HOLE_COUNT - 1) / 2) * 0.0085,
      z: (Math.random() - 0.5) * 0.008,
      rot: (Math.random() - 0.5) * 0.12,
    })),
    [],
  )

  return (
    <group>
      {/* Table top */}
      <mesh position={[0, -0.003, 0.05]}>
        <boxGeometry args={[0.6, 0.006, 0.45]} />
        <meshStandardMaterial color="#d8cfb8" />
      </mesh>

      {/* Sloped board with holes */}
      <group position={BOARD_POS} rotation={[TILT, 0, 0]}>
        <mesh>
          <boxGeometry args={[BOARD.w, BOARD.h, BOARD.d]} />
          <meshStandardMaterial color="#b98a55" roughness={0.8} />
        </mesh>
        {HOLES.map((p, i) => (
          <group key={i} position={p}>
            <mesh position={[0, 0, 0.0005]}>
              <circleGeometry args={[0.0045, 20]} />
              <meshBasicMaterial color={hover === i && holding && !filled[i] ? '#f2b84b' : '#2b1d10'} />
            </mesh>
            {/* Larger invisible target so holes are easy to click */}
            <mesh
              position={[0, 0, 0.001]}
              onClick={place(i)}
              onPointerOver={(e) => { e.stopPropagation(); setHover(i); pointer(true)() }}
              onPointerOut={() => { setHover((h) => (h === i ? null : h)); pointer(false)() }}
            >
              <circleGeometry args={[0.016, 16]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>
            {filled[i] && <Match standing />}
            {!filled[i] && holding && hover === i && <Match standing ghost />}
          </group>
        ))}
      </group>

      {/* Support behind the board */}
      <mesh position={[0, 0.05, -0.085]}>
        <boxGeometry args={[BOARD.w, 0.1, 0.02]} />
        <meshStandardMaterial color="#9c7446" />
      </mesh>

      {/* Tray (trough) of matches */}
      <group position={TRAY_POS}>
        <mesh onClick={pick} onPointerOver={pointer(true)} onPointerOut={pointer(false)}>
          <boxGeometry args={[0.3, 0.012, 0.05]} />
          <meshStandardMaterial color={holding ? '#6b5a44' : '#7d6a50'} />
        </mesh>
        {trayMatches.slice(0, inTray).map((m, i) => (
          // Lying flat, pointing at the board, side by side across the trough.
          <group key={i} position={[m.x, 0.008, m.z]} rotation={[-Math.PI / 2, 0, m.rot]}>
            <Match />
          </group>
        ))}
      </group>
    </group>
  )
}

/** A matchstick along local +y. Standing = pushed a quarter of its length into a board hole. */
function Match({ standing = false, ghost = false }: { standing?: boolean; ghost?: boolean }) {
  const opacity = ghost ? 0.5 : 1
  const centre = standing ? STICK_LEN / 4 : 0
  return (
    <group rotation={standing ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
      <mesh position={[0, centre, 0]}>
        <cylinderGeometry args={[STICK_R, STICK_R, STICK_LEN, 8]} />
        <meshStandardMaterial color={WOOD} transparent={ghost} opacity={opacity} />
      </mesh>
      <mesh position={[0, centre + STICK_LEN / 2, 0]}>
        <sphereGeometry args={[HEAD_R, 12, 10]} />
        <meshStandardMaterial color={HEAD} transparent={ghost} opacity={opacity} />
      </mesh>
    </group>
  )
}
