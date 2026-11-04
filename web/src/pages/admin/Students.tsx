import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../lib/api'
import { downloadCsv, parseStudentCsv } from '../../lib/csv'
import type { StudentRow } from '../../lib/types'

interface Credential {
  roll_no: string
  name: string
  password?: string
  error?: string
}

const adminCall = <T,>(body: Record<string, unknown>) => api<T>('admin', { body })

export default function Students() {
  const [students, setStudents] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [credentials, setCredentials] = useState<Credential[]>([])

  const [roll, setRoll] = useState('')
  const [name, setName] = useState('')
  const [pending, setPending] = useState<{ roll_no: string; name: string }[]>([])

  const load = useCallback(async () => {
    try {
      const { students } = await api<{ students: StudentRow[] }>('admin')
      setStudents(students)
    } catch (e) {
      setError((e as Error).message)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) => s.roll_no.toLowerCase().includes(q) || s.name.toLowerCase().includes(q))
  }, [students, query])

  async function createStudents(list: { roll_no: string; name: string }[]) {
    setBusy(true)
    setError('')
    try {
      const { results } = await adminCall<{ results: (Credential & { ok: boolean })[] }>({
        action: 'create_students',
        students: list,
      })
      setCredentials(results)
      await load()
      return true
    } catch (e) {
      setError((e as Error).message)
      return false
    } finally {
      setBusy(false)
    }
  }

  async function onAddOne(e: FormEvent) {
    e.preventDefault()
    if (await createStudents([{ roll_no: roll, name }])) {
      setRoll('')
      setName('')
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = parseStudentCsv(await file.text())
    if (parsed.length === 0) setError('No rows found. Expected columns: roll_no,name')
    else setError('')
    setPending(parsed)
  }

  async function onConfirmUpload() {
    if (await createStudents(pending)) setPending([])
  }

  async function onReset(s: StudentRow) {
    if (!confirm(`Reset password for ${s.roll_no}? They will have to set a new one at next login.`)) return
    setBusy(true)
    setError('')
    try {
      const { password } = await adminCall<{ password: string }>({ action: 'reset_password', user_id: s.id })
      setCredentials([{ roll_no: s.roll_no, name: s.name, password }])
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onToggleActive(s: StudentRow) {
    setBusy(true)
    setError('')
    try {
      await adminCall({ action: 'set_active', user_id: s.id, active: !s.active })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function onDelete(s: StudentRow) {
    const what = s.record_count ? ` and their ${s.record_count} saved record${s.record_count > 1 ? 's' : ''}` : ''
    if (!confirm(`Delete ${s.roll_no}${what}? This cannot be undone.`)) return
    setBusy(true)
    setError('')
    try {
      await adminCall({ action: 'delete_student', user_id: s.id })
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card wide">
        <h2>Students</h2>
        <div className="row gap wrap">
          <form className="row gap wrap" onSubmit={onAddOne}>
            <input placeholder="Roll number" value={roll} onChange={(e) => setRoll(e.target.value)} required />
            <input placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn" disabled={busy}>Add student</button>
          </form>
          <span className="spacer" />
          <label className="btn secondary file-btn">
            Upload CSV
            <input type="file" accept=".csv,text/csv" onChange={onFile} hidden />
          </label>
        </div>
        <p className="muted small">CSV format: <code>roll_no,name</code> (header row optional).</p>
        {error && <p className="error">{error}</p>}
      </section>

      {pending.length > 0 && (
        <section className="card wide">
          <h3>Confirm upload: {pending.length} students</h3>
          <div className="table-wrap short">
            <table>
              <thead><tr><th>Roll number</th><th>Name</th></tr></thead>
              <tbody>
                {pending.map((p, i) => <tr key={i}><td>{p.roll_no}</td><td>{p.name}</td></tr>)}
              </tbody>
            </table>
          </div>
          <div className="row gap">
            <button className="btn" disabled={busy} onClick={onConfirmUpload}>
              {busy ? 'Creating accounts…' : 'Create accounts'}
            </button>
            <button className="btn secondary" disabled={busy} onClick={() => setPending([])}>Cancel</button>
          </div>
        </section>
      )}

      {credentials.length > 0 && (
        <section className="card wide notice">
          <h3>Temporary passwords</h3>
          <p className="small">
            Share these with the students now. They are shown only once; students must set
            their own password at first login.
          </p>
          <div className="table-wrap short">
            <table>
              <thead><tr><th>Roll number</th><th>Name</th><th>Temporary password</th></tr></thead>
              <tbody>
                {credentials.map((c, i) => (
                  <tr key={i}>
                    <td>{c.roll_no}</td>
                    <td>{c.name}</td>
                    <td>{c.password ? <code>{c.password}</code> : <span className="error">{c.error}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row gap">
            <button
              className="btn"
              onClick={() => downloadCsv('wsd-lab-credentials.csv', [
                ['roll_no', 'name', 'temporary_password'],
                ...credentials.filter((c) => c.password).map((c) => [c.roll_no, c.name, c.password!]),
              ])}
            >
              Download CSV
            </button>
            <button className="btn secondary" onClick={() => setCredentials([])}>Dismiss</button>
          </div>
        </section>
      )}

      <section className="card wide">
        <div className="row gap">
          <h3>{students.length} students</h3>
          <span className="spacer" />
          <input placeholder="Search roll no. or name" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="muted">No students yet. Add one above or upload a CSV.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Roll number</th><th>Name</th><th>Status</th><th>Records</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} className={s.active ? '' : 'disabled'}>
                    <td>{s.roll_no}</td>
                    <td>{s.name}</td>
                    <td>
                      {!s.active ? <span className="tag off">Disabled</span>
                        : s.must_change_pw ? <span className="tag">Not logged in yet</span>
                        : <span className="tag ok">Active</span>}
                    </td>
                    <td>
                      {s.record_count
                        ? <Link to={`/admin/results?student=${encodeURIComponent(s.roll_no)}`}>{s.record_count}</Link>
                        : <span className="muted">0</span>}
                    </td>
                    <td className="actions">
                      <button className="btn small secondary" disabled={busy} onClick={() => onReset(s)}>Reset password</button>
                      <button className="btn small secondary" disabled={busy} onClick={() => onToggleActive(s)}>
                        {s.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn small secondary" disabled={busy} onClick={() => onDelete(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
