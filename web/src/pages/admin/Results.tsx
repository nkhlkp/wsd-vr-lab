import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { downloadCsv } from '../../lib/csv'
import { mean, summarize } from '../../experiments/analysis'
import DataSheet from '../../experiments/DataSheet'
import { RecordTable } from '../../experiments/RecordsPanel'
import { downloadRecordCsv, loadAllRecords, type StudentRecord } from '../../experiments/records'

const who = (r: StudentRecord) => `${r.student.roll_no}${r.student.name ? ` · ${r.student.name}` : ''}`

/** Every student's saved runs, for marking. */
export default function Results() {
  const [params, setParams] = useSearchParams()
  const [records, setRecords] = useState<StudentRecord[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<StudentRecord | null>(null)
  const query = params.get('student') ?? ''
  const experiment = params.get('experiment') ?? ''

  useEffect(() => {
    loadAllRecords().then(setRecords).catch((e: Error) => setError(e.message))
  }, [])

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const experiments = useMemo(
    () => [...new Map((records ?? []).map((r) => [r.experimentId, r.title])).entries()],
    [records],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (records ?? []).filter((r) =>
      (!experiment || r.experimentId === experiment)
      && (!q || r.student.roll_no.toLowerCase().includes(q) || r.student.name.toLowerCase().includes(q)))
  }, [records, query, experiment])

  function downloadSummary() {
    const fmt = (x: number | null | undefined, d = 2) => (x === null || x === undefined ? '' : x.toFixed(d))
    downloadCsv('wsd-lab-results.csv', [
      ['roll_no', 'name', 'experiment', 'date', 'trials', 'faulty', 'mean value', 'unit', 'learning rate %',
        'fatigue value before', 'fatigue value after'],
      ...filtered.map((r) => {
        const s = summarize(r.trials, r.metric, r.fatigueBefore, r.fatigueAfter)
        const valid = r.trials.filter((t) => !t.faulty).map((t) => t.value)
        return [
          r.student.roll_no, r.student.name, r.title, new Date(r.createdAt).toLocaleString(),
          r.trials.length, r.trials.filter((t) => t.faulty).length,
          valid.length ? fmt(mean(valid)) : '', r.trials.length ? r.metric.unit : '',
          s.fit ? fmt(s.fit.learningRate * 100, 1) : '', fmt(s.fatigueBefore, 1), fmt(s.fatigueAfter, 1),
        ]
      }),
    ])
  }

  if (open) {
    return (
      <section className="card wide">
        <div className="row gap wrap no-print">
          <button className="btn link" onClick={() => setOpen(null)}>← All results</button>
          <span className="spacer" />
          <button className="btn" onClick={() => downloadRecordCsv(open, open.student)}>Download CSV</button>
          <button className="btn secondary" onClick={() => window.print()}>Print / save as PDF</button>
        </div>
        <h2>{who(open)}</h2>
        <DataSheet record={open} />
      </section>
    )
  }

  return (
    <section className="card wide">
      <div className="row gap wrap">
        <h2>Results</h2>
        <span className="spacer" />
        <input placeholder="Search roll no. or name" value={query} onChange={(e) => setFilter('student', e.target.value)} />
        <select value={experiment} onChange={(e) => setFilter('experiment', e.target.value)}>
          <option value="">All experiments</option>
          {experiments.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
        </select>
        <button className="btn secondary" disabled={!filtered.length} onClick={downloadSummary}>Download summary CSV</button>
      </div>
      {error && <p className="error">{error}</p>}
      {records === null ? (
        !error && <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="muted">{records.length ? 'No results match the filter.' : 'No student has saved a run yet.'}</p>
      ) : (
        <>
          <p className="muted small">{filtered.length} run{filtered.length > 1 ? 's' : ''}, newest first.</p>
          <RecordTable
            records={filtered}
            onView={setOpen}
            onCsv={(r) => downloadRecordCsv(r, r.student)}
            studentColumn={who}
          />
        </>
      )}
    </section>
  )
}
