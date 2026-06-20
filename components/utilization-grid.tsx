"use client"

import { useState } from "react"
import { UtilizationCell as Cell } from "@/components/ui/utilization-cell"
import { CellEditor } from "@/components/ui/cell-editor"
import { useUtilizationData } from "@/hooks/use-utilization-data"
import { getDayName } from "@/lib/calendar"
import { UtilizationValue } from "@/types"

type Props = {
  month: string
}

type SavingKey = `${string}:${number}`

export function UtilizationGrid({ month }: Props) {
  const { engineers, gridData, setGridData, loading, error } = useUtilizationData(month)
  const [editCell, setEditCell] = useState<{ engineerId: string; dayIndex: number } | null>(null)
  const [saving, setSaving] = useState<Set<SavingKey>>(new Set())
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleSave(engineerId: string, dayIndex: number, value: UtilizationValue) {
    const cell = gridData[engineerId]?.[dayIndex]
    if (!cell) return

    const key: SavingKey = `${engineerId}:${dayIndex}`
    setSaving((prev) => new Set(prev).add(key))

    try {
      let res: Response
      if (cell.id) {
        res = await fetch(`/api/utilization/${cell.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value }),
        })
      } else {
        res = await fetch("/api/utilization", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            engineer_id: engineerId,
            date: cell.date,
            value,
          }),
        })
      }

      if (!res.ok) throw new Error()

      const saved = await res.json()

      setGridData((prev) => {
        const updated = { ...prev }
        updated[engineerId] = prev[engineerId].map((c, i) =>
          i === dayIndex ? { ...c, value, id: saved.id || c.id } : c
        )
        return updated
      })
      showToast("Tersimpan", "ok")
    } catch {
      showToast("Gagal menyimpan", "err")
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
    setEditCell(null)
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <div className="p-4 text-red-600 bg-red-50 rounded-lg">{error}</div>
  }

  const firstEngineer = engineers[0]
  if (!firstEngineer) {
    return <div className="p-4 text-gray-500">Tidak ada data engineer aktif</div>
  }

  const daysInMonth = gridData[firstEngineer.id]?.length || 0
  const [year, monthNum] = month.split("-").map(Number)

  return (
    <div className="relative">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${
            toast.type === "ok" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.msg}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="border-collapse border border-gray-300 min-w-max">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-2 text-left min-w-[160px]">
                Engineer
              </th>
              {Array.from({ length: daysInMonth }, (_, i) => {
                const day = i + 1
                const date = new Date(year, monthNum - 1, day)
                const isSun = date.getDay() === 0
                return (
                  <th
                    key={day}
                    className={`border border-gray-300 px-1 py-1 text-center min-w-[44px] ${isSun ? "bg-gray-100" : ""}`}
                  >
                    <div className="text-xs font-semibold">{String(day).padStart(2, "0")}</div>
                    <div className="text-xs text-gray-500">{getDayName(date.getDay())}</div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {engineers.map((eng) => (
              <tr key={eng.id}>
                <td className="sticky left-0 z-10 bg-white border border-gray-300 px-4 py-1 font-medium text-sm">
                  {eng.name}
                </td>
                {gridData[eng.id]?.map((cell, idx) => {
                  const key: SavingKey = `${eng.id}:${idx}`
                  return (
                    <td key={idx} className="border border-gray-300 p-0 relative">
                      <Cell
                        value={cell.value}
                        isEditable={cell.isEditable}
                        isWeekend={cell.isWeekend}
                        isLoading={saving.has(key)}
                        onClick={() => {
                          if (cell.isEditable) setEditCell({ engineerId: eng.id, dayIndex: idx })
                        }}
                      />
                      {editCell?.engineerId === eng.id && editCell?.dayIndex === idx && (
                        <CellEditor
                          onSelect={(value: UtilizationValue) => handleSave(eng.id, idx, value)}
                          onClose={() => setEditCell(null)}
                        />
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
