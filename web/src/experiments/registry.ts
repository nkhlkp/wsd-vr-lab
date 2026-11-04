// Interactive configuration per experiment, following the lab report's write-ups.
import type { ExperimentId } from '../lab/experiments'
import CoordinationTask from './coordination/CoordinationTask'
import DepthTask from './depth/DepthTask'
import MatchBoardTask from './matchboard/MatchBoardTask'
import CordBindingTask from './cordbinding/CordBindingTask'
import type { ExperimentConfig } from './types'

const FATIGUE_BEFORE = 'Take five eye-fatigue readings before starting.'
const FATIGUE_AFTER = 'Take five eye-fatigue readings after the last trial.'

// Trial-based experiments only; the eye-fatigue station has its own screen (EyeFatigueStation).
const CONFIGS: Partial<Record<ExperimentId, ExperimentConfig>> = {
  coordination: {
    id: 'coordination',
    title: 'Study of Coordination Tester',
    objectives: [
      'To measure the eye–hand coordination of a subject required for a specific job.',
      'To test the change in eye-fatigue level due to this coordination task.',
      'To measure the learning rate of the subject for this job.',
    ],
    equipment: ['Coordination tester (two cranks driving a stylus over a zig-zag track)', 'Eye-fatigue reader', 'Stopwatch (automatic)'],
    procedure: [
      FATIGUE_BEFORE,
      'Turn the left crank to move the stylus left–right and the right crank to move it forward–back.',
      'Guide the stylus once round the zig-zag track, from START back to START, without touching the edges. Each touch sounds the buzzer and the trial is marked faulty.',
      'Repeat for the chosen number of trials; the time for each cycle is recorded automatically.',
      FATIGUE_AFTER,
    ],
    controls: [['← / →', 'Left crank: stylus left / right'], ['↑ / ↓', 'Right crank: stylus forward / back']],
    metric: { label: 'Time per cycle', unit: 's', kind: 'time' },
    defaultTrials: 10,
    trialOptions: [5, 10, 15],
    Task: CoordinationTask,
  },
  'depth-perception': {
    id: 'depth-perception',
    title: 'Use of Depth Perception Tester',
    objectives: [
      'To measure the depth perception of a subject with respect to a specified arrangement.',
      'To assess the depth perception of the subject.',
      'To measure the learning rate of the subject for this job.',
    ],
    equipment: ['Electric depth perception tester (two fixed rods, one motor-driven middle rod)', 'Chin rest', 'Eye-fatigue reader'],
    procedure: [
      FATIGUE_BEFORE,
      'The tester stands at the far end of the table. Sit at the near end, rest your chin on the chin rest and look at the box through the window in its front panel.',
      'The middle rod starts behind the two fixed rods and the motor drives it towards you. Stop it the moment all three rods appear to be in the same plane.',
      'Judge by where each rod stands on the floor of the box: as the middle rod comes nearer its foot appears lower and the rod slightly thicker.',
      'The deviation from the fixed rods is recorded in mm: + if stopped early (still farther), − if stopped late (nearer). The rod is reset to a new position for every trial.',
      FATIGUE_AFTER,
    ],
    controls: [['Space / Enter', 'Stop the rod and record']],
    metric: { label: 'Deviation', unit: 'mm', kind: 'deviation' },
    defaultTrials: 30,
    trialOptions: [5, 10, 20, 30],
    Task: DepthTask,
  },
  'cord-binding': {
    id: 'cord-binding',
    title: 'Cord Binding Tester',
    objectives: [
      "To measure the speed of the subject's hand and finger movement (efficiency).",
      'To test the movement and muscular coordination of the body of the subject.',
      'To measure the learning rate of the subject.',
    ],
    equipment: ['Cord binder (wooden board with pegs, resting against the wall)', 'Rope (cord)', 'Stopwatch (automatic)', 'Eye-fatigue reader'],
    procedure: [
      FATIGUE_BEFORE,
      'The cord is tied at the bottom-left corner of the board. Study the winding pattern on the pattern card.',
      'Wind the cord round the pegs in the order of the pattern, one peg after another, as fast as you can. Pegs not on the card must be left out.',
      'The clock starts at the first peg and stops when the last peg is wound; winding a wrong peg sounds the buzzer and is noted (two or more make the run faulty).',
      'The cord is unwound and the next run begins.',
      FATIGUE_AFTER,
    ],
    controls: [['Click peg', 'Wind the cord round it'], ['Mouse', 'Guide the loose end of the cord']],
    metric: { label: 'Time for one binding', unit: 's', kind: 'time' },
    defaultTrials: 10,
    trialOptions: [5, 10, 20, 30],
    Task: CordBindingTask,
  },
  'match-board': {
    id: 'match-board',
    title: 'Match Board Assembly',
    objectives: [
      "To measure the speed of the subject's hand and finger movement (efficiency).",
      'To test the movement and muscular coordination of the body of the subject.',
      'To measure the learning rate of the subject.',
    ],
    equipment: ['Sloped match board with 30 holes', 'Tray of matchsticks', 'Eye-fatigue reader'],
    procedure: [
      FATIGUE_BEFORE,
      'Pick one matchstick at a time from the tray and insert it into an empty hole of the board.',
      'A trial ends when all 30 holes are filled; the time taken is recorded automatically.',
      'The board is emptied and the next trial begins.',
      FATIGUE_AFTER,
    ],
    controls: [['Click tray', 'Pick a matchstick'], ['Click hole', 'Insert it']],
    metric: { label: 'Time to insert 30 matches', unit: 's', kind: 'time' },
    defaultTrials: 6,
    trialOptions: [4, 6, 10, 15],
    Task: MatchBoardTask,
  },
}

export function getExperimentConfig(id: string | null | undefined): ExperimentConfig | undefined {
  return id ? CONFIGS[id as ExperimentId] : undefined
}
