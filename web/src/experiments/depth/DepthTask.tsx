import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useKeyPress } from '../input'
import type { TaskProps, TrialResult } from '../types'

// Electric depth perception tester, as set up in the lab: the box stands at the far end of the
// table and the subject looks at it from a chin rest at the near end, through the window in its
// front panel. Two rods are fixed; the motor drives the middle rod from behind them towards the
// subject, who stops it the moment all three look level (in one plane).
//
// Units are metres. The eye is at the origin looking down −z; the table top is below it.
const FIXED_Z = -1.2 // plane of the two fixed rods
const ROD_X = 0.06
const ROD_RADIUS = 0.004
const FRONT_LIMIT = -1.0 // the carriage's front stop
const MIN_START_BEHIND = 0.05
const MAX_START_BEHIND = 0.15
const MOTOR_SPEED = 0.025 // m/s, towards the subject
const READY_MS = 1400

// The view is fixed (head on the chin rest). A flat screen has no two-eye depth, so the window
// shows where the rods stand on the floor of the box: the nearer a rod, the lower its foot
// appears, and it looks slightly thicker. That is the depth cue the subject judges by.
const LOOK_AT = new THREE.Vector3(0, -0.05, FIXED_Z)

// Box: front panel with the viewing window faces the subject.
const BOX = { front: -0.95, back: -1.45, halfW: 0.25, bottom: -0.18, top: 0.18 }
const WINDOW = { halfW: 0.15, top: 0.06, bottom: -0.168 }
const TABLE_Y = BOX.bottom
const FLOOR_Y = BOX.bottom + 0.007 // inside floor of the box

type Phase = 'ready' | 'moving'

export default function DepthTask(props: TaskProps) {
  // A fresh apparatus state for every trial.
  return <DepthTrial key={props.trialNo} {...props} />
}

function DepthTrial({ trialNo, onComplete }: TaskProps) {
  const rodZ = useRef(0)
  const phase = useRef<Phase>('ready')
  const done = useRef(false)
  const [moving, setMoving] = useState(false)

  // The operator resets the rod to a different distance behind the fixed pair each trial.
  const startZ = useMemo(
    () => FIXED_Z - (MIN_START_BEHIND + Math.random() * (MAX_START_BEHIND - MIN_START_BEHIND)),
    [],
  )
  if (rodZ.current === 0) rodZ.current = startZ

  useEffect(() => {
    const t = setTimeout(() => {
      phase.current = 'moving'
      setMoving(true)
    }, READY_MS)
    return () => clearTimeout(t)
  }, [])

  const record = (reachedStop: boolean) => {
    if (done.current) return
    done.current = true
    phase.current = 'ready' // motor off
    const result: TrialResult = {
      // Positive = stopped farther than the fixed rods (early), negative = nearer (late).
      value: Math.round((FIXED_Z - rodZ.current) * 10000) / 10,
      faulty: reachedStop,
      note: reachedStop ? 'Rod ran to the front stop before it was stopped.' : undefined,
    }
    onComplete(result)
  }

  useKeyPress(['Space', 'Enter'], () => {
    if (phase.current === 'moving') record(false)
  })

  return (
    <div className="task-stage depth-stage">
      <Canvas camera={{ position: [0, 0, 0], fov: 30, near: 0.02, far: 20 }} dpr={[1, 2]}>
        <Apparatus rodZ={rodZ} phase={phase} onFrontStop={() => record(true)} />
      </Canvas>
      <div className="task-banner">
        Trial {trialNo}:{' '}
        {moving
          ? <>the middle rod is coming towards you. Press <kbd>Space</kbd> the moment it is level with the other two.</>
          : 'get ready, the rod will start moving…'}
      </div>
    </div>
  )
}

interface ApparatusProps {
  rodZ: React.RefObject<number>
  phase: React.RefObject<Phase>
  onFrontStop: () => void
}

function Apparatus({ rodZ, phase, onFrontStop }: ApparatusProps) {
  const movable = useRef<THREE.Group>(null)

  const camera = useThree((st) => st.camera)
  useLayoutEffect(() => camera.lookAt(LOOK_AT), [camera])

  useFrame((_, rawDt) => {

    if (phase.current === 'moving') {
      const dt = Math.min(rawDt, 0.05)
      rodZ.current = Math.min(rodZ.current + MOTOR_SPEED * dt, FRONT_LIMIT)
      if (rodZ.current >= FRONT_LIMIT) {
        phase.current = 'ready'
        onFrontStop()
      }
    }
    movable.current?.position.setZ(rodZ.current)
  })

  const rodLength = BOX.top - 0.01 - FLOOR_Y
  const boxDepth = BOX.front - BOX.back
  const boxMidZ = (BOX.front + BOX.back) / 2
  const height = BOX.top - BOX.bottom
  const panelT = 0.012

  return (
    <group>
      <color attach="background" args={['#2b2d31']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[0.6, 2, 0.8]} intensity={1.6} />

      {/* Lab table running from the chin rest out to the box. */}
      <mesh position={[0, TABLE_Y - 0.02, -0.9]}>
        <boxGeometry args={[0.9, 0.04, 2.0]} />
        <meshStandardMaterial color="#8a6a48" roughness={0.8} />
      </mesh>

      {/* Box shell (sides, top, bottom). */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * BOX.halfW, 0, boxMidZ]}>
          <boxGeometry args={[panelT, height, boxDepth]} />
          <meshStandardMaterial color="#7d8c80" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, BOX.top, boxMidZ]}>
        <boxGeometry args={[BOX.halfW * 2 + panelT, panelT, boxDepth]} />
        <meshStandardMaterial color="#7d8c80" roughness={0.6} />
      </mesh>
      <mesh position={[0, BOX.bottom, boxMidZ]}>
        <boxGeometry args={[BOX.halfW * 2 + panelT, panelT, boxDepth]} />
        <meshStandardMaterial color="#7d8c80" roughness={0.6} />
      </mesh>

      {/* Front panel with the viewing window: hides the rods' ends and the carriage. */}
      <FrontPanel />

      {/* Evenly lit white back screen: no shadows or shading to give the depth away. */}
      <mesh position={[0, 0, BOX.back + 0.01]}>
        <planeGeometry args={[BOX.halfW * 2, height]} />
        <meshBasicMaterial color="#f1efe8" />
      </mesh>

      {/* Plain floor inside the box, so the rods' feet show where each rod stands. */}
      <mesh position={[0, FLOOR_Y, boxMidZ]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[BOX.halfW * 2, boxDepth]} />
        <meshBasicMaterial color="#d9d5ca" />
      </mesh>

      {[-ROD_X, ROD_X].map((x) => (
        <group key={x} position={[x, 0, FIXED_Z]}>
          <Rod length={rodLength} />
        </group>
      ))}
      <group ref={movable} position={[0, 0, rodZ.current]}>
        <Rod length={rodLength} />
      </group>
    </group>
  )
}

function FrontPanel() {
  const z = BOX.front
  const t = 0.012
  const w = BOX.halfW * 2 + t
  const sideW = BOX.halfW - WINDOW.halfW
  const outerTop = BOX.top + t / 2
  const outerBottom = BOX.bottom - t / 2
  const topH = outerTop - WINDOW.top
  const bottomH = WINDOW.bottom - outerBottom
  const winH = WINDOW.top - WINDOW.bottom
  const mat = <meshStandardMaterial color="#6e7d71" roughness={0.6} />
  return (
    <group position={[0, 0, z]}>
      <mesh position={[0, outerTop - topH / 2, 0]}>
        <boxGeometry args={[w, topH, t]} />
        {mat}
      </mesh>
      <mesh position={[0, outerBottom + bottomH / 2, 0]}>
        <boxGeometry args={[w, bottomH, t]} />
        {mat}
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (WINDOW.halfW + sideW / 2 + t / 4), (WINDOW.top + WINDOW.bottom) / 2, 0]}>
          <boxGeometry args={[sideW + t / 2, winH, t]} />
          {mat}
        </mesh>
      ))}
    </group>
  )
}

/** A black rod standing on a small foot; its origin is the floor of the box. */
function Rod({ length }: { length: number }) {
  return (
    <group position={[0, FLOOR_Y, 0]}>
      <mesh position={[0, length / 2, 0]}>
        <cylinderGeometry args={[ROD_RADIUS, ROD_RADIUS, length, 20]} />
        <meshBasicMaterial color="#141414" />
      </mesh>
      <mesh position={[0, 0.004, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.008, 24]} />
        <meshBasicMaterial color="#141414" />
      </mesh>
    </group>
  )
}
