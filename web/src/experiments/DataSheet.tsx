import { getExperiment } from '../lab/experiments'
import { fatigueValue, formatPlotValue, formatValue, mean, summarize } from './analysis'
import LearningCurveChart from './LearningCurveChart'
import type { ExperimentRecord } from './records'

function FatigueTable({ label, readings }: { label: string; readings: number[] }) {
  const avg = (xs: number[]) => (xs.length ? mean(xs).toFixed(1) : '–')
  return (
    <table>
      <thead>
        <tr><th>{label ? `${label}: reading` : 'Reading'}</th><th>Fatigue value (60 − r)</th></tr>
      </thead>
      <tbody>
        {readings.map((r, i) => (
          <tr key={i}><td>{r}</td><td>60 − {r} = {fatigueValue(r)}</td></tr>
        ))}
        <tr className="total">
          <td>Avg {avg(readings)}</td>
          <td>Avg {avg(readings.map(fatigueValue))}</td>
        </tr>
      </tbody>
    </table>
  )
}

/** The report-style write-up of one run: fatigue readings, trial table, curve and analysis. */
export default function DataSheet({ record }: { record: ExperimentRecord }) {
  const { metric, trials, fatigueBefore, fatigueAfter } = record
  const s = summarize(trials, metric, fatigueBefore, fatigueAfter)
  const def = getExperiment(record.experimentId)
  const measure = metric.kind === 'time' ? 'time' : 'deviation'
  const fmt = (y: number) => formatPlotValue(y, metric)

  return (
    <div className="datasheet">
      <header>
        <h2>{record.title}</h2>
        <p className="muted small">
          {new Date(record.createdAt).toLocaleString()}{trials.length > 0 && ` · ${trials.length} trials`}
        </p>
      </header>

      {(fatigueBefore.length > 0 || fatigueAfter.length > 0) && (
        <section>
          <h3>Eye fatigue readings</h3>
          <div className="fatigue-grid">
            {fatigueBefore.length > 0 && (
              <FatigueTable label={trials.length ? 'Before' : ''} readings={fatigueBefore} />
            )}
            {fatigueAfter.length > 0 && <FatigueTable label="After" readings={fatigueAfter} />}
          </div>
          <p className="small muted">
            Readings are from the simulated eye-fatigue reader (the flicker frequency, in Hz, at which
            the lamp first looked steady).
          </p>
        </section>
      )}

      {trials.length > 0 && <>
      <section>
        <h3>Observations</h3>
        <div className="table-wrap short">
          <table>
            <thead>
              <tr><th>Trial no.</th><th>{metric.label}</th><th>Remarks (faulty readings marked)</th></tr>
            </thead>
            <tbody>
              {trials.map((t) => (
                <tr key={t.n} className={t.faulty ? 'faulty' : ''}>
                  <td>{t.n}</td>
                  <td>{formatValue(t.value, metric)}</td>
                  <td>{[t.faulty ? 'Faulty' : '', t.note ?? ''].filter(Boolean).join(' · ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h3>Learning rate and curve</h3>
        <LearningCurveChart trials={trials} metric={metric} />
        {s.fit ? (
          <p>
            Fitted curve: <code>y = {s.fit.a.toFixed(2)} · n<sup>{s.fit.b.toFixed(3)}</sup></code>{' '}
            (R² = {s.fit.r2.toFixed(2)}). <strong>Learning rate = 2<sup>b</sup> = {(s.fit.learningRate * 100).toFixed(1)}%</strong>
            {': '}each time the number of trials doubles, the {measure}{' '}
            {s.fit.learningRate < 1 ? 'falls' : 'rises'} to about {(s.fit.learningRate * 100).toFixed(0)}% of its previous value.
          </p>
        ) : (
          <p className="muted">At least three non-faulty trials are needed to fit a learning curve.</p>
        )}
      </section>

      <section>
        <h3>Leading questions</h3>
        <ol className="questions">
          <li>
            <strong>Can you identify the reasons for getting the present learning rate?</strong>
            <ul>
              <li>
                <em>Adaptation:</em>{' '}
                {s.improvement === null
                  ? 'Not enough valid trials to compare early and late performance.'
                  : s.improvement > 0
                    ? `the average ${measure} fell from ${fmt(s.firstAvg!)} (first trials) to ${fmt(s.lastAvg!)} (last trials), a ${(s.improvement * 100).toFixed(0)}% improvement.`
                    : `the average ${measure} did not fall (${fmt(s.firstAvg!)} → ${fmt(s.lastAvg!)}), so little adaptation took place in this run.`}
              </li>
              <li>
                <em>Fatigue:</em>{' '}
                {s.peaks.length
                  ? `sudden peaks at trial${s.peaks.length > 1 ? 's' : ''} ${s.peaks.join(', ')} suggest momentary fatigue or loss of concentration.`
                  : 'there are no sudden peaks, so fatigue did not visibly interrupt the run.'}
                {s.fatigueBefore !== null && s.fatigueAfter !== null &&
                  ` The average eye-fatigue value changed from ${s.fatigueBefore.toFixed(1)} before to ${s.fatigueAfter.toFixed(1)} after the trials.`}
              </li>
              <li>
                <em>Motor skill development:</em>{' '}
                {s.fit
                  ? s.fit.b < 0
                    ? `with practice the ${measure} decreases steadily (learning rate ${(s.fit.learningRate * 100).toFixed(0)}%).`
                    : `the fitted curve is not decreasing, so no clear skill development is visible yet.`
                  : 'more trials are needed to judge skill development.'}
              </li>
            </ul>
          </li>
          {def && (
            <li>
              <strong>Can you classify the reasons with respect to working arrangement, method of working and other relevant factors?</strong>
              <ul>
                <li><em>Arrangement:</em> {def.analysis.arrangement}</li>
                <li><em>Method of doing work:</em> {def.analysis.method}</li>
                <li><em>Other factors:</em> {def.analysis.other}</li>
              </ul>
            </li>
          )}
          <li>
            <strong>How do you improve the learning rate?</strong>
            <ul>
              <li><em>Minimise fatigue:</em> give short rests between trials.</li>
              {def && <li><em>Optimise technique:</em> {def.analysis.technique}</li>}
              <li><em>Environmental control:</em> good, even lighting and a comfortable working posture.</li>
            </ul>
          </li>
        </ol>
      </section>
      </>}
    </div>
  )
}
