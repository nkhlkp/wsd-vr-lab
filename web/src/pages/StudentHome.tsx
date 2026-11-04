import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { EXPERIMENTS } from '../lab/experiments'

export default function StudentHome() {
  const { profile, signOut } = useAuth()
  return (
    <div className="page">
      <header className="topbar">
        <strong>WSD Virtual Lab</strong>
        <span className="spacer" />
        <span className="muted">{profile?.name ? `${profile.name} · ` : ''}{profile?.roll_no}</span>
        <Link className="btn link" to="/change-password">Change password</Link>
        <button className="btn secondary" onClick={signOut}>Sign out</button>
      </header>
      <main className="content">
        <section className="card wide">
          <h2>Welcome{profile?.name ? `, ${profile.name}` : ''}</h2>
          <p>Walk around the lab and visit the experiment stations. Completed runs are saved to your
            account under <strong>My Records</strong> (in the lab), so you can open them from any computer.</p>
          <Link className="btn" to="/lab">Enter Lab</Link>
        </section>
        <section className="card wide">
          <h3>Experiments in this lab</h3>
          <ul className="exp-list">
            {EXPERIMENTS.map((e) => (
              <li key={e.id}>
                <strong>{e.title}</strong>
                {e.status === 'coming-soon' && <span className="tag">Coming soon</span>}
                <div className="muted small">{e.summary}</div>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
