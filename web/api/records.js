// Saved experiment runs.
// GET    /api/records              student: own records; professor: everyone's (with roll_no, name)
// POST   /api/records { record }   student saves a completed run
// DELETE /api/records?id=...       student deletes one of their own
import { HttpError, handle, json, readJson, requireUser, sql } from './_lib/db.js'

const MAX_BYTES = 256 * 1024

export const GET = handle(async (req) => {
  const user = await requireUser(req)
  if (user.role === 'admin') {
    const rows = await sql`
      select r.data, u.id as user_id, u.roll_no, u.name
      from records r join users u on u.id = r.user_id
      order by r.created_at desc`
    return json({
      records: rows.map((r) => ({ ...r.data, student: { id: r.user_id, roll_no: r.roll_no, name: r.name } })),
    })
  }
  const rows = await sql`select data from records where user_id = ${user.id} order by created_at desc`
  return json({ records: rows.map((r) => r.data) })
})

export const POST = handle(async (req) => {
  const user = await requireUser(req, 'student')
  const { record: r } = await readJson(req)
  const text = JSON.stringify(r ?? null)
  if (text.length > MAX_BYTES) throw new HttpError(413, 'Record too large.')
  const valid = r && typeof r === 'object'
    && typeof r.id === 'string' && /^[a-z0-9-]{1,40}$/i.test(r.id)
    && typeof r.experimentId === 'string' && r.experimentId.length <= 40
    && typeof r.title === 'string' && r.title.length <= 120
    && typeof r.createdAt === 'string' && !Number.isNaN(Date.parse(r.createdAt))
    && Array.isArray(r.trials) && Array.isArray(r.fatigueBefore) && Array.isArray(r.fatigueAfter)
    && r.metric && typeof r.metric === 'object'
  if (!valid) throw new HttpError(400, 'Invalid record.')

  await sql`
    insert into records (user_id, id, experiment_id, title, created_at, data)
    values (${user.id}, ${r.id}, ${r.experimentId}, ${r.title}, ${r.createdAt}, ${text}::jsonb)
    on conflict (user_id, id) do update set data = excluded.data`
  return json({ ok: true })
})

export const DELETE = handle(async (req) => {
  const user = await requireUser(req, 'student')
  const id = new URL(req.url).searchParams.get('id') ?? ''
  await sql`delete from records where user_id = ${user.id} and id = ${id}`
  return json({ ok: true })
})
