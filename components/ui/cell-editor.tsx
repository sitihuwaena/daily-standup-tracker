"use client"

import { UtilizationValue } from "@/types"
import { Button } from "./button"

type Props = {
  onSelect: (value: UtilizationValue) => void
  onClose: () => void
}

const options: { value: UtilizationValue; label: string }[] = [
  { value: 'L', label: 'L - Low' },
  { value: 'M', label: 'M - Medium' },
  { value: 'H', label: 'H - High' },
  { value: 'C', label: 'C - Cuti' },
  { value: 'S', label: 'S - Sakit' },
  { value: 'I', label: 'I - Izin' },
  { value: 'I*', label: 'I* - Izin Khusus' }
]

export function CellEditor({ onSelect, onClose }: Props) {
  return (
    <div className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 mt-1">
      <div className="space-y-1">
        {options.map(opt => (
          <Button
            key={opt.value}
            variant="ghost"
            className="w-full justify-start text-left"
            onClick={() => {
              onSelect(opt.value)
              onClose()
            }}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
