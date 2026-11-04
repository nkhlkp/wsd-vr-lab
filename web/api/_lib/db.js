// Database access, password hashing and sessions shared by the /api functions.
// Files under api/_lib are not deployed as functions (leading underscore).
import { neon } from '@neondatabase/serverless'
import { randomBytes, randomInt, scrypt as scryptCb, timingSafeEqual, createHash } from 'node:crypto'

/** @returns {Promise<Buffer>} */
const scrypt = (password, salt, keylen, opts) =>
  new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))))

/** @type {import('@neondatabase/serverless').NeonQueryFunction<false, false> | null} */
let client = null
/** Tagged-template SQL client: rows = await sql`select ... where id = ${id}` */
export function sql(strings, ...values) {
  return db()(strings, ...values)
}
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL
    if (!url) throw new HttpError(503, 'The database is not configured (DATABASE_URL is missing).')
    client = neon(url)
  }
  return client
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

// ---------- passwords ----------
// Format: scrypt$<N>$<salt b64>$<hash b64>. scripts/setup-db.mjs writes the same format.
const N = 16384
const KEYLEN = 64

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, KEYLEN, { N, r: 8, p: 1 })
  return `scrypt$${N}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [kind, n, saltB64, hashB64] = String(stored).split('$')
  if (kind !== 'scrypt') return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scrypt(password, Buffer.from(saltB64, 'base64'), expected.length, { N: Number(n), r: 8, p: 1 })
  return timingSafeEqual(actual, expected)
}

// A hash of a random password, checked when the roll number doesn't exist so the
// response takes as long as a real check.
/** @type {string | null} */
let dummyHash = null
export async function burnPasswordCheck(password) {
  dummyHash ??= await hashPassword(randomBytes(12).toString('hex'))
  await verifyPassword(password, dummyHash)
}

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789' // no 0/o, 1/l/i
export function temporaryPassword(length = 10) {
  let s = ''
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)]
  return s
}

export function normalizeRoll(roll) {
  const r = String(roll ?? '').trim().toLowerCase()
  if (!/^[a-z0-9._-]{1,40}$/.test(r)) return null
  return r
}

// ---------- sessions ----------
const COOKIE = 'wsd_session'
const SESSION_DAYS = 30

const tokenHash = (token) => createHash('sha256').update(token).digest('hex')

function readCookie(req, name) {
  const header = req.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

function cookieHeader(req, value, maxAge) {
  const secure = new URL(req.url).protocol === 'https:' ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

/** Creates a session and returns the Set-Cookie header value. */
export async function startSession(req, userId) {
  const token = randomBytes(32).toString('base64url')
  await sql`
    insert into sessions (token_hash, user_id, expires_at)
    values (${tokenHash(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}))`
  // Opportunistic clean-up of expired sessions.
  await sql`delete from sessions where expires_at < now()`
  return cookieHeader(req, token, SESSION_DAYS * 86400)
}

export async function endSession(req) {
  const token = readCookie(req, COOKIE)
  if (token) await sql`delete from sessions where token_hash = ${tokenHash(token)}`
  return cookieHeader(req, '', 0)
}

/** The signed-in, active user for this request, or null. */
export async function currentUser(req) {
  const token = readCookie(req, COOKIE)
  if (!token) return null
  const rows = await sql`
    select u.id, u.roll_no, u.name, u.role, u.must_change_pw, u.active, u.created_at
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${tokenHash(token)} and s.expires_at > now() and u.active`
  return rows[0] ?? null
}

/** Throws 401/403 unless signed in (and with the given role, if any). */
export async function requireUser(req, role) {
  const user = await currentUser(req)
  if (!user) throw new HttpError(401, 'Please sign in.')
  if (user.must_change_pw) throw new HttpError(403, 'Set a new password first.')
  if (role && user.role !== role) throw new HttpError(403, 'Not allowed.')
  return user
}

// ---------- request/response helpers ----------
export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers },
  })
}

/** Reads a JSON body. Requiring application/json also blocks cross-site form posts. */
export async function readJson(req) {
  if (!(req.headers.get('content-type') ?? '').includes('application/json')) {
    throw new HttpError(415, 'Expected a JSON body.')
  }
  try {
    return await req.json()
  } catch {
    throw new HttpError(400, 'Invalid JSON.')
  }
}

/** Wraps a handler so thrown HttpErrors become JSON error responses. */
export function handle(fn) {
  return async (req) => {
    try {
      return await fn(req)
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status)
      console.error(e)
      return json({ error: 'Something went wrong on the server.' }, 500)
    }
  }
}
