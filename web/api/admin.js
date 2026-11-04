// Professor-only account management.
// GET  /api/admin                                   -> { students }
// POST /api/admin { action: 'create_students', students: [{ roll_no, name }] } -> { results }
// POST /api/admin { action: 'reset_password', user_id }                       -> { password }
// POST /api/admin { action: 'set_active', user_id, active }
// POST /api/admin { action: 'delete_student', user_id }
import { HttpError, handle, hashPassword, json, normalizeRoll, readJson, requireUser, sql, temporaryPassword } from './_lib/db.js'

const MAX_BATCH = 500

export const GET = handle(async (req) => {
  await requireUser(req, 'admin')
  const students = await sql`
    select u.id, u.roll_no, u.name, u.role, u.must_change_pw, u.active, u.created_at,
           (select count(*)::int from records r where r.user_id = u.id) as record_count
    from users u where u.role = 'student' order by u.roll_no`
  return json({ students })
})

export const POST = handle(async (req) => {
  await requireUser(req, 'admin')
  const body = await readJson(req)
  switch (body.action) {
    case 'create_students': return createStudents(body.students)
    case 'reset_password': return resetPassword(body.user_id)
    case 'set_active': return setActive(body.user_id, Boolean(body.active))
    case 'delete_student': return deleteStudent(body.user_id)
    default: throw new HttpError(400, 'Unknown action.')
  }
})

async function createStudents(list) {
  if (!Array.isArray(list) || list.length === 0) throw new HttpError(400, 'No students given.')
  if (list.length > MAX_BATCH) throw new HttpError(400, `At most ${MAX_BATCH} students at a time.`)
  const results = []
  for (const s of list) {
    const raw = String(s?.roll_no ?? '').trim()
    const name = String(s?.name ?? '').trim().slice(0, 120)
    const roll = normalizeRoll(raw)
    if (!roll) {
      results.push({ roll_no: raw, name, ok: false, error: 'Invalid roll number (letters, digits, . _ - only)' })
      continue
    }
    const password = temporaryPassword()
    const rows = await sql`
      insert into users (roll_no, name, role, password_hash, must_change_pw)
      values (${roll}, ${name}, 'student', ${await hashPassword(password)}, true)
      on conflict (roll_no) do nothing returning id`
    results.push(rows.length
      ? { roll_no: roll, name, ok: true, password }
      : { roll_no: roll, name, ok: false, error: 'Already exists' })
  }
  return json({ results })
}

async function student(userId) {
  const [s] = await sql`select id, roll_no from users where id = ${Number(userId)} and role = 'student'`
  if (!s) throw new HttpError(404, 'Student not found.')
  return s
}

async function resetPassword(userId) {
  const s = await student(userId)
  const password = temporaryPassword()
  await sql`update users set password_hash = ${await hashPassword(password)}, must_change_pw = true,
    failed_logins = 0, locked_until = null where id = ${s.id}`
  await sql`delete from sessions where user_id = ${s.id}`
  return json({ password })
}

async function setActive(userId, active) {
  const s = await student(userId)
  await sql`update users set active = ${active} where id = ${s.id}`
  if (!active) await sql`delete from sessions where user_id = ${s.id}`
  return json({ ok: true })
}

async function deleteStudent(userId) {
  const s = await student(userId)
  await sql`delete from users where id = ${s.id}` // sessions and records cascade
  return json({ ok: true })
}
