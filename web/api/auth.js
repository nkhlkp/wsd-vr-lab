// GET  /api/auth                       -> { user | null }
// POST /api/auth { action: 'login', roll_no, password }
// POST /api/auth { action: 'logout' }
// POST /api/auth { action: 'change_password', current_password?, new_password }
import {
  HttpError, burnPasswordCheck, currentUser, endSession, handle, hashPassword, json,
  normalizeRoll, readJson, sql, startSession, verifyPassword,
} from './_lib/db.js'

const MAX_FAILED = 10
const LOCK_MINUTES = 15

export const GET = handle(async (req) => json({ user: await currentUser(req) }))

export const POST = handle(async (req) => {
  const body = await readJson(req)
  switch (body.action) {
    case 'login': return login(req, body)
    case 'logout': return json({ ok: true }, 200, { 'set-cookie': await endSession(req) })
    case 'change_password': return changePassword(req, body)
    default: throw new HttpError(400, 'Unknown action.')
  }
})

async function login(req, { roll_no, password }) {
  const roll = normalizeRoll(roll_no)
  const pw = String(password ?? '')
  const wrong = new HttpError(401, 'Wrong roll number or password.')
  if (!roll || !pw) throw wrong

  const [u] = await sql`
    select id, password_hash, active, failed_logins, locked_until > now() as locked
    from users where roll_no = ${roll}`
  if (!u) {
    await burnPasswordCheck(pw)
    throw wrong
  }
  if (u.locked) throw new HttpError(429, `Too many wrong attempts. Try again in ${LOCK_MINUTES} minutes.`)
  if (!(await verifyPassword(pw, u.password_hash))) {
    const failed = u.failed_logins + 1
    if (failed >= MAX_FAILED) {
      await sql`update users set failed_logins = 0,
        locked_until = now() + make_interval(mins => ${LOCK_MINUTES}) where id = ${u.id}`
    } else {
      await sql`update users set failed_logins = ${failed} where id = ${u.id}`
    }
    throw wrong
  }
  if (!u.active) throw new HttpError(403, 'Your account has been disabled. Please contact your professor.')

  await sql`update users set failed_logins = 0, locked_until = null where id = ${u.id}`
  const cookie = await startSession(req, u.id)
  const [user] = await sql`
    select id, roll_no, name, role, must_change_pw, active, created_at from users where id = ${u.id}`
  return json({ user }, 200, { 'set-cookie': cookie })
}

async function changePassword(req, { current_password, new_password }) {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'Please sign in.')
  const next = String(new_password ?? '')
  if (next.length < 8) throw new HttpError(400, 'Use at least 8 characters.')
  if (next.length > 200) throw new HttpError(400, 'That password is too long.')

  const [{ password_hash }] = await sql`select password_hash from users where id = ${user.id}`
  // Someone using a temporary password has just typed it to sign in.
  if (!user.must_change_pw && !(await verifyPassword(String(current_password ?? ''), password_hash))) {
    throw new HttpError(400, 'Your current password is wrong.')
  }
  if (await verifyPassword(next, password_hash)) throw new HttpError(400, 'Choose a password different from the current one.')

  await sql`update users set password_hash = ${await hashPassword(next)}, must_change_pw = false where id = ${user.id}`
  return json({ user: { ...user, must_change_pw: false } })
}
