export type Role = 'admin' | 'student'

export interface Profile {
  id: number
  roll_no: string
  name: string
  role: Role
  must_change_pw: boolean
  active: boolean
  created_at: string
}

export interface StudentRow extends Profile {
  record_count: number
}
