import { useCallback, useEffect, useState } from 'react'
import { DEMO } from '../lib/api'
import { summarize } from './analysis'
import DataSheet from './DataSheet'
import { deleteRecord, downloadRecordCsv, loadRecords, type ExperimentRecord } from './records'

/** Past runs (saved to the student's account, or this browser in the demo build). */
export default function RecordsPanel({ onClose }: { onClose: () => void }) {
  const [records, setRecords] = useState<ExperimentRecord[] | null>(null)
  const [error, setError] = useState('')
  const [open, setOpen] = useState<ExperimentRecord | null>(null)

  const load = useCallback(() => {
    setError('')
    loadRecords().then(setRecords).catch((e: Error) => setError(e.message))
  }, [])
  useEffect(load, [load])

  const remove = async (r: ExperimentRecord) => {
    if (!confirm(`Delete this ${r.title} record? This cannot be undone.`)) return
    try {
      await deleteRecord(r.id)
      setOpen(null)
      load()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="exp-shell">
      <header className="exp-header">
        <strong>My Records</strong>
        {open && <button className="btn link" onClick={() => setOpen(null)}>← All records</button>}
        <span className="spacer" />
        <button className="btn secondary small" onClick={onClose}>Back to lab</button>
      </header>
      <div className="exp-body">
        <div className="exp-doc">
          {error && (
            <p className="error">
              {error} <button className="btn link" onClick={load}>Try again</button>
            </p>
          )}
          {open ? (
            <>
              <div className="row gap wrap no-print">
                <button className="btn" onClick={() => downloadRecordCsv(open)}>Download CSV</button>
                <button className="btn secondary" onClick={() => window.print()}>Print / save as PDF</button>
                <span className="spacer" />
                <button className="btn secondary" onClick={() => remove(open)}>Delete</button>
              </div>
              <DataSheet record={open} />
            </>
          ) : records === null ? (
            !error && <p className="muted">Loading your records…</p>
          ) : records.length === 0 ? (
            <p className="muted">No records yet. Complete an experiment at one of the stations and it will appear here.</p>
          ) : (
            <>
              <p className="muted small">
                {DEMO
                  ? 'Saved in this browser only. Download a CSV to keep a copy.'
                  : 'Saved to your account. Your professor can see these results.'}
              </p>
              <RecordTable records={records} onView={setOpen} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function RecordTable<R extends ExperimentRecord>({
  records,
  onView,
  onCsv = (r) => downloadRecordCsv(r),
  studentColumn,
}: {
  records: R[]
  onView: (r: R) => void
  onCsv?: (r: R) => void
  studentColumn?: (r: R) => string
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {studentColumn && <th>Student</th>}
            <th>Experiment</th><th>Date</th><th>Trials</th><th>Learning rate</th><th></th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => {
            const fit = summarize(r.trials, r.metric, r.fatigueBefore, r.fatigueAfter).fit
            return (
              <tr key={`${studentColumn?.(r) ?? ''}${r.id}`}>
                {studentColumn && <td>{studentColumn(r)}</td>}
                <td>{r.title}</td>
                <td>{new Date(r.createdAt).toLocaleString()}</td>
                <td>{r.trials.length || '–'}</td>
                <td>{fit ? `${(fit.learningRate * 100).toFixed(1)}%` : '–'}</td>
                <td className="actions">
                  <button className="btn small" onClick={() => onView(r)}>View</button>
                  <button className="btn small secondary" onClick={() => onCsv(r)}>CSV</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
