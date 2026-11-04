import type { ComponentType } from 'react'
import type { ExperimentId } from '../lab/experiments'

export type MetricKind = 'time' | 'deviation'

/** What one trial measures, e.g. time per cycle (s) or deviation (mm). */
export interface Metric {
  label: string
  unit: string
  kind: MetricKind
}

export interface Trial {
  n: number
  value: number
  faulty: boolean
  note?: string
}

export type TrialResult = Omit<Trial, 'n'>

export interface TaskProps {
  /** 1-based number of the trial being performed. */
  trialNo: number
  totalTrials: number
  onComplete: (result: TrialResult) => void
}

export interface ExperimentConfig {
  id: ExperimentId
  title: string
  objectives: string[]
  equipment: string[]
  procedure: string[]
  /** [keys, action] pairs shown beside the apparatus. */
  controls: [string, string][]
  metric: Metric
  defaultTrials: number
  trialOptions: number[]
  /** The interactive apparatus. Mounted once for all trials; reset per trialNo. */
  Task: ComponentType<TaskProps>
}
