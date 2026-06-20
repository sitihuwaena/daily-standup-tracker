export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function isSunday(date: Date): boolean {
  return date.getDay() === 0
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export function getDayName(dayIndex: number): string {
  const days = ['Ming', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  return days[dayIndex]
}
