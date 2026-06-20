"use client"

import { useState, useEffect, useCallback } from "react"
import { TeamMetrics, EngineerMetrics, UtilizationStatus } from "@/types"
import { MonthPicker } from "@/components/ui/month-picker"
import { Button } from "@/components/ui/button"

const statusColor: Record<UtilizationStatus, string> = {
  HEALTHY: "bg-green-100 text-green-800",
  MONITOR: "bg-yellow-100 text-yellow-800",
  BURNOUT: "bg-red-100 text-red-800",
  UNDERUTIL: "bg-blue-100 text-blue-800",
}

function MetricCard({ title, value, subtitle, highlight }: {
  title: string
  value: string | number
  subtitle?: string
  highlight?: "good" | "warn" | "bad"
}) {
  const ringColor = highlight === "good" ? "ring-green-200" : highlight === "bad" ? "ring-red-200" : highlight === "warn" ? "ring-yellow-200" : "ring-gray-200"
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 ring-1 ${ringColor}`}>
      <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

function SkeletonCard() {
  return <div className="bg-white rounded-xl border border-gray-200 p-5 h-24 animate-pulse bg-gray-100" />
}

type SortKey = keyof Pick<EngineerMetrics, "avg_utilization" | "healthy_workload_pct" | "streak_h" | "total_absence">
type SortDir = "asc" | "desc"

export default function DashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState<"pdf" | "excel" | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>("avg_utilization")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/metrics?month=${month}`)
      const data = await res.json()
      setMetrics(data.data || null)
    } catch {
      setMetrics(null)
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => { fetchMetrics() }, [fetchMetrics])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir("desc")
    }
  }

  async function handleExport(format: "pdf" | "excel") {
    setExportLoading(format)
    try {
      const res = await fetch(`/api/export/${format}?month=${month}`)
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `standup-report-${month}.${format === "pdf" ? "pdf" : "xlsx"}`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      showToast(`Gagal export ${format.toUpperCase()}`)
    } finally {
      setExportLoading(null)
    }
  }

  const sortedEngineers = metrics
    ? [...metrics.engineers].sort((a, b) => {
        const va = a[sortKey]
        const vb = b[sortKey]
        return sortDir === "asc" ? va - vb : vb - va
      })
    : []

  const SortIcon = ({ k }: { k: SortKey }) => (
    <span className="ml-1 text-gray-400">{sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
  )

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg bg-red-600">
          {toast}
        </div>
      )}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <MonthPicker value={month} onChange={setMonth} />
          <Button variant="outline" onClick={() => handleExport("pdf")} disabled={!!exportLoading}>
            {exportLoading === "pdf" ? "Generating..." : "Export PDF"}
          </Button>
          <Button variant="outline" onClick={() => handleExport("excel")} disabled={!!exportLoading}>
            {exportLoading === "excel" ? "Generating..." : "Export Excel"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {loading ? (
          [...Array(4)].map((_, i) => <SkeletonCard key={i} />)
        ) : !metrics ? (
          <div className="col-span-4 text-center py-8 text-gray-500 bg-white rounded-xl border border-gray-200">
            Tidak ada data utilization untuk bulan ini
          </div>
        ) : (
          <>
            <MetricCard
              title="Rata-rata Utilization Tim"
              value={`${metrics.avg_utilization.toFixed(1)}%`}
              highlight={metrics.avg_utilization >= 60 && metrics.avg_utilization <= 75 ? "good" : "warn"}
            />
            <MetricCard
              title="Healthy Workload %"
              value={`${metrics.healthy_workload_pct.toFixed(1)}%`}
              highlight={metrics.healthy_workload_pct >= 60 && metrics.healthy_workload_pct <= 75 ? "good" : "warn"}
            />
            <MetricCard
              title="Burnout Risk"
              value={metrics.burnout_count}
              subtitle="engineer"
              highlight={metrics.burnout_count > 0 ? "bad" : "good"}
            />
            <MetricCard
              title="Underutilized"
              value={metrics.underutil_count}
              subtitle="engineer"
              highlight={metrics.underutil_count > 0 ? "warn" : "good"}
            />
          </>
        )}
      </div>

      {metrics && metrics.engineers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Engineer</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th
                  className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort("avg_utilization")}
                >
                  Avg Util <SortIcon k="avg_utilization" />
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort("healthy_workload_pct")}
                >
                  Healthy % <SortIcon k="healthy_workload_pct" />
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort("streak_h")}
                >
                  Streak H <SortIcon k="streak_h" />
                </th>
                <th
                  className="text-right px-4 py-3 font-medium text-gray-600 cursor-pointer hover:text-blue-600"
                  onClick={() => handleSort("total_absence")}
                >
                  Ketidakhadiran <SortIcon k="total_absence" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedEngineers.map((eng) => (
                <tr key={eng.engineer_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{eng.engineer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor[eng.status]}`}>
                      {eng.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">{eng.avg_utilization.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">{eng.healthy_workload_pct.toFixed(1)}%</td>
                  <td className="px-4 py-3 text-right text-gray-700">{eng.streak_h} hari</td>
                  <td className="px-4 py-3 text-right text-gray-700">{eng.total_absence} hari</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
