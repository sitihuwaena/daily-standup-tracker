"use client"

import { useState } from "react"
import { MonthPicker } from "@/components/ui/month-picker"
import { UtilizationGrid } from "@/components/utilization-grid"

export default function UtilizationPage() {
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <h1 className="text-2xl font-bold">Utilization Grid</h1>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>
      <UtilizationGrid month={selectedMonth} />
    </div>
  )
}
