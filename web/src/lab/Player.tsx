import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js'
import { distanceToRect, ROOM, type LabModel } from './labModel'
import type { ExperimentId } from './experiments'

const EYE_HEIGHT = 1.6
const RADIUS = 0.3
const WALK_SPEED = 2.2
const RUN_SPEED = 4
const INTERACT_DISTANCE = 1.1
// Just inside the door, facing into the room.
const SPAWN = new THREE.Vector3(-3.8, EYE_HEIGHT, 5.9)

export interface PlayerHandle {
  lock: () => void
  unlock: () => void
}

interface Props {
  model: LabModel
  handleRef: React.RefObject<PlayerHandle | null>
  onLockChange: (locked: boolean) => void
  onNearStation: (id: ExperimentId | null) => void
}

function blocked(x: number, z: number, model: LabModel) {
  if (x < ROOM.minX + RADIUS || x > ROOM.maxX - RADIUS) return true
  if (z < ROOM.minZ + RADIUS || z > ROOM.maxZ - RADIUS) return true
  return model.colliders.some((r) => distanceToRect(x, z, r) < RADIUS)
}

/** First-person WASD + mouse-look with collision against the lab's furniture. */
export default function Player({ model, handleRef, onLockChange, onNearStation }: Props) {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const keys = useRef(new Set<string>())
  const controls = useRef<PointerLockControls | null>(null)
  const near = useRef<ExperimentId | null>(null)

  useEffect(() => {
    camera.position.copy(SPAWN)
    camera.rotation.set(0, 0, 0)
    // Dev-only handle for automated screenshots/tests; stripped from production builds.
    if (import.meta.env.DEV) (window as unknown as { __labCamera: THREE.Camera }).__labCamera = camera

    const c = new PointerLockControls(camera, gl.domElement)
    controls.current = c
    const onLock = () => onLockChange(true)
    const onUnlock = () => {
      keys.current.clear()
      onLockChange(false)
    }
    c.addEventListener('lock', onLock)
    c.addEventListener('unlock', onUnlock)
    handleRef.current = {
      // Browsers reject re-locking for ~1s after Esc; the overlay just stays up then.
      lock: () => { Promise.resolve(c.lock()).catch(() => {}) },
      unlock: () => c.unlock(),
    }

    const down = (e: KeyboardEvent) => keys.current.add(e.code)
    const up = (e: KeyboardEvent) => keys.current.delete(e.code)
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      c.removeEventListener('lock', onLock)
      c.removeEventListener('unlock', onUnlock)
      c.dispose()
      handleRef.current = null
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [camera, gl, handleRef, onLockChange])

  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const k = keys.current

    if (controls.current?.isLocked) {
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0)
      const s = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0)
      if (f || s) {
        camera.getWorldDirection(forward.current)
        forward.current.y = 0
        forward.current.normalize()
        right.current.crossVectors(forward.current, camera.up)
        const speed = k.has('ShiftLeft') || k.has('ShiftRight') ? RUN_SPEED : WALK_SPEED
        const move = forward.current.multiplyScalar(f).add(right.current.multiplyScalar(s))
        move.normalize().multiplyScalar(speed * delta)

        // Resolve each axis separately so the player slides along walls and tables.
        const p = camera.position
        if (!blocked(p.x + move.x, p.z, model)) p.x += move.x
        if (!blocked(p.x, p.z + move.z, model)) p.z += move.z
      }
    }

    let nearest: ExperimentId | null = null
    let best = INTERACT_DISTANCE
    for (const st of model.stations) {
      const d = distanceToRect(camera.position.x, camera.position.z, st.rect)
      if (d < best) {
        best = d
        nearest = st.def.id
      }
    }
    if (nearest !== near.current) {
      near.current = nearest
      onNearStation(nearest)
    }
  })

  return null
}
