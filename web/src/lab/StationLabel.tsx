import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// In-scene labels (canvas textures on sprites) rather than DOM overlays, so they
// also render inside a WebXR headset.

const PX_PER_METER = 400
// Labels grow with distance (up to MAX_GROW) so far-away stations stay readable.
const GROW_START = 3
const MAX_GROW = 3
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

function drawLabel(title: string, sub: string | null, active: boolean) {
  const scale = 2 // supersample for crisp text
  const padX = 28 * scale
  const titleSize = 40 * scale
  const subSize = 26 * scale
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')!

  ctx.font = `700 ${titleSize}px ${FONT}`
  const titleW = ctx.measureText(title).width
  ctx.font = `500 ${subSize}px ${FONT}`
  const subW = sub ? ctx.measureText(sub).width : 0

  canvas.width = Math.ceil(Math.max(titleW, subW) + padX * 2)
  canvas.height = Math.ceil((sub ? 112 : 72) * scale)

  ctx.fillStyle = active ? 'rgba(214, 133, 22, 0.94)' : 'rgba(20, 20, 24, 0.72)'
  ctx.beginPath()
  ctx.roundRect(0, 0, canvas.width, canvas.height, 18 * scale)
  ctx.fill()

  ctx.fillStyle = '#ffffff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = `700 ${titleSize}px ${FONT}`
  ctx.fillText(title, canvas.width / 2, (sub ? 40 : 36) * scale)
  if (sub) {
    ctx.globalAlpha = 0.92
    ctx.font = `500 ${subSize}px ${FONT}`
    ctx.fillText(sub, canvas.width / 2, 84 * scale)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return { texture, width: canvas.width / scale / PX_PER_METER, height: canvas.height / scale / PX_PER_METER }
}

interface Props {
  position: THREE.Vector3
  title: string
  sub: string | null
  active: boolean
}

export default function StationLabel({ position, title, sub, active }: Props) {
  const label = useMemo(() => drawLabel(title, sub, active), [title, sub, active])
  useEffect(() => () => label.texture.dispose(), [label])
  const sprite = useRef<THREE.Sprite>(null)

  useFrame(({ camera }) => {
    if (!sprite.current) return
    const grow = THREE.MathUtils.clamp(camera.position.distanceTo(position) / GROW_START, 1, MAX_GROW)
    sprite.current.scale.set(label.width * grow, label.height * grow, 1)
  })

  return (
    <sprite ref={sprite} position={position} scale={[label.width, label.height, 1]} renderOrder={10}>
      <spriteMaterial map={label.texture} transparent depthWrite={false} toneMapped={false} />
    </sprite>
  )
}
