// Lightweight experiment metadata (no three.js imports), safe to use on any page.
// The interactive apparatus for each id lives in src/experiments/registry.ts.

export type ExperimentId = 'coordination' | 'depth-perception' | 'match-board' | 'cord-binding' | 'eye-fatigue'

export interface ExperimentDef {
  /** Stored in records and (later) session_experiments.experiment_id. */
  id: ExperimentId
  title: string
  summary: string
  /** Blender object name of the table this station lives on (as in WSDLab.blend). */
  stationObject: string
  /** Further tables that belong to the same station (they glow and open it too). */
  extraObjects?: string[]
  status: 'ready' | 'coming-soon'
  /** Talking points for the report's leading questions, adapted from the lab report. */
  analysis: {
    arrangement: string
    method: string
    other: string
    technique: string
  }
}

export const EXPERIMENTS: ExperimentDef[] = [
  {
    id: 'coordination',
    title: 'Coordination Tester',
    summary:
      'Turn two cranks, one per hand, to guide a stylus round a zig-zag track without touching its edges.',
    stationObject: 'Table 1',
    status: 'ready',
    analysis: {
      arrangement: 'The position of the two cranks and how smoothly they turn affect the cycle time; smoother handles reduce it.',
      method: 'Working both cranks together on the diagonal sections, instead of one after the other, gives the fastest and cleanest path.',
      other: 'Posture, lighting and (on the real tester) moisture or rust on the lead screws change how easily the stylus moves.',
      technique: 'Use both hands simultaneously and practise the diagonal sections for better coordination.',
    },
  },
  {
    id: 'depth-perception',
    title: 'Depth Perception Tester',
    summary:
      'From the chin rest, stop the motor-driven middle rod the moment it is level with the two fixed rods; the error is measured in mm.',
    stationObject: 'Table 6',
    extraObjects: ['Table 7', 'Table 8'], // the joined row; the chin rest is at the free end of Table 8
    status: 'ready',
    analysis: {
      arrangement: 'The set-up of the apparatus and the viewing distance from it affect how easily the rods can be judged.',
      method: "The subject's technique matters: a steady head position on the chin rest and judging the alignment calmly as the rod approaches reduce error. A person with clear or corrected vision performs better.",
      other: 'Lighting and glare inside the box, and eye fatigue, make depth judgement harder.',
      technique: 'Keep the head steady on the chin rest, watch the gap between the rods rather than the rods themselves, and avoid anticipating the stop.',
    },
  },
  {
    id: 'match-board',
    title: 'Match Board Assembly',
    summary:
      'Pick matchsticks one at a time from the tray and insert them into the 30 holes of the sloped board as fast as possible.',
    stationObject: 'Table 3',
    status: 'ready',
    analysis: {
      arrangement: 'The distance between the tray and the board and the slope of the board decide how far each hand must travel.',
      method: 'Filling holes in a fixed order (row by row, nearest first) avoids searching for empty holes; a person with clear vision places pins faster.',
      other: 'Lighting and the size of the holes relative to the pins affect accuracy.',
      technique: 'Keep a steady rhythm of pick → place and follow the same filling order every trial.',
    },
  },
  {
    id: 'cord-binding',
    title: 'Cord Binding Tester',
    summary:
      'Wind a cord round the pegs of a board resting against the wall, in the set pattern, as fast as possible.',
    stationObject: 'Rope Exp Table',
    status: 'ready',
    analysis: {
      arrangement: 'The height and lean of the board and the spacing of the pegs decide how far the hands must reach for each turn.',
      method: 'Keeping the cord taut and feeding it from one hand to the other, instead of re-gripping at every peg, shortens each binding.',
      other: 'The stiffness and length of the cord, lighting, and fatigue of the arms and fingers affect the time.',
      technique: 'Memorise the pattern first so no time is lost looking for the next peg, and keep a steady rhythm.',
    },
  },
  {
    // Not a trial-based experiment: a stand-alone eye-fatigue reading at the reader itself.
    id: 'eye-fatigue',
    title: 'Eye Fatigue Tester',
    summary:
      'Take a set of eye-fatigue readings on the flicker-fusion reader: stop the lamp the moment its flicker disappears.',
    stationObject: 'Eye Test Table',
    status: 'ready',
    analysis: {
      arrangement: 'Viewing distance from the lamp and the room lighting change the frequency at which the flicker seems to stop.',
      method: 'Looking steadily at the lamp and stopping as soon as it looks steady gives consistent readings.',
      other: 'Tiredness, screen time and poor sleep lower the fusion frequency, i.e. raise the fatigue value.',
      technique: 'Rest the eyes before the test and keep the same head position for every reading.',
    },
  },
]

export function getExperiment(id: string | null | undefined) {
  return EXPERIMENTS.find((e) => e.id === id)
}
