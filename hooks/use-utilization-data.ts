"use client"

import { useState, useEffect } from "react"
import { UtilizationCell, Engineer, UtilizationValue } from "@/types"
import { getDaysInMonth, isSunday, formatDate } from "@/lib/calendar"

type ApiCell = {
  id?: string
  date: string
  value: string | null
  is_holiday?: boolean
}

type ApiResponse = {
  engineers: Engineer[]
  grid: Record<string, ApiCell[]>
  holidays?: string[]
}

export function useUtilizationData(month: string) {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [gridData, setGridData] = useState<Record<string, UtilizationCell[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/utilization?month=${month}`)
      .then((r) => r.json())
      .then((res: ApiResponse) => {
        const engs = res.engineers || []
        const holidaySet = new Set(res.holidays || [])
        const [year, monthNum] = month.split("-").map(Number)
        const daysInMonth = getDaysInMonth(year, monthNum - 1)

        const grid: Record<string, UtilizationCell[]> = {}
        engs.forEach((eng) => {
          const apiCells = (res.grid || {})[eng.id] || []
          const cellMap = new Map(apiCells.map((c) => [c.date, c]))
          const cells: UtilizationCell[] = []
          for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthNum - 1, day)
            const dateStr = formatDate(date)
            const isSun = isSunday(date)
            const isHol = holidaySet.has(dateStr)
            const apiCell = cellMap.get(dateStr)
            cells.push({
              id: apiCell?.id,
              date: dateStr,
              value: (apiCell?.value as UtilizationValue) ?? null,
              isWeekend: isSun,
              isHoliday: isHol,
              isEditable: !isSun && !isHol,
            })
          }
          grid[eng.id] = cells
        })

        setEngineers(engs)
        setGridData(grid)
        setError(null)
      })
      .catch(() => setError("Gagal memuat data"))
      .finally(() => setLoading(false))
  }, [month])

  return { engineers, gridData, setGridData, loading, error }
}
