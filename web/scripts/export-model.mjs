// Re-exports ../WSDLab.blend to public/models/lab.glb using headless Blender.
// Set BLENDER_PATH if Blender is not at the default Windows location or on PATH.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const candidates = [
  process.env.BLENDER_PATH,
  'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe',
  'blender',
].filter(Boolean)
const blender = candidates.find((p) => p === 'blender' || existsSync(p))

const result = spawnSync(
  blender,
  [
    '-b', path.join(root, 'WSDLab.blend'),
    '--python', path.join(root, 'blender', 'export_glb.py'),
    '--', path.join(root, 'web', 'public', 'models', 'lab.glb'),
  ],
  { stdio: 'inherit' },
)
process.exit(result.status ?? 1)
