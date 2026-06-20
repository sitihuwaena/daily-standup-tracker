export type UtilizationValue = 'L' | 'M' | 'H' | 'C' | 'S' | 'I' | 'I*' | 'F'

export type UtilizationStatus = 'HEALTHY' | 'MONITOR' | 'BURNOUT' | 'UNDERUTIL'

export type Engineer = {
  id: string
  name: string
  is_active: boolean
  created_at?: string
}

export type Project = {
  id: string
  name: string
  is_active: boolean
  created_at?: string
}

export type Sprint = {
  id: string
  name: string
  project_id: string
  project_name?: string
  start_date: string
  end_date: string
  is_active: boolean
}

export type Holiday = {
  id: string
  date: string
  name: string
}

export type UtilizationCell = {
  id?: string
  date: string
  value: UtilizationValue | null
  isWeekend: boolean
  isHoliday: boolean
  isEditable: boolean
}

export type EngineerMetrics = {
  engineer_id: string
  engineer_name: string
  status: UtilizationStatus
  avg_utilization: number
  healthy_workload_pct: number
  streak_h: number
  total_absence: number
  working_days: number
  utilization_days: number
  absence_days: number
}

export type TeamMetrics = {
  avg_utilization: number
  healthy_workload_pct: number
  burnout_count: number
  underutil_count: number
  engineers: EngineerMetrics[]
}

export type StandupEntry = {
  id: string
  engineer_id: string
  engineer_name: string
  project_id?: string
  project_name?: string
  sprint_id?: string
  sprint_name?: string
  yesterday: string
  today: string
  blockers: string
  submitted_at: string
}
