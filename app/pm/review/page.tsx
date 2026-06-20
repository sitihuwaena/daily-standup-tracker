"use client"

import { useState, useEffect, useCallback } from "react"
import { StandupEntry } from "@/types"

function SkeletonRow() {
  return (
    <tr>
      {[...Array(6)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-200 rounded animate-pulse" />
        </td>
      ))}
    </tr>
  )
}

export default function ReviewPage() {
  const [entries, setEntries] = useState<StandupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [engineerFilter] = useState("")
  const [selected, setSelected] = useState<StandupEntry | null>(null)

  const fetchStandups = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ date })
      if (engineerFilter) params.set("engineer_id", engineerFilter)
      const res = await fetch(`/api/standup?${params}`)
      const data = await res.json()
      setEntries(data.data || [])
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [date, engineerFilter])

  useEffect(() => {
    fetchStandups()
  }, [fetchStandups])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Review Standup</h1>
      <div className="flex gap-3 mb-5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Engineer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sprint</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kemarin</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Hari Ini</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Blocker</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                  Belum ada standup untuk tanggal ini
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr
                  key={entry.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelected(entry)}
                >
                  <td className="px-4 py-3 font-medium">{entry.engineer_name}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.project_name || "-"}</td>
                  <td className="px-4 py-3 text-gray-600">{entry.sprint_name || "-"}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{entry.yesterday}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{entry.today}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                    {entry.blockers || <span className="text-gray-400">-</span>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{selected.engineer_name}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="space-y-4 text-sm">
              {selected.project_name && (
                <p className="text-gray-500">
                  {selected.project_name} {selected.sprint_name ? `— ${selected.sprint_name}` : ""}
                </p>
              )}
              <div>
                <p className="font-medium text-gray-700 mb-1">Kemarin</p>
                <p className="text-gray-600 whitespace-pre-wrap">{selected.yesterday}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700 mb-1">Hari Ini</p>
                <p className="text-gray-600 whitespace-pre-wrap">{selected.today}</p>
              </div>
              {selected.blockers && (
                <div>
                  <p className="font-medium text-gray-700 mb-1">Blocker</p>
                  <p className="text-gray-600 whitespace-pre-wrap">{selected.blockers}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
