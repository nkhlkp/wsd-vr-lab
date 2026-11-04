import { useEffect, useState } from 'react'
import DataSheet from './DataSheet'
import EyeFatigueTest, { READINGS_PER_TEST } from './EyeFatigueTest'
import { downloadRecordCsv, newRecordId, RECORDS_WHERE, saveRecord, type ExperimentRecord } from './records'

type Phase = 'intro' | 'test' | 'results'

const STEPS: { phase: Phase; label: string }[] = [
  { phase: 'intro', label: 'Briefing' },
  { phase: 'test', label: 'Readings' },
  { phase: 'results', label: 'Results' },
]

const TITLE = 'Eye Fatigue Tester'

/** Stand-alone station at the eye-fatigue reader: one set of readings, saved like any run. */
export default function EyeFatigueStation({ onExit, onShowRecords }: { onExit: () => void; onShowRecords: () => void }) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [record, setRecord] = useState<ExperimentRecord | null>(null)
  const [saved, setSaved] = useState<boolean | null>(null)
  const [run, setRun] = useState(0)

  // Space drives the reader: don't let it re-press the button that was just clicked.
  useEffect(() => {
    (document.activeElement as HTMLElement | null)?.blur?.()
  }, [phase])

  function finish(readings: number[]) {
    const r: ExperimentRecord = {
      id: newRecordId(),
      experimentId: 'eye-fatigue',
      title: TITLE,
      createdAt: new Date().toISOString(),
      metric: { label: 'Reading', unit: 'Hz', kind: 'time' },
      fatigueBefore: readings,
      fatigueAfter: [],
      trials: [],
    }
    setSaved(null)
    saveRecord(r).then(setSaved)
    setRecord(r)
    setPhase('results')
  }

  function exit() {
    if (phase === 'test' && !confirm('Leave the eye-fatigue tester? The readings taken so far will be lost.')) return
    onExit()
  }

  return (
    <div className="exp-shell">
      <header className="exp-header">
        <strong>{TITLE}</strong>
        <ol className="steps">
          {STEPS.map((s) => <li key={s.phase} className={s.phase === phase ? 'current' : ''}>{s.label}</li>)}
        </ol>
        <span className="spacer" />
        <button className="btn secondary small" onClick={exit}>Back to lab</button>
      </header>

      <div className="exp-body">
        {phase === 'intro' && (
          <div className="exp-doc">
            <section>
              <h3>Objective</h3>
              <ol><li>To measure the eye-fatigue level of the subject with the flicker-fusion (eye-fatigue) reader.</li></ol>
            </section>
            <section>
              <h3>Equipment</h3>
              <ul><li>Eye-fatigue reader (flicker lamp, frequency dial, stop button)</li></ul>
            </section>
            <section>
              <h3>Procedure</h3>
              <ol>
                <li>Sit in front of the reader and look steadily at the lamp through the viewing hood.</li>
                <li>Start the lamp. Its frequency rises from a visible flicker; press the stop button the moment the light looks steady.</li>
                <li>The dial reading (Hz) is noted. Fatigue value = 60 − reading: a lower reading means more tired eyes.</li>
                <li>Take {READINGS_PER_TEST} readings and average them.</li>
              </ol>
            </section>
            <p className="muted small">
              The same readings are taken before and after every experiment at the other stations. Use this station to
              practise the reader or to take a separate set of readings.
            </p>
            <div>
              <button className="btn" onClick={() => setPhase('test')}>Start readings</button>
            </div>
          </div>
        )}

        {phase === 'test' && (
          <div className="exp-doc">
            <EyeFatigueTest key={run} when="standalone" onDone={finish} />
          </div>
        )}

        {phase === 'results' && record && (
          <div className="exp-doc">
            <div className="row gap wrap no-print">
              <button className="btn" onClick={() => downloadRecordCsv(record)}>Download CSV</button>
              <button className="btn secondary" onClick={() => window.print()}>Print / save as PDF</button>
              <button className="btn secondary" onClick={() => { setRun((n) => n + 1); setRecord(null); setPhase('test') }}>
                Take again
              </button>
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
