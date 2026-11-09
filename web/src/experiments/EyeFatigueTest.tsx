import { useEffect, useRef, useState } from 'react'
import { fatigueValue, mean } from './analysis'
import { useKeyPress } from './input'

// Simulated eye-fatigue (flicker-fusion) reader. A monitor refreshing at 60 Hz cannot show
// flicker at the 25–50 Hz the real reader uses, so the lamp starts perfectly steady (high
// frequency) and the dial frequency then falls; a visible flicker fades in as it drops, and the
// subject presses Space the moment the flicker first appears.
const START_HZ = 50 // lamp looks steady
const END_HZ = 20 // lowest frequency; reached only if the subject never presses
const HZ_PER_SECOND = 2.5
const VISIBLE_FLICKER_HZ = 9
export const READINGS_PER_TEST = 5

function contrastAt(hz: number) {
  return hz <= END_HZ ? 1 : ((START_HZ - hz) / (START_HZ - END_HZ)) ** 2
}

interface Props {
  when: 'before' | 'after' | 'standalone'
  onDone: (readings: number[]) => void
}

export default function EyeFatigueTest({ when, onDone }: Props) {
  const [readings, setReadings] = useState<number[]>([])
  const [running, setRunning] = useState(false)
  const lamp = useRef<HTMLDivElement>(null)
  const hz = useRef(START_HZ)
  const finished = readings.length >= READINGS_PER_TEST

  const record = (value: number) => {
    setRunning(false)
    setReadings((r) => [...r, Math.round(value)])
  }

  useEffect(() => {
    if (!running) return
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = (now - t0) / 1000
      hz.current = START_HZ - t * HZ_PER_SECOND
      if (hz.current <= END_HZ) {
        record(END_HZ)
        return
      }
      const on = Math.floor(t * VISIBLE_FLICKER_HZ * 2) % 2 === 0
      if (lamp.current) lamp.current.style.opacity = String(on ? 1 : 1 - 0.85 * contrastAt(hz.current))
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [running])

  const press = () => {
    if (finished) return
    if (running) record(hz.current)
    else setRunning(true)
  }
  useKeyPress(['Space'], press)

  return (
    <div className="fatigue-test">
      <div className="fatigue-intro">
        <h2>{when === 'standalone' ? 'Eye fatigue readings' : `Eye fatigue reading: ${when} the trials`}</h2>
        <p>
          Press <kbd>Space</kbd> to start. The lamp begins steady; its frequency then falls. Press{' '}
          <kbd>Space</kbd> again <strong>the moment you first see it flicker</strong>.
          Take {READINGS_PER_TEST} readings.
        </p>
      </div>

      <div className="lamp-box" onClick={press} role="button" aria-label={running ? 'Light starts to flicker' : 'Start reading'}>
        <div ref={lamp} className={`lamp${running ? ' on' : ''}`} />
        <div className="lamp-caption">
          {finished ? 'All readings taken'
            : running ? 'Press Space the moment the light starts to flicker'
            : `Reading ${readings.length + 1} of ${READINGS_PER_TEST}: press Space to start`}
        </div>
      </div>

      <table className="fatigue-readings">
        <thead><tr><th>#</th><th>Reading (Hz)</th><th>Fatigue value (60 − r)</th></tr></thead>
        <tbody>
          {Array.from({ length: READINGS_PER_TEST }, (_, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{readings[i] ?? '–'}</td>
              <td>{readings[i] !== undefined ? fatigueValue(readings[i]) : '–'}</td>
            </tr>
          ))}
          {finished && (
            <tr className="total">
              <td>Avg</td>
              <td>{mean(readings).toFixed(1)}</td>
              <td>{mean(readings.map(fatigueValue)).toFixed(1)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="row gap">
        {readings.length > 0 && !running && !finished && (
          <button className="btn secondary" onClick={() => setReadings((r) => r.slice(0, -1))}>Redo last reading</button>
        )}
        {finished && <button className="btn" onClick={() => onDone(readings)}>Continue</button>}
      </div>
      <p className="small muted">
        Simulated reader: a normal screen can't display true flicker-fusion frequencies, so this
        approximates the real instrument.
      </p>
    </div>
  )
}
