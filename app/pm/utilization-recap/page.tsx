"use client"

import { useState, useEffect, useCallback } from "react"
import { Engineer, UtilizationValue, UtilizationStatus } from "@/types"
import { MonthPicker } from "@/components/ui/month-picker"
import { getDayName, getDaysInMonth, isSunday, formatDate } from "@/lib/calendar"

const colorMap: Record<UtilizationValue, string> = {
  L: "bg-yellow-100 text-yellow-900",
  M: "bg-green-100 text-green-900",
  H: "bg-red-100 text-red-900",
  C: "bg-blue-100 text-blue-900",
  S: "bg-purple-100 text-purple-900",
  I: "bg-gray-100 text-gray-700",
  "I*": "bg-gray-200 text-gray-800",
  F: "bg-gray-50 text-gray-400",
}

const statusColor: Record<UtilizationStatus, string> = {
  HEALTHY: "text-green-700",
  MONITOR: "text-yellow-700",
  BURNOUT: "text-red-700",
  UNDERUTIL: "text-blue-700",
}

type RecapCell = {
  date: string
  value: UtilizationValue | null
  isWeekend: boolean
  isHoliday: boolean
}

type EngineerSummary = {
  working_days: number
  utilization_days: number
  absence_days: number
  utilization_pct: number
  status: UtilizationStatus
}

type ApiResponse = {
  engineers: Engineer[]
  grid: Record<string, { date: string; value: string | null }[]>
  holidays: string[]
}

function computeSummary(cells: RecapCell[]): EngineerSummary {
  let workingDays = 0
  let utilizationDays = 0
  let absenceDays = 0

  for (const cell of cells) {
    if (cell.isWeekend || cell.isHoliday) continue
    workingDays++
    if (cell.value && ["L", "M", "H"].includes(cell.value)) utilizationDays++
    if (cell.value && ["C", "S", "I", "I*"].includes(cell.value)) absenceDays++
  }

  const pct = workingDays > 0 ? (utilizationDays / workingDays) * 100 : 0

  let status: UtilizationStatus = "UNDERUTIL"
  if (pct >= 85) status = "BURNOUT"
  else if (pct >= 60) status = "HEALTHY"
  else if (pct >= 40) status = "MONITOR"

  return { working_days: workingDays, utilization_days: utilizationDays, absence_days: absenceDays, utilization_pct: pct, status }
}

export default function UtilizationRecapPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [gridData, setGridData] = useState<Record<string, RecapCell[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/utilization?month=${month}`)
      const data: ApiResponse = await res.json()

      const engs = data.engineers || []
      const holidaySet = new Set(data.holidays || [])
      const [year, monthNum] = month.split("-").map(Number)
      const daysInMonth = getDaysInMonth(year, monthNum - 1)

      const grid: Record<string, RecapCell[]> = {}
      engs.forEach((eng) => {
        const apiCells = (data.grid || {})[eng.id] || []
        const cellMap = new Map(apiCells.map((c) => [c.date, c]))
        const cells: RecapCell[] = []
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(year, monthNum - 1, day)
          const dateStr = formatDate(date)
          cells.push({
            date: dateStr,
            value: (cellMap.get(dateStr)?.value as UtilizationValue) ?? null,
            isWeekend: isSunday(date),
            isHoliday: holidaySet.has(dateStr),
          })
        }
        grid[eng.id] = cells
      })

      setEngineers(engs)
      setGridData(grid)
    } catch {
      setEngineers([])
      setGridData({})
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  const firstEngineer = engineers[0]
  const daysInMonth = firstEngineer ? gridData[firstEngineer.id]?.length || 0 : 0
  const [year, monthNum] = month.split("-").map(Number)

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <h1 className="text-2xl font-bold">Rekap Utilization</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      ) : engineers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-500">
          Tidak ada data untuk bulan ini
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-collapse border border-gray-300 min-w-max text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-white border border-gray-300 px-3 py-2 text-left min-w-[160px]">
                  Engineer
                </th>
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const date = new Date(year, monthNum - 1, day)
                  const isSun = date.getDay() === 0
                  return (
                    <th
                      key={day}
                      className={`border border-gray-300 px-1 py-1 text-center min-w-[36px] ${isSun ? "bg-gray-100" : "bg-gray-50"}`}
                    >
                      <div className="font-semibold">{String(day).padStart(2, "0")}</div>
                      <div className="text-gray-400 font-normal">{getDayName(date.getDay())}</div>
                    </th>
                  )
                })}
                <th className="border border-gray-300 px-3 py-2 text-center bg-gray-50 min-w-[200px]">
                  Total / Ringkasan
                </th>
              </tr>
            </thead>
            <tbody>
              {engineers.map((eng) => {
                const cells = gridData[eng.id] || []
                const summary = computeSummary(cells)
                return (
                  <tr key={eng.id}>
                    <td className="sticky left-0 z-10 bg-white border border-gray-300 px-3 py-1 font-medium">
                      {eng.name}
                    </td>
                    {cells.map((cell, idx) => {
                      const isFree = cell.isWeekend || cell.isHoliday
                      const displayVal = isFree ? "F" : cell.value || "-"
                      const colorClass = isFree
                        ? colorMap.F
                        : cell.value
                        ? colorMap[cell.value]
                        : "bg-white text-gray-300"
                      return (
                        <td
                          key={idx}
                          className={`border border-gray-300 text-center h-9 ${colorClass}`}
                        >
                          {displayVal}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 px-3 py-1 text-gray-600">
                      <div className="space-y-0.5">
                        <div>Hari Kerja: <strong>{summary.working_days}</strong></div>
                        <div>Util: <strong>{summary.utilization_days}</strong> | Absen: <strong>{summary.absence_days}</strong></div>
                        <div>Util%: <strong>{summary.utilization_pct.toFixed(0)}%</strong></div>
                        <div className={`font-bold ${statusColor[summary.status]}`}>{summary.status}</div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
