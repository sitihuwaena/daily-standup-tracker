"use client"

import { Select } from "@/components/ui/select"

type MonthPickerProps = {
  value: string
  onChange: (value: string) => void
}

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

export function MonthPicker({ value, onChange }: MonthPickerProps) {
  const currentYear = new Date().getFullYear()
  const years = [currentYear - 1, currentYear, currentYear + 1]

  const options: { value: string; label: string }[] = []
  for (const year of years) {
    for (let m = 1; m <= 12; m++) {
      const val = `${year}-${String(m).padStart(2, "0")}`
      options.push({ value: val, label: `${MONTH_NAMES[m - 1]} ${year}` })
    }
  }

  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className="w-52">
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
  )
}
