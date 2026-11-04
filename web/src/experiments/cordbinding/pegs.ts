// Cord binder layout, shared by the experiment and the 3D model in the lab.
// Board-local metres: x right, y up, board centre at 0 (board is 1.0 × 0.56 m).

/** Peg positions on the board, after the sketch on sheet 32. */
export const PEGS: [number, number][] = [
  [-0.40, 0.15], [-0.22, 0.10], [-0.05, 0.18], [0.12, 0.15], [0.37, 0.21],
  [0.29, 0.06], [0.22, -0.03], [0.32, -0.13], [0.09, -0.12], [-0.07, -0.05],
  [-0.20, -0.11], [-0.33, -0.18],
  // Pegs that are not part of the pattern.
  [-0.40, -0.03], [-0.10, 0.04], [0.05, -0.21], [0.42, -0.02],
]
/** Winding order: indices into PEGS. */
export const PATTERN = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
