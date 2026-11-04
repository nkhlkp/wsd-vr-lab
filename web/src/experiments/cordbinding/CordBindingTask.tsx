import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { formatTime } from '../analysis'
import { buzzerOff, buzzerOn } from '../input'
import type { TaskProps } from '../types'
import { PATTERN, PEGS } from './pegs'

// Cord binding tester (lab report sheet 32): a wooden board resting against the wall with pegs
// sticking out of it. Starting from the tied end at the bottom left, the cord is wound round the
// pegs in a set pattern; the time for one complete binding is recorded.
// Board-local units are metres; x right, y up, z out of the board towards the subject.
const BOARD = { w: 1.0, h: 0.56, d: 0.03 }
const LEAN = -0.2 // radians: top of the board rests back against the wall
const PEG_LEN = 0.085
const PEG_R = 0.011
const CORD_R_PX = 4
const CORD = '#c9a24a'
const WRONG_LIMIT = 2 // this many wrong pegs makes the trial faulty

/** The cord is tied off below the board's bottom-left corner. */
const CORD_START: [number, number] = [-0.47, -0.25]

const tip = (i: number) => new THREE.Vector3(PEGS[i][0], PEGS[i][1], BOARD.d / 2 + PEG_LEN * 0.75)

interface Hud {
  started: boolean
  elapsed: number
  wound: number
  wrong: number
}

const INITIAL_HUD: Hud = { started: false, elapsed: 0, wound: 0, wrong: 0 }

export default function CordBindingTask({ trialNo, onComplete }: TaskProps) {
  const [hud, setHud] = useState<Hud>(INITIAL_HUD)
  const done = useRef(onComplete)
  done.current = onComplete

  useEffect(() => setHud(INITIAL_HUD), [trialNo])

  return (
    <div className="task-stage">
      <Canvas
        camera={{ position: [0, 0.12, 1.25], fov: 45, near: 0.01, far: 10 }}
        onCreated={({ camera }) => camera.lookAt(0, 0, 0)}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#2a2d33']} />
        <hemisphereLight args={['#ffffff', '#5a5246', 1.4]} />
        <directionalLight position={[0.4, 1, 1]} intensity={1.6} />
        <Rig
          key={trialNo}
          onHud={setHud}
          onDone={(seconds, wrong) =>
            done.current({
              value: seconds,
              faulty: wrong >= WRONG_LIMIT,
              note: wrong ? `${wrong} wrong peg${wrong > 1 ? 's' : ''}` : undefined,
            })}
        />
      </Canvas>
      <div className="task-hud">
        <span className="hud-time">{formatTime(hud.elapsed)}</span>
        <span>Pegs wound {hud.wound} / {PATTERN.length}</span>
        {hud.wrong > 0 && <span className="hud-bad">Wrong pegs {hud.wrong}</span>}
      </div>
      <PatternCard wound={hud.wound} />
      {!hud.started && (
        <div className="task-banner">
          Trial {trialNo}: wind the cord round the pegs in the order shown on the pattern card: click each peg in
          turn. The clock starts at the first peg.
        </div>
      )}
    </div>
  )
}

interface RigProps {
  onHud: (hud: Hud) => void
  onDone: (seconds: number, wrong: number) => void
}

function Rig({ onHud, onDone }: RigProps) {
  const [wound, setWound] = useState(0)
  const [wrong, setWrong] = useState(0)
  const [flash, setFlash] = useState<number | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [hand, setHand] = useState<THREE.Vector3 | null>(null)
  const board = useRef<THREE.Group>(null)
  const t0 = useRef<number | null>(null)
  const finished = useRef(false)
  const hudTimer = useRef(0)

  const report = (elapsed: number) => onHud({ started: t0.current !== null, elapsed, wound, wrong })

  useEffect(() => {
    report(t0.current === null ? 0 : (performance.now() - t0.current) / 1000)
  }, [wound, wrong])

  useFrame((_, dt) => {
    if (t0.current === null || finished.current) return
    hudTimer.current -= dt
    if (hudTimer.current > 0) return
    hudTimer.current = 0.1
    report((performance.now() - t0.current) / 1000)
  })

  useEffect(() => () => {
    document.body.style.cursor = ''
    buzzerOff()
  }, [])

  // Brief red flash and buzz on a wrong peg.
  useEffect(() => {
    if (flash === null) return
    buzzerOn()
    const t = setTimeout(() => { buzzerOff(); setFlash(null) }, 220)
    return () => { clearTimeout(t); buzzerOff() }
  }, [flash])

  const clickPeg = (i: number) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (finished.current) return
    if (i !== PATTERN[wound]) {
      // Pegs already wound are ignored; anything else is a wrong peg.
      if (!PATTERN.slice(0, wound).includes(i)) {
        setWrong((w) => w + 1)
        setFlash(i)
      }
      return
    }
    t0.current ??= performance.now()
    const next = wound + 1
    setWound(next)
    if (next === PATTERN.length) {
      finished.current = true
      const seconds = (performance.now() - t0.current) / 1000
      onHud({ started: true, elapsed: seconds, wound: next, wrong })
      onDone(seconds, wrong)
    }
  }

  // The loose cord follows the pointer across the board.
  const moveHand = (e: ThreeEvent<PointerEvent>) => {
    if (!board.current) return
    const local = board.current.worldToLocal(e.point.clone())
    local.z = BOARD.d / 2 + PEG_LEN
    setHand(local)
  }

  const start = useMemo(() => new THREE.Vector3(CORD_START[0], CORD_START[1], BOARD.d / 2 + 0.01), [])
  const path = useMemo(() => [start, ...PATTERN.slice(0, wound).map(tip)], [wound, start])
  const last = path[path.length - 1]

  const pointer = (on: boolean) => () => { document.body.style.cursor = on ? 'pointer' : '' }

  return (
    <group>
      {/* Wall and the table the board stands on. */}
      <mesh position={[0, 0.1, -0.12]}>
        <planeGeometry args={[4, 3]} />
        <meshStandardMaterial color="#b4c3cd" />
      </mesh>
      <mesh position={[0, -BOARD.h / 2 - 0.02, 0.25]}>
        <boxGeometry args={[1.6, 0.04, 0.8]} />
        <meshStandardMaterial color="#e2dfcf" />
      </mesh>

      <group ref={board} rotation={[LEAN, 0, 0]} position={[0, 0, -0.03]}>
        <mesh onPointerMove={moveHand}>
          <boxGeometry args={[BOARD.w, BOARD.h, BOARD.d]} />
          <meshStandardMaterial color="#b98a55" roughness={0.85} />
        </mesh>
        {/* Invisible plane at peg-tip height so the hand keeps following above the pegs. */}
        <mesh position={[0, 0, BOARD.d / 2 + PEG_LEN]} onPointerMove={moveHand}>
          <planeGeometry args={[BOARD.w + 0.4, BOARD.h + 0.4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>

        {PEGS.map(([x, y], i) => {
          const isWound = PATTERN.slice(0, wound).includes(i)
          const color = flash === i ? '#d83a2e' : hover === i ? '#f2c66d' : '#d9b27a'
          return (
            <group key={i} position={[x, y, BOARD.d / 2]}>
              <mesh
                rotation={[Math.PI / 2, 0, 0]}
                position={[0, 0, PEG_LEN / 2]}
                onClick={clickPeg(i)}
                onPointerOver={(e) => { e.stopPropagation(); setHover(i); pointer(true)() }}
                onPointerOut={() => { setHover((h) => (h === i ? null : h)); pointer(false)() }}
              >
                <cylinderGeometry args={[PEG_R, PEG_R, PEG_LEN, 20]} />
                <meshStandardMaterial color={color} roughness={0.7} />
              </mesh>
              {/* Generous click target round each peg. */}
              <mesh position={[0, 0, PEG_LEN * 0.75]} onClick={clickPeg(i)}>
                <circleGeometry args={[0.035, 16]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} />
              </mesh>
              {/* A turn of cord round a wound peg. */}
              {isWound && (
                <mesh position={[0, 0, PEG_LEN * 0.75]}>
                  <torusGeometry args={[PEG_R + 0.003, 0.0035, 8, 24]} />
                  <meshStandardMaterial color={CORD} roughness={0.9} />
                </mesh>
              )}
            </group>
          )
        })}

        {/* Tied end, wound cord and the loose end in the subject's hand. */}
        <mesh position={start}>
          <sphereGeometry args={[0.012, 12, 12]} />
          <meshStandardMaterial color={CORD} />
        </mesh>
        {path.length > 1 && <Line points={path} color={CORD} lineWidth={CORD_R_PX} />}
        {hand && !finished.current && (
          <Line points={[last, hand]} color={CORD} lineWidth={CORD_R_PX * 0.75} dashed dashSize={0.02} gapSize={0.01} />
        )}
      </group>
    </group>
  )
}

/** The pattern card pinned beside the board: numbered pegs and the winding route. */
function PatternCard({ wound }: { wound: number }) {
  const W = 200
  const H = 112
  const sx = (x: number) => ((x + BOARD.w / 2) / BOARD.w) * W
  const sy = (y: number) => ((BOARD.h / 2 - y) / BOARD.h) * H
  const route = [CORD_START, ...PATTERN.map((i) => PEGS[i])]
  return (
    <div className="pattern-card">
      <div className="small">Pattern card</div>
      <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} width={W + 12}>
        <rect x={0} y={0} width={W} height={H} rx={4} fill="#b98a55" />
        <polyline
          points={route.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')}
          fill="none" stroke="#f3e6c4" strokeWidth={1.5} strokeDasharray="3 2"
        />
        {PEGS.map(([x, y], i) => {
          const order = PATTERN.indexOf(i)
          const done = order >= 0 && order < wound
          return (
            <g key={i}>
              <circle cx={sx(x)} cy={sy(y)} r={6} fill={done ? '#5b8c3a' : order >= 0 ? '#3b2a17' : '#8a6a45'} />
              {order >= 0 && (
                <text x={sx(x)} y={sy(y) + 3} textAnchor="middle" fontSize={8} fill="#fff">{order + 1}</text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
