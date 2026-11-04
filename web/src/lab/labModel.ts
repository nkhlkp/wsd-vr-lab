import * as THREE from 'three'
import { PropertyBinding } from 'three'
import { EXPERIMENTS, type ExperimentDef } from './experiments'
import { addLabProps } from './props'

export const MODEL_URL = '/models/lab.glb'

// Room interior in three.js coordinates (Blender X stays X, Blender Y becomes -Z).
export const ROOM = { minX: -6, maxX: 6, minZ: -7, maxZ: 7, height: 3.2 }

/** Axis-aligned footprint on the floor plane. */
export interface Rect {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface Station {
  def: ExperimentDef
  object: THREE.Object3D
  rect: Rect
  /** Point above the table where the floating label sits. */
  labelPos: THREE.Vector3
  materials: THREE.MeshStandardMaterial[]
}

export interface LabModel {
  colliders: Rect[]
  stations: Station[]
}

// The eye-fatigue reader model sits on the eye-fatigue station's table.
const EYE_FATIGUE_TABLE = EXPERIMENTS.find((e) => e.id === 'eye-fatigue')?.stationObject ?? 'Eye Test Table'
// The long left row is Table 6 + 7 + 8 butted together. The depth tester stands at the south
// end (Table 6); the chin rest is at the free north end of Table 8, where the subject can sit.
const DEPTH_CHIN_REST_TABLE = 'Table 8'

// Objects that should never block movement (flat or tiny props).
const NON_BLOCKING = ['Floor', 'Keyboard', 'Mouse', 'Documents', 'Door Handle']

// GLTFLoader rewrites node names (spaces -> '_', drops '.'), so look objects up the same way.
const nodeName = (blenderName: string) => PropertyBinding.sanitizeNodeName(blenderName)

function rectOf(box: THREE.Box3): Rect {
  return { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }
}

function isUnder(obj: THREE.Object3D, names: Set<string>) {
  for (let o: THREE.Object3D | null = obj; o; o = o.parent) if (names.has(o.name)) return true
  return false
}

/**
 * Prepares the loaded glTF scene for the lab: fills in geometry the Blender model
 * lacks, builds wall/furniture colliders and wires experiment stations to tables.
 */
export function prepareLabModel(scene: THREE.Object3D): LabModel {
  addMissingShell(scene)
  scene.updateMatrixWorld(true)
  const depthStation = EXPERIMENTS.find((e) => e.id === 'depth-perception')?.stationObject
  const cordStation = EXPERIMENTS.find((e) => e.id === 'cord-binding')?.stationObject ?? 'Rope Exp Table'
  if (depthStation) addLabProps(scene, depthStation, DEPTH_CHIN_REST_TABLE, EYE_FATIGUE_TABLE, cordStation)
  scene.updateMatrixWorld(true)

  const nonBlocking = new Set(NON_BLOCKING.map(nodeName))
  const colliders: Rect[] = []
  scene.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh || isUnder(obj, nonBlocking)) return
    const box = new THREE.Box3().setFromObject(obj)
    // Only things between ankle and head height block the player.
    if (box.max.y < 0.2 || box.min.y > 1.9) return
    colliders.push(rectOf(box))
  })

  const stations: Station[] = []
  for (const def of EXPERIMENTS) {
    const object = scene.getObjectByName(nodeName(def.stationObject))
    if (!object) {
      console.warn(`[lab] station object "${def.stationObject}" not found in ${MODEL_URL}`)
      continue
    }
    const extras = (def.extraObjects ?? [])
      .map((n) => scene.getObjectByName(nodeName(n)))
      .filter((o): o is THREE.Object3D => Boolean(o))
    // Tables share materials in the model; clone so only this station glows.
    const materials: THREE.MeshStandardMaterial[] = []
    for (const part of [object, ...extras]) part.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const cloned = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
        const c = (m as THREE.MeshStandardMaterial).clone()
        materials.push(c)
        return c
      })
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0]
    })
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    for (const e of extras) box.union(new THREE.Box3().setFromObject(e))
    stations.push({
      def,
      object,
      rect: rectOf(box),
      labelPos: new THREE.Vector3(center.x, box.max.y + 0.55, center.z),
      materials,
    })
  }

  return { colliders, stations }
}

// The Blender model has no west wall or ceiling yet; add them so the room is closed.
function addMissingShell(scene: THREE.Object3D) {
  const wallMaterial =
    findMaterial(scene, 'Mat_Wall') ?? new THREE.MeshStandardMaterial({ color: '#efe6d2' })

  if (!scene.getObjectByName(nodeName('West Wall'))) {
    const depth = ROOM.maxZ - ROOM.minZ
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.18, ROOM.height, depth), wallMaterial)
    wall.name = nodeName('West Wall')
    wall.position.set(ROOM.minX, ROOM.height / 2, 0)
    scene.add(wall)
  }

  if (!scene.getObjectByName(nodeName('Ceiling'))) {
    const ceiling = new THREE.Mesh(
      new THREE.PlaneGeometry(ROOM.maxX - ROOM.minX, ROOM.maxZ - ROOM.minZ),
      // Emissive stands in for the ceiling lights; nothing in the scene lights it from below.
      new THREE.MeshStandardMaterial({ color: '#f4f2ec', emissive: '#bdb9b0', side: THREE.DoubleSide }),
    )
    ceiling.name = nodeName('Ceiling')
    ceiling.rotation.x = Math.PI / 2
    ceiling.position.set(0, ROOM.height, 0)
    scene.add(ceiling)
  }
}

function findMaterial(scene: THREE.Object3D, name: string) {
  let found: THREE.Material | undefined
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (found || !mesh.isMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    found = mats.find((m) => m.name === name)
  })
  return found
}

/** Shortest floor-plane distance from a point to a rectangle (0 if inside). */
export function distanceToRect(x: number, z: number, r: Rect) {
  const dx = Math.max(r.minX - x, 0, x - r.maxX)
  const dz = Math.max(r.minZ - z, 0, z - r.maxZ)
  return Math.hypot(dx, dz)
}
