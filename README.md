# WSD Virtual Lab

A browser-based 3D version of the Work System Design & Virtual Reality Lab. Students walk
around the lab (WASD + mouse), go up to a station and perform the experiment on a virtual
copy of the apparatus. Readings, the learning curve and the report's leading questions are
produced automatically and can be downloaded for the lab report.

```
WSDLab.blend                  Source 3D model of the lab (edit in Blender)
blender/export_glb.py         Headless export: .blend -> web/public/models/lab.glb
web/                          React + three.js app
  src/lab/                    3D lab: model loading, movement, stations
  src/experiments/            Experiment engine + the three apparatus
  src/pages/                  Lab page, login, student home, professor admin
  api/                        Vercel serverless functions (login, accounts, records)
  scripts/setup-db.mjs        Creates the database tables and the professor account
```

## Experiments

Taken from the lab's own write-ups (`WSD lab report.pdf`). Each one follows the report format:
eye-fatigue readings before and after, timed trials with faulty readings marked, a learning
curve (fitted y = a·nᵇ, learning rate = 2ᵇ) and the three leading questions.

| Station (table in the model) | Experiment | Task | Recorded |
|---|---|---|---|
| `Table 1` | Coordination Tester | Two cranks (<kbd>←</kbd>/<kbd>→</kbd> and <kbd>↑</kbd>/<kbd>↓</kbd>) drive a stylus once round a zig-zag track; touching an edge sounds the buzzer | Time per cycle, edge touches → faulty |
| `Table 6` (front of the long left row) | Depth Perception Tester | From the chin rest at the other end of the table, stop the motor-driven middle rod (moving towards you) when it is level with the two fixed rods | Deviation in mm (+ stopped early / − overshot) |
| `Eye Test Table` | Eye Fatigue Tester | Stand-alone set of five readings on the flicker-fusion reader (the same readings are also taken before/after every experiment) | Readings in Hz, fatigue value = 60 − reading |
| `Rope Exp Table` | Cord Binding Tester | Wind a cord round the pegs of a board resting against the wall, in the order on the pattern card (click each peg) | Time for one binding; 2+ wrong pegs → faulty |
| `Table 3` | Match Board Assembly | Pick matches from the tray and fill all 30 holes of a sloped board | Time to insert 30 matches |

The eye-fatigue reader is simulated: a normal 60 Hz screen cannot show true flicker-fusion
frequencies, so the lamp's flicker fades as the dial frequency rises and the subject stops it
when it looks steady. Fatigue value = 60 − reading, as in the report.

Completed runs are saved under **My Records** (in the student's account) and can be
downloaded as CSV or printed / saved as PDF.

## Running locally

Requires Node 20+.

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173 and sign in (see "Accounts" below for the first-time setup). Click to enter, walk to a glowing station and press <kbd>E</kbd>.

`?hud=0` hides the start overlay (useful for screenshots). In development, `window.__labCamera`
and `window.__openStation(id)` are exposed for automated tests; they are stripped from
production builds.

## Accounts and deployment

The site runs on **Vercel** with a **Neon Postgres** database:

- `web/` is the Vite app; `web/api/*.js` are Vercel serverless functions (`auth`, `admin`,
  `records`) sharing `web/api/_lib/db.js`. In `npm run dev` the same functions run inside the
  Vite dev server, so local and deployed behaviour match.
- Students sign in with **roll number + password**. The professor creates accounts (one at a
  time or by CSV `roll_no,name`); each gets a temporary password that must be changed at first
  login. Passwords are stored as scrypt hashes; sessions are httpOnly cookies (30 days).
  10 wrong passwords lock an account for 15 minutes.
- Completed runs are saved to the student's account. The professor's **Results** tab lists every
  student's runs, with the full data sheet, per-run CSV and a summary CSV.

### One-time setup

1. `web/.env.local` holds `DATABASE_URL` (Vercel → Storage → the Neon database → `.env.local`).
   Never commit it.
2. Create the tables and the professor account, in a normal terminal:
   ```bash
   cd web
   npm run setup-db
   ```
   It asks for the professor's login ID, name and password. Re-run it any time to reset the
   professor's password; existing data is kept.
3. On Vercel: import the GitHub repository with **Root Directory = `web`** (framework: Vite), and
   connect the Neon database to the project (Storage → Connect Project) so `DATABASE_URL` is set.
   Every push to `main` redeploys.

`VITE_DEMO=1` builds an open demo with no login, keeping records in the browser.

## Updating the 3D model

Edit `WSDLab.blend` in Blender, save, then:

```bash
cd web
npm run export-model      # set BLENDER_PATH if Blender isn't in the default location
```

Stations are found by **Blender object name**. See `stationObject` in
`web/src/lab/experiments.ts` (`Table 1`, `Table 6`, `Table 3`). Renaming those
objects in Blender means updating that file too. Everything with height between ankle and
head level automatically becomes a collider.

Apparatus models are built in code in `web/src/lab/props.ts`: the depth tester at the south
end of `Table 6` with its chin rest at the free far end of the row (`Table 8`; Tables 6–8 are
butted together), the eye-fatigue
reader on `Eye Test Table`, and the cord binder (peg board against the wall) on `Rope Exp Table`.

Notes on the current model:
- It has no west wall or ceiling. The app adds both in code until they exist in the
  `.blend` (objects named `West Wall` and `Ceiling` will replace the generated ones).
- `Rope Exp Table` is just a tabletop with no legs; legs are added in code (`props.ts`).
- `Storaae Rack 4` is renamed to `Storage Rack 4` during export (the `.blend` is untouched).

## Adding an experiment

1. Add an entry to `EXPERIMENTS` in `web/src/lab/experiments.ts` with a new `id`, the
   Blender object name of its table, and its leading-question notes.
2. Build the apparatus as a component taking `TaskProps` (`trialNo`, `onComplete`) in
   `web/src/experiments/<name>/`, and register it with its objectives, procedure, controls
   and metric in `web/src/experiments/registry.ts`. The runner supplies the eye-fatigue steps,
   trial log, learning curve, data sheet and records.
