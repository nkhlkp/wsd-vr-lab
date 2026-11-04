import { useEffect, useState } from 'react'
import { formatValue } from './analysis'
import DataSheet from './DataSheet'
import EyeFatigueTest from './EyeFatigueTest'
import LearningCurveChart from './LearningCurveChart'
import { downloadRecordCsv, newRecordId, RECORDS_WHERE, saveRecord, type ExperimentRecord } from './records'
import type { ExperimentConfig, Trial, TrialResult } from './types'

type Phase = 'intro' | 'fatigue-before' | 'trials' | 'fatigue-after' | 'results'

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'intro', label: 'Briefing' },
  { phase: 'fatigue-before', label: 'Eye fatigue (before)' },
  { phase: 'trials', label: 'Trials' },
  { phase: 'fatigue-after', label: 'Eye fatigue (after)' },
  { phase: 'results', label: 'Results' },
]

const MIN_TRIALS_TO_FINISH = 3

interface Props {
  config: ExperimentConfig
  onExit: () => void
  onShowRecords: () => void
}

export default function ExperimentRunner({ config, onExit, onShowRecords }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [target, setTarget] = useState(config.defaultTrials)
  const [withFatigue, setWithFatigue] = useState(true)
  const [fatigueBefore, setFatigueBefore] = useState<number[]>([])
  const [trials, setTrials] = useState<Trial[]>([])
  const [record, setRecord] = useState<ExperimentRecord | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)

  // Keyboard-driven phases: don't let Space/Enter re-press the button that was just clicked.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.()
  }, [phase])

  const steps = STEPS.filter((s) => withFatigue || !s.phase.startsWith('fatigue'))
  const inProgress = phase !== 'intro' && phase !== 'results'

  function finish(allTrials: Trial[], after: number[]) {
    const r: ExperimentRecord = {
      id: newRecordId(),
      experimentId: config.id,
      title: config.title,
      createdAt: new Date().toISOString(),
      metric: config.metric,
      fatigueBefore: withFatigue ? fatigueBefore : [],
      fatigueAfter: after,
      trials: allTrials,
    }
    setSaved(null)
    saveRecord(r).then(setSaved)
    setRecord(r)
    setPhase('results')
  }

  function endTrials(allTrials: Trial[]) {
    if (withFatigue) setPhase('fatigue-after')
    else finish(allTrials, [])
  }

  function onTrialComplete(result: TrialResult) {
    const next = [...trials, { n: trials.length + 1, ...result }]
    setTrials(next)
    if (next.length >= target) endTrials(next)
  }

  function restart() {
    setTrials([])
    setFatigueBefore([])
    setRecord(null)
    setPhase('intro')
  }

  function exit() {
    if (inProgress && !confirm('Leave this experiment? The readings taken so far will be lost.')) return
    onExit()
  }

  const { Task } = config

  return (
    <div className="exp-shell">
      <header className="exp-header">
        <strong>{config.title}</strong>
        <ol className="steps">
          {steps.map((s) => (
            <li key={s.phase} className={s.phase === phase ? 'current' : ''}>{s.label}</li>
          ))}
        </ol>
        <span className="spacer" />
        <button className="btn secondary small" onClick={exit}>Back to lab</button>
      </header>

      <div className="exp-body">
        {phase === 'intro' && (
          <div className="exp-doc">
            <section>
              <h3>Objectives</h3>
              <ol>{config.objectives.map((o) => <li key={o}>{o}</li>)}</ol>
            </section>
            <section>
              <h3>Equipment</h3>
              <ul>{config.equipment.map((o) => <li key={o}>{o}</li>)}</ul>
            </section>
            <section>
              <h3>Procedure</h3>
              <ol>{config.procedure.map((o) => <li key={o}>{o}</li>)}</ol>
            </section>
            <section>
              <h3>Controls</h3>
              <ControlsList controls={config.controls} />
            </section>
            <section className="card wide options">
              <label className="inline">
                Number of trials
                <select value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                  {config.trialOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
              <label className="inline">
                <input type="checkbox" checked={withFatigue} onChange={(e) => setWithFatigue(e.target.checked)} />
                Take eye-fatigue readings before and after
              </label>
              <button className="btn" onClick={() => setPhase(withFatigue ? 'fatigue-before' : 'trials')}>
                Start experiment
              </button>
            </section>
          </div>
        )}

        {phase === 'fatigue-before' && (
          <div className="exp-doc">
            <EyeFatigueTest when="before" onDone={(r) => { setFatigueBefore(r); setPhase('trials') }} />
          </div>
        )}

        {phase === 'trials' && (
          <div className="exp-task">
            <Task trialNo={trials.length + 1} totalTrials={target} onComplete={onTrialComplete} />
            <aside className="exp-side">
              <h3>Trial {Math.min(trials.length + 1, target)} of {target}</h3>
              <ControlsList controls={config.controls} />
              <div className="table-wrap trial-log">
                <table>
                  <thead><tr><th>#</th><th>{config.metric.label}</th><th>Faulty</th></tr></thead>
                  <tbody>
                    {trials.map((t) => (
                      <tr key={t.n} className={t.faulty ? 'faulty' : ''} title={t.note}>
                        <td>{t.n}</td>
                        <td>{formatValue(t.value, config.metric)}</td>
                        <td>
                          <input
                            type="checkbox"
                            checked={t.faulty}
                            aria-label={`Mark trial ${t.n} faulty`}
                            onChange={() => setTrials((all) => all.map((x) => x.n === t.n ? { ...x, faulty: !x.faulty } : x))}
                          />
                        </td>
                      </tr>
                    ))}
                    {trials.length === 0 && (
                      <tr><td colSpan={3} className="muted">Readings appear here.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {trials.length >= 2 && <LearningCurveChart trials={trials} metric={config.metric} />}
              {trials.length >= MIN_TRIALS_TO_FINISH && trials.length < target && (
                <button className="btn secondary" onClick={() => endTrials(trials)}>
                  Finish after {trials.length} trials
                </button>
              )}
            </aside>
          </div>
        )}

        {phase === 'fatigue-after' && (
          <div className="exp-doc">
            <EyeFatigueTest when="after" onDone={(r) => finish(trials, r)} />
          </div>
        )}

        {phase === 'results' && record && (
          <div className="exp-doc">
            <div className="row gap wrap no-print">
              <button className="btn" onClick={() => downloadRecordCsv(record)}>Download CSV</button>
              <button className="btn secondary" onClick={() => window.print()}>Print / save as PDF</button>
              <button className="btn secondary" onClick={restart}>Run again</button>
              <button className="btn secondary" onClick={onShowRecords}>All my records</button>
              <span className="spacer" />
              <span className="small muted">
                {saved === null ? 'Saving to My Records…' : saved ? `Saved to My Records ${RECORDS_WHERE}.` : 'Could not save the record; download the CSV to keep your readings.'}
              </span>
            </div>
            <DataSheet record={record} />
          </div>
        )}
      </div>
    </div>
  )
}

function ControlsList({ controls }: { controls: [string, string][] }) {
  return (
    <ul className="controls">
      {controls.map(([keys, action]) => (
        <li key={keys}>
          {keys.split(' / ').map((k, i) => (
            <span key={k}>{i > 0 && ' / '}<kbd>{k}</kbd></span>
          ))}{' '}
          {action}
        </li>
      ))}
    </ul>
  )
}
