import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import Player, { type PlayerHandle } from './Player'
import StationLabel from './StationLabel'
import { MODEL_URL, prepareLabModel, type Station } from './labModel'
import type { ExperimentId } from './experiments'

const GLOW = new THREE.Color('#ffb547')

interface Props {
  nearId: ExperimentId | null
  playerRef: React.RefObject<PlayerHandle | null>
  onLockChange: (locked: boolean) => void
  onNearStation: (id: ExperimentId | null) => void
}

export default function LabScene({ nearId, playerRef, onLockChange, onNearStation }: Props) {
  const gltf = useGLTF(MODEL_URL)
  // Clone and prepare in one step: prepareLabModel mutates the scene (materials,
  // extra walls), and drei caches gltf.scene across remounts.
  const { scene, model } = useMemo(() => {
    const scene = gltf.scene.clone(true)
    return { scene, model: prepareLabModel(scene) }
  }, [gltf.scene])

  return (
    <>
      <color attach="background" args={['#d9d4c7']} />
      <hemisphereLight args={['#fffaf0', '#8a8272', 1.6]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[4, 8, 3]} intensity={1.4} />
      <directionalLight position={[-5, 6, -4]} intensity={0.6} />
      <pointLight position={[0, 3, -3]} intensity={6} distance={10} />
      <pointLight position={[0, 3, 3]} intensity={6} distance={10} />

      <primitive object={scene} />
      {model.stations.map((st) => (
        <StationMarker key={st.def.id} station={st} active={st.def.id === nearId} />
      ))}

      <Player model={model} handleRef={playerRef} onLockChange={onLockChange} onNearStation={onNearStation} />
    </>
  )
}

function StationMarker({ station, active }: { station: Station; active: boolean }) {
  // Tables are near-white, so emissive alone washes out; tint the base colour too.
  const baseColors = useMemo(() => station.materials.map((m) => m.color.clone()), [station])

  useEffect(() => {
    if (active) return
    station.materials.forEach((m, i) => {
      m.color.copy(baseColors[i])
      m.emissive.setRGB(0, 0, 0)
    })
  }, [active, station, baseColors])

  useFrame(({ clock }) => {
    if (!active) return
    const pulse = 0.5 + 0.5 * Math.sin(clock.elapsedTime * 4)
    station.materials.forEach((m, i) => {
      m.color.copy(baseColors[i]).lerp(GLOW, 0.45 + 0.2 * pulse)
      m.emissive.copy(GLOW).multiplyScalar(0.12 + 0.1 * pulse)
    })
  })

  const { def } = station
  const sub = active
    ? 'Press E or click to open'
    : def.status === 'coming-soon' ? 'Coming soon' : null
  return <StationLabel position={station.labelPos} title={def.title} sub={sub} active={active} />
}

useGLTF.preload(MODEL_URL)
