// Completed experiment runs, kept so students can come back to their readings when writing
// the report.
import { api, ApiError, DEMO } from '../lib/api'
import { downloadCsv } from '../lib/csv'
import { fatigueValue, mean, summarize } from './analysis'
import type { Metric, Trial } from './types'

export interface ExperimentRecord {
  id: string
  experimentId: string
  title: string
  createdAt: string
  metric: Metric
  /** Raw eye-fatigue reader values (fatigue value = 60 − reading). */
  fatigueBefore: number[]
  fatigueAfter: number[]
  trials: Trial[]
}

/** A record as the professor sees it: with the student who saved it. */
export interface StudentRecord extends ExperimentRecord {
  student: { id: number; roll_no: string; name: string }
}

// Signed in: records are saved to the student's account. Demo build: this browser only.
const KEY = 'wsd-lab-records-v1'

function loadLocal(): ExperimentRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function storeLocal(records: ExperimentRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
    return true
  } catch {
    return false
  }
}

export async function loadRecords(): Promise<ExperimentRecord[]> {
  if (DEMO) return loadLocal()
  return (await api<{ records: ExperimentRecord[] }>('records')).records
}

/** Every student's records (professor only). */
export async function loadAllRecords(): Promise<StudentRecord[]> {
  return (await api<{ records: StudentRecord[] }>('records')).records
}

/** Resolves false if the record could not be saved (offline, private mode...). */
export async function saveRecord(record: ExperimentRecord): Promise<boolean> {
  if (DEMO) return storeLocal([record, ...loadLocal().filter((r) => r.id !== record.id)])
  // One retry covers a brief network blip at the end of a long run.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await api('records', { body: { record } })
      return true
    } catch (e) {
      if (e instanceof ApiError && e.status !== 0 && e.status < 500) return false
    }
  }
  return false
}

export async function deleteRecord(id: string) {
  if (DEMO) storeLocal(loadLocal().filter((r) => r.id !== id))
  else await api(`records?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
}

export const RECORDS_WHERE = DEMO ? 'in this browser' : 'to your account'

export function newRecordId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function downloadRecordCsv(r: ExperimentRecord, student?: { roll_no: string; name: string }) {
  const s = summarize(r.trials, r.metric, r.fatigueBefore, r.fatigueAfter)
  const rows: (string | number)[][] = [
    ['Experiment', r.title],
    ...(student ? [['Student', `${student.roll_no} ${student.name}`.trim()]] : []),
    ['Date', new Date(r.createdAt).toLocaleString()],
    [],
  ]
  if (r.fatigueBefore.length || r.fatigueAfter.length) {
    rows.push(['Eye fatigue', 'Reading before', 'Fatigue value before', 'Reading after', 'Fatigue value after'])
    const n = Math.max(r.fatigueBefore.length, r.fatigueAfter.length)
    for (let i = 0; i < n; i++) {
      const b = r.fatigueBefore[i]
      const a = r.fatigueAfter[i]
      rows.push([i + 1, b ?? '', b !== undefined ? fatigueValue(b) : '', a ?? '', a !== undefined ? fatigueValue(a) : ''])
    }
    rows.push([
      'Average',
      r.fatigueBefore.length ? mean(r.fatigueBefore).toFixed(1) : '',
      s.fatigueBefore?.toFixed(1) ?? '',
      r.fatigueAfter.length ? mean(r.fatigueAfter).toFixed(1) : '',
      s.fatigueAfter?.toFixed(1) ?? '',
    ])
    rows.push([])
  }
  if (r.trials.length) rows.push(['Trial no.', `${r.metric.label} (${r.metric.unit})`, 'Remarks'])
  for (const t of r.trials) {
    rows.push([t.n, t.value.toFixed(2), [t.faulty ? 'Faulty' : '', t.note ?? ''].filter(Boolean).join('; ')])
  }
  if (s.fit) {
    rows.push([])
    rows.push(['Fitted curve', `y = ${s.fit.a.toFixed(3)} * n^${s.fit.b.toFixed(3)}`])
    rows.push(['Learning rate', `${(s.fit.learningRate * 100).toFixed(1)}%`])
  }
  const date = r.createdAt.slice(0, 10)
  downloadCsv(`${student ? `${student.roll_no}-` : ''}${r.experimentId}-${date}.csv`, rows)
}
