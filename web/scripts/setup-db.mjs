// One-time database setup: creates the tables (safe to re-run) and creates or updates the
// professor's account. Run from the web folder in a normal terminal window:
//
//   npm run setup-db
//
// It reads DATABASE_URL from web/.env.local and asks for the professor's login ID, name
// and password (the password is not shown while typing and is stored only as a hash).
import { neon } from '@neondatabase/serverless'
import { randomBytes, scrypt as scryptCb } from 'node:crypto'
import { createInterface } from 'node:readline'

/** @returns {Promise<Buffer>} */
const scrypt = (password, salt, keylen, opts) =>
  new Promise((resolve, reject) => scryptCb(password, salt, keylen, opts, (err, key) => (err ? reject(err) : resolve(key))))

const SCHEMA = [
  `create table if not exists users (
    id             serial primary key,
    roll_no        text not null unique,
    name           text not null default '',
    role           text not null check (role in ('admin', 'student')),
    password_hash  text not null,
    must_change_pw boolean not null default true,
    active         boolean not null default true,
    failed_logins  int not null default 0,
    locked_until   timestamptz,
    created_at     timestamptz not null default now()
  )`,
  `create table if not exists sessions (
    token_hash text primary key,
    user_id    int not null references users(id) on delete cascade,
    expires_at timestamptz not null
  )`,
  `create index if not exists sessions_user on sessions(user_id)`,
  `create table if not exists records (
    user_id       int not null references users(id) on delete cascade,
    id            text not null,
    experiment_id text not null,
    title         text not null,
    created_at    timestamptz not null,
    data          jsonb not null,
    primary key (user_id, id)
  )`,
  `create index if not exists records_created on records(created_at desc)`,
]

// Same format as api/_lib/db.js hashPassword().
async function hashPassword(password) {
  const N = 16384
  const salt = randomBytes(16)
  const hash = await scrypt(password, salt, 64, { N, r: 8, p: 1 })
  return `scrypt$${N}$${salt.toString('base64')}$${hash.toString('base64')}`
}

function ask(question, { hidden = false } = {}) {
  return new Promise((resolve) => {
    const rl = /** @type {any} */ (createInterface({ input: process.stdin, output: process.stdout, terminal: true }))
    if (hidden) {
      rl._writeToOutput = (s) => {
        // Echo the prompt itself, then nothing for the typed characters.
        if (s.includes(question)) rl.output.write(s)
        else if (s === '\r\n' || s === '\n' || s === '\r') rl.output.write('\n')
      }
    }
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) })
  })
}

const url = process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL is missing. Put it in web/.env.local and run this from the web folder.')
  process.exit(1)
}
const sql = neon(url)

console.log('Creating tables...')
for (const statement of SCHEMA) await sql.query(statement)
console.log('Tables ready.\n')

const id = (process.env.ADMIN_ID ?? (await ask('Professor login ID (e.g. prof): '))).toLowerCase()
if (!/^[a-z0-9._-]{1,40}$/.test(id)) {
  console.error('The login ID may only contain letters, digits, . _ and -')
  process.exit(1)
}
const [existing] = await sql`select role from users where roll_no = ${id}`
if (existing && existing.role !== 'admin') {
  console.error(`"${id}" is already a student account. Pick another ID.`)
  process.exit(1)
}
const name = process.env.ADMIN_NAME ?? (await ask('Professor name (shown in the admin panel): '))
let password = process.env.ADMIN_PASSWORD
if (!password) {
  password = await ask('Password (at least 8 characters, hidden): ', { hidden: true })
  const again = await ask('Type the password again: ', { hidden: true })
  if (password !== again) {
    console.error('The passwords do not match. Nothing was changed.')
    process.exit(1)
  }
}
if (!password || password.length < 8) {
  console.error('Use at least 8 characters. Nothing was changed.')
  process.exit(1)
}

await sql`
  insert into users (roll_no, name, role, password_hash, must_change_pw)
  values (${id}, ${name}, 'admin', ${await hashPassword(password)}, false)
  on conflict (roll_no) do update set name = excluded.name, password_hash = excluded.password_hash,
    role = 'admin', active = true, must_change_pw = false, failed_logins = 0, locked_until = null`
await sql`delete from sessions where user_id = (select id from users where roll_no = ${id})`
console.log(`\n${existing ? 'Updated' : 'Created'} the professor account "${id}". Sign in with it at /login.`)
