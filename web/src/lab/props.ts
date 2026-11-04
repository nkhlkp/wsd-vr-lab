// Apparatus models placed on the lab tables in code (the Blender model has only the furniture).
import * as THREE from 'three'
import { PropertyBinding } from 'three'
import { PEGS as BINDER_PEGS } from '../experiments/cordbinding/pegs'

const nodeName = (blenderName: string) => PropertyBinding.sanitizeNodeName(blenderName)

const std = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra })

function box(w: number, h: number, d: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  m.position.set(x, y, z)
  return m
}

function cylinder(r: number, h: number, mat: THREE.Material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), mat)
  m.position.set(x, y, z)
  return m
}

/** Top-centre of a table, plus its footprint, in world space. */
function tableTop(scene: THREE.Object3D, name: string) {
  const obj = scene.getObjectByName(nodeName(name))
  if (!obj) {
    console.warn(`[lab] table "${name}" not found; prop not placed`)
    return null
  }
  const b = new THREE.Box3().setFromObject(obj)
  return { x: (b.min.x + b.max.x) / 2, y: b.max.y, z: (b.min.z + b.max.z) / 2, box: b }
}

/**
 * Depth perception tester: a box whose viewing window faces +z (rotate to aim it), with
 * three rods inside. The chin rest stands on its own at the other end of the tables.
 */
function depthTester(): THREE.Group {
  const g = new THREE.Group()
  const shell = std('#7d8c80')
  const dark = std('#141414')
  const white = new THREE.MeshBasicMaterial({ color: '#f1efe8' })

  // Box 0.5 wide, 0.36 high, 0.5 deep; front (window side) faces +z.
  const W = 0.5, H = 0.36, D = 0.5, t = 0.012
  g.add(box(W, t, D, shell, 0, t / 2, 0)) // floor
  g.add(box(W, t, D, shell, 0, H - t / 2, 0)) // lid
  g.add(box(t, H, D, shell, -W / 2 + t / 2, H / 2, 0))
  g.add(box(t, H, D, shell, W / 2 - t / 2, H / 2, 0))
  g.add(box(W, H, t, white, 0, H / 2, -D / 2 + t * 1.5)) // white screen inside
  g.add(box(W, H, t, shell, 0, H / 2, -D / 2 + t / 2)) // painted back panel
  // Front panel with the viewing window.
  const winW = 0.3, winBottom = 0.03, winTop = 0.24
  g.add(box(W, winBottom, t, shell, 0, winBottom / 2, D / 2 - t / 2))
  g.add(box(W, H - winTop, t, shell, 0, (H + winTop) / 2, D / 2 - t / 2))
  for (const s of [-1, 1]) {
    const sideW = (W - winW) / 2
    g.add(box(sideW, winTop - winBottom, t, shell, s * (winW / 2 + sideW / 2), (winTop + winBottom) / 2, D / 2 - t / 2))
  }
  // Three rods: two fixed, the middle one on its carriage a little behind them.
  for (const [x, z] of [[-0.06, 0], [0.06, 0], [0, -0.08]] as const) {
    g.add(cylinder(0.004, H - 0.03, dark, x, (H - 0.03) / 2 + t, z))
    g.add(cylinder(0.012, 0.008, dark, x, t + 0.004, z))
  }
  // Scale strip along the base and the motor housing on the side.
  g.add(box(0.36, 0.02, 0.004, std('#e8e2c8'), 0, 0.02, D / 2 + 0.003))
  g.add(box(0.12, 0.1, 0.16, std('#3a3f44', { metalness: 0.4 }), W / 2 + 0.06, 0.05, -0.05))
  return g
}

function chinRest(): THREE.Group {
  const g = new THREE.Group()
  const metal = std('#9aa0a6', { metalness: 0.6, roughness: 0.35 })
  g.add(cylinder(0.07, 0.015, metal, 0, 0.0075, 0))
  g.add(cylinder(0.012, 0.3, metal, 0, 0.16, 0))
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.03, 24), std('#2c2c2c'))
  cup.position.y = 0.32
  g.add(cup)
  return g
}

/** Flicker-fusion eye-fatigue reader: cabinet with a viewing hood, frequency dial and switches. */
function eyeFatigueTester(): THREE.Group {
  const g = new THREE.Group()
  const body = std('#d8d4c8')
  const black = std('#1d1d1f')
  const W = 0.42, H = 0.24, D = 0.32
  g.add(box(W, H, D, body, 0, H / 2, 0))
  // Viewing hood with the flicker lamp inside, facing the subject (+z).
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.12, 24, 1, true), black)
  hood.material.side = THREE.DoubleSide
  hood.rotation.x = Math.PI / 2
  hood.position.set(-0.09, 0.15, D / 2 + 0.06)
  g.add(hood)
  const lamp = cylinder(0.04, 0.01, new THREE.MeshStandardMaterial({ color: '#ffd76a', emissive: '#ffb020', emissiveIntensity: 0.8 }))
  lamp.rotation.x = Math.PI / 2
  lamp.position.set(-0.09, 0.15, D / 2 + 0.005)
  g.add(lamp)
  // Frequency dial and scale.
  const dial = cylinder(0.045, 0.02, black)
  dial.rotation.x = Math.PI / 2
  dial.position.set(0.11, 0.14, D / 2 + 0.01)
  g.add(dial)
  g.add(box(0.012, 0.03, 0.006, std('#f2f2f2'), 0.11, 0.165, D / 2 + 0.022)) // pointer
  g.add(box(0.13, 0.025, 0.004, std('#f7f3e3'), 0.11, 0.205, D / 2 + 0.002)) // Hz scale
  // Power and stop switches.
  g.add(box(0.025, 0.02, 0.02, std('#c4372b'), 0.06, 0.05, D / 2 + 0.01))
  g.add(box(0.025, 0.02, 0.02, std('#2f6f3e'), 0.16, 0.05, D / 2 + 0.01))
  // Hand-held stop button on its cable.
  g.add(box(0.05, 0.03, 0.09, black, 0.12, 0.015, D / 2 + 0.16))
  return g
}

/**
 * Cord binder: the wooden peg board resting against the wall (faces +x), its foot on the
 * table, with a coil of cord beside it. Mirrors the board in the experiment (CordBindingTask).
 */
function cordBinder(): THREE.Group {
  const g = new THREE.Group()
  const wood = std('#b98a55', { roughness: 0.85 })
  const pegWood = std('#d9b27a')
  const cordMat = std('#c9a24a', { roughness: 0.9 })
  const W = 1.0, H = 0.56, D = 0.03
  const board = new THREE.Group()
  board.add(box(D, H, W, wood))
  for (const [px, py] of BINDER_PEGS) {
    const peg = cylinder(0.011, 0.085, pegWood, D / 2 + 0.0425, py, -px)
    peg.rotation.z = Math.PI / 2
    board.add(peg)
  }
  // Lean the top back against the wall (−x), foot on the table.
  const lean = 0.2
  board.rotation.z = lean
  board.position.set(0.12 - Math.sin(lean) * H / 2, Math.cos(lean) * H / 2, 0)
  g.add(board)
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 32), cordMat)
  coil.rotation.x = Math.PI / 2
  coil.position.set(0.3, 0.008, 0.55)
  g.add(coil)
  return g
}

/** Legs for a table top that has none in the Blender model. */
function addLegs(scene: THREE.Object3D, table: ReturnType<typeof tableTop>) {
  if (!table) return
  const legH = table.box.min.y
  if (legH < 0.2) return
  const mat = std('#d8d3bf')
  const inset = 0.08
  for (const x of [table.box.min.x + inset, table.box.max.x - inset]) {
    for (const z of [table.box.min.z + inset, table.box.max.z - inset]) {
      const leg = box(0.07, legH, 0.07, mat, x, legH / 2, z)
      leg.name = 'Table Leg Prop'
      scene.add(leg)
    }
  }
}

/** Places the apparatus models. Called before colliders are built. */
export function addLabProps(
  scene: THREE.Object3D,
  depthTable: string,
  chinRestTable: string,
  fatigueTable: string,
  cordTable: string,
) {
  const cord = tableTop(scene, cordTable)
  if (cord) {
    addLegs(scene, cord)
    const binder = cordBinder()
    // Against the west wall (min x), centred along the table.
    binder.position.set(cord.box.min.x + 0.03, cord.y, cord.z)
    binder.name = 'Cord Binder Prop'
    scene.add(binder)
  }

  // The tester sits at the south (+z) end of its table; the chin rest is at the far (north)
  // end of the table joined to it, so the subject looks along both tables at the box.
  const depth = tableTop(scene, depthTable)
  const restTable = tableTop(scene, chinRestTable)
  if (depth) {
    const tester = depthTester()
    tester.position.set(depth.x, depth.y, depth.box.max.z - 0.35)
    tester.rotation.y = Math.PI // window faces north, towards the chin rest
    tester.name = 'Depth Tester Prop'
    scene.add(tester)
  }
  if (restTable) {
    const rest = chinRest()
    rest.position.set(restTable.x, restTable.y, restTable.box.min.z + 0.15)
    rest.name = 'Chin Rest Prop'
    scene.add(rest)
  }

  const fatigue = tableTop(scene, fatigueTable)
  if (fatigue) {
    const reader = eyeFatigueTester()
    reader.position.set(fatigue.x, fatigue.y, fatigue.z)
    reader.name = 'Eye Fatigue Tester Prop'
    scene.add(reader)
  }
}
