import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { formatTime } from '../analysis'
import { buzzerOff, buzzerOn, useHeldKeys } from '../input'
import type { TaskProps, TrialResult } from '../types'
import { HALF_WIDTH, LOOP_LENGTH, nearestOnTrack, PLATE, START, TRACK } from './track'

const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'] as const
const MAX_SPEED = 40 // mm/s at full crank speed
const ACCEL = 160 // mm/s² while a crank key is held
const CRANK_RAD_PER_MM = 0.12
const PLATE_TOP = 0.06 // m, height of the plate surface
const MM = 0.001

interface Hud {
  started: boolean
  elapsed: number
  touches: number
  progress: number
  contact: boolean
}

const INITIAL_HUD: Hud = { started: false, elapsed: 0, touches: 0, progress: 0, contact: false }

export default function CoordinationTask({ trialNo, onComplete }: TaskProps) {
  const keys = useHeldKeys(KEYS)
  const [hud, setHud] = useState<Hud>(INITIAL_HUD)
  const done = useRef(onComplete)
  done.current = onComplete

  useEffect(() => () => buzzerOff(), [])

  return (
    <div className="task-stage">
      <Canvas
        camera={{ position: [0, 0.46, 0.26], fov: 45, near: 0.01, far: 5 }}
        onCreated={({ camera }) => camera.lookAt(0, 0.02, 0.01)}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#2a2d33']} />
        <hemisphereLight args={['#ffffff', '#555048', 1.6]} />
        <directionalLight position={[0.3, 0.8, 0.4]} intensity={1.6} />
        <Apparatus key={trialNo} keys={keys} onHud={setHud} onDone={(r) => done.current(r)} />
      </Canvas>
      <div className="task-hud">
        <span className="hud-time">{formatTime(hud.elapsed)}</span>
        <span>Lap {Math.round(hud.progress * 100)}%</span>
        <span className={hud.touches ? 'hud-bad' : ''}>Edge touches: {hud.touches}</span>
      </div>
      {!hud.started && (
        <div className="task-banner">
          Trial {trialNo}: use <kbd>←</kbd>/<kbd>→</kbd> (left crank) and <kbd>↑</kbd>/<kbd>↓</kbd> (right crank) to start.
          Go once round the track and back to START.
        </div>
      )}
      {hud.contact && <div className="task-flash" />}
    </div>
  )
}

function makePlateTexture() {
  const s = 4 // px per mm
  const canvas = document.createElement('canvas')
  canvas.width = PLATE.w * s
  canvas.height = PLATE.h * s
  const ctx = canvas.getContext('2d')!
  const px = (x: number) => (x + PLATE.w / 2) * s
  const py = (y: number) => (PLATE.h / 2 - y) * s

  ctx.fillStyle = '#3b3f45'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const path = () => {
    ctx.beginPath()
    TRACK.forEach(([x, y], i) => (i ? ctx.lineTo(px(x), py(y)) : ctx.moveTo(px(x), py(y))))
    ctx.closePath()
  }
  ctx.lineJoin = 'round'
  // Brass edges, then the groove between them.
  path()
  ctx.strokeStyle = '#c9a54a'
  ctx.lineWidth = (HALF_WIDTH * 2 + 3) * s
  ctx.stroke()
  path()
  ctx.strokeStyle = '#e9e4d8'
  ctx.lineWidth = HALF_WIDTH * 2 * s
  ctx.stroke()

  ctx.fillStyle = '#2f9e5b'
  ctx.beginPath()
  ctx.arc(px(START.x), py(START.y), 4 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#ffffff'
  ctx.font = `bold ${7 * s}px system-ui, sans-serif`
  ctx.fillText('START', px(START.x) - 6 * s, py(START.y) - 9 * s)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

interface ApparatusProps {
  keys: React.RefObject<Set<string>>
  onHud: (hud: Hud) => void
  onDone: (r: TrialResult) => void
}

/** One trial's worth of state; remounted (via key) for every trial. */
function Apparatus({ keys, onHud, onDone }: ApparatusProps) {
  const texture = useMemo(makePlateTexture, [])
  useEffect(() => () => texture.dispose(), [texture])

  const stylus = useRef<THREE.Group>(null)
  const bridge = useRef<THREE.Group>(null)
  const leftCrank = useRef<THREE.Group>(null)
  const rightCrank = useRef<THREE.Group>(null)
  const tipMaterial = useRef<THREE.MeshStandardMaterial>(null)

  const sim = useRef({
    x: START.x, y: START.y, vx: 0, vy: 0,
    started: false, t0: 0, elapsed: 0,
    touches: 0, contact: false,
    lastS: 0, travelled: 0, done: false, hudTimer: 0,
  })

  useEffect(() => {
    onHud(INITIAL_HUD)
    return () => buzzerOff()
  }, [onHud])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const s = sim.current
    if (s.done) return
    const k = keys.current!

    const ax = (k.has('ArrowRight') ? 1 : 0) - (k.has('ArrowLeft') ? 1 : 0)
    const ay = (k.has('ArrowUp') ? 1 : 0) - (k.has('ArrowDown') ? 1 : 0)
    // Cranks spin up while held, so short taps give fine control.
    const ramp = (v: number, dir: number) =>
      dir === 0 ? 0 : dir * Math.min(MAX_SPEED, (Math.sign(v) === dir ? Math.abs(v) : 0) + ACCEL * dt)
    s.vx = ramp(s.vx, ax)
    s.vy = ramp(s.vy, ay)

    if ((ax || ay) && !s.started) {
      s.started = true
      s.t0 = performance.now()
    }
    if (s.started) s.elapsed = (performance.now() - s.t0) / 1000

    let x = s.x + s.vx * dt
    let y = s.y + s.vy * dt
    const near = nearestOnTrack(x, y)
    // The groove walls stop the stylus; touching them closes the buzzer circuit.
    const touching = near.d >= HALF_WIDTH - 0.3
    if (near.d > HALF_WIDTH) {
      x = near.x + ((x - near.x) * HALF_WIDTH) / near.d
      y = near.y + ((y - near.y) * HALF_WIDTH) / near.d
    }
    if (touching && !s.contact && s.started) {
      s.touches++
      buzzerOn()
    } else if (!touching && s.contact) {
      buzzerOff()
    }
    s.contact = touching && s.started
    s.x = x
    s.y = y

    let ds = near.s - s.lastS
    if (ds > LOOP_LENGTH / 2) ds -= LOOP_LENGTH
    if (ds < -LOOP_LENGTH / 2) ds += LOOP_LENGTH
    s.travelled += ds
    s.lastS = near.s

    const lapDone = Math.abs(s.travelled) >= LOOP_LENGTH * 0.97 && Math.hypot(x - START.x, y - START.y) < 8
    if (lapDone) {
      s.done = true
      buzzerOff()
      onDone({
        value: s.elapsed,
        faulty: s.touches > 0,
        note: s.touches ? `${s.touches} edge touch${s.touches > 1 ? 'es' : ''}` : undefined,
      })
    }

    stylus.current?.position.set(x * MM, 0, -y * MM)
    bridge.current?.position.set(0, 0, -y * MM)
    leftCrank.current?.rotation.set(-x * CRANK_RAD_PER_MM, 0, 0)
    rightCrank.current?.rotation.set(y * CRANK_RAD_PER_MM, 0, 0)
    tipMaterial.current?.color.set(s.contact ? '#e5484d' : '#d0d4da')

    s.hudTimer -= dt
    if (s.hudTimer <= 0 || lapDone) {
      s.hudTimer = 0.1
      onHud({
        started: s.started,
        elapsed: s.elapsed,
        touches: s.touches,
        progress: Math.min(1, Math.abs(s.travelled) / LOOP_LENGTH),
        contact: s.contact,
      })
    }
  })

  const w = PLATE.w * MM
  const h = PLATE.h * MM
  return (
    <group>
      {/* Base board and housing */}
      <mesh position={[0, -0.006, 0]}>
        <boxGeometry args={[0.46, 0.012, 0.3]} />
        <meshStandardMaterial color="#8a6a45" />
      </mesh>
      <mesh position={[0, PLATE_TOP / 2, 0]}>
        <boxGeometry args={[w + 0.02, PLATE_TOP - 0.002, h + 0.02]} />
        <meshStandardMaterial color="#2f5d8a" metalness={0.2} roughness={0.6} />
      </mesh>
      <mesh position={[0, PLATE_TOP, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial map={texture} roughness={0.5} />
      </mesh>

      {/* Side rails and the bridge that carries the stylus along y */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (w / 2 + 0.006), PLATE_TOP + 0.03, 0]}>
          <boxGeometry args={[0.008, 0.008, h + 0.02]} />
          <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      <group ref={bridge}>
        <mesh position={[0, PLATE_TOP + 0.03, 0]}>
          <boxGeometry args={[w + 0.02, 0.006, 0.008]} />
          <meshStandardMaterial color="#b7bec6" metalness={0.6} roughness={0.3} />
        </mesh>
      </group>
      <group ref={stylus}>
        <mesh position={[0, PLATE_TOP + 0.03, 0]}>
          <boxGeometry args={[0.022, 0.016, 0.022]} />
          <meshStandardMaterial color="#444b55" />
        </mesh>
        <mesh position={[0, PLATE_TOP + 0.016, 0]}>
          <cylinderGeometry args={[0.0025, 0.0012, 0.03, 12]} />
          <meshStandardMaterial ref={tipMaterial} color="#d0d4da" metalness={0.7} roughness={0.3} />
        </mesh>
      </group>

      {/* Left crank drives x, right crank drives y */}
      <Crank ref={leftCrank} position={[-(w / 2 + 0.03), PLATE_TOP * 0.55, 0.04]} />
      <Crank ref={rightCrank} position={[w / 2 + 0.03, PLATE_TOP * 0.55, -0.02]} />
    </group>
  )
}

function Crank({ ref, position }: { ref: React.Ref<THREE.Group>; position: [number, number, number] }) {
  const side = Math.sign(position[0])
  return (
    <group position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-side * 0.012, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.024, 12]} />
        <meshStandardMaterial color="#9aa3ad" metalness={0.6} roughness={0.3} />
      </mesh>
      <group ref={ref}>
        <mesh position={[0, 0.018, 0]}>
          <boxGeometry args={[0.006, 0.042, 0.01]} />
          <meshStandardMaterial color="#c0c6cd" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[side * 0.012, 0.036, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.005, 0.005, 0.024, 12]} />
          <meshStandardMaterial color="#1f1f1f" />
        </mesh>
      </group>
    </group>
  )
}
