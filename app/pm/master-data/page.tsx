"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Engineer, Project, Sprint, Holiday } from "@/types"

type Tab = "engineers" | "projects" | "sprints" | "holidays"

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${checked ? "bg-blue-600" : "bg-gray-300"}`}
    >
      <span
        className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
      />
    </button>
  )
}

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg text-sm text-white shadow-lg ${type === "ok" ? "bg-green-600" : "bg-red-600"}`}>
      {msg}
    </div>
  )
}

function EngineersTab() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch("/api/engineers")
      .then((r) => r.json())
      .then((res) => setEngineers(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (engineers.some((en) => en.name.toLowerCase() === name.toLowerCase())) {
      setError("Engineer dengan nama ini sudah ada")
      return
    }
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/engineers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setEngineers((prev) => [...prev, created.data || created])
      setNewName("")
      showToast("Engineer berhasil ditambahkan", "ok")
    } catch {
      showToast("Gagal menambah engineer", "err")
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(eng: Engineer) {
    try {
      const res = await fetch(`/api/engineers/${eng.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !eng.is_active }),
      })
      if (!res.ok) throw new Error()
      setEngineers((prev) => prev.map((e) => (e.id === eng.id ? { ...e, is_active: !e.is_active } : e)))
      showToast(`Engineer ${!eng.is_active ? "diaktifkan" : "dinonaktifkan"}`, "ok")
    } catch {
      showToast("Gagal mengubah status", "err")
    }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <form onSubmit={handleAdd} className="flex gap-3 mb-5">
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError("") }}
          placeholder="Nama Engineer"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" disabled={adding || !newName.trim()}>
          {adding ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal Dibuat</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>
                  {[...Array(3)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : engineers.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-500">Belum ada engineer</td></tr>
            ) : (
              engineers.map((eng) => (
                <tr key={eng.id}>
                  <td className="px-4 py-3 font-medium">{eng.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {eng.created_at ? new Date(eng.created_at).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Toggle checked={eng.is_active} onChange={() => handleToggle(eng)} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((res) => setProjects(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    if (projects.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError("Project dengan nama ini sudah ada")
      return
    }
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setProjects((prev) => [...prev, created.data || created])
      setNewName("")
      showToast("Project berhasil ditambahkan", "ok")
    } catch {
      showToast("Gagal menambah project", "err")
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(p: Project) {
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !p.is_active }),
      })
      if (!res.ok) throw new Error()
      setProjects((prev) => prev.map((item) => (item.id === p.id ? { ...item, is_active: !item.is_active } : item)))
      showToast(`Project ${!p.is_active ? "diaktifkan" : "dinonaktifkan"}`, "ok")
    } catch {
      showToast("Gagal mengubah status", "err")
    }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <form onSubmit={handleAdd} className="flex gap-3 mb-5">
        <input
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError("") }}
          placeholder="Nama Project"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <Button type="submit" disabled={adding || !newName.trim()}>
          {adding ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nama</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal Dibuat</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(3)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : projects.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-500">Belum ada project</td></tr>
            ) : (
              projects.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.created_at ? new Date(p.created_at).toLocaleDateString("id-ID") : "-"}
                  </td>
                  <td className="px-4 py-3"><Toggle checked={p.is_active} onChange={() => handleToggle(p)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SprintsTab() {
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filterProject, setFilterProject] = useState("")
  const [form, setForm] = useState({ name: "", project_id: "", start_date: "", end_date: "" })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/sprints").then((r) => r.json()),
      fetch("/api/projects?active=true").then((r) => r.json()),
    ]).then(([sRes, pRes]) => {
      setSprints(sRes.data || [])
      setProjects(pRes.data || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.project_id || !form.start_date || !form.end_date) {
      setError("Semua field wajib diisi")
      return
    }
    if (form.end_date <= form.start_date) {
      setError("Tanggal selesai harus setelah tanggal mulai")
      return
    }
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/sprints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      const newSprint = created.data || created
      const proj = projects.find((p) => p.id === form.project_id)
      setSprints((prev) => [...prev, { ...newSprint, project_name: proj?.name }])
      setForm({ name: "", project_id: "", start_date: "", end_date: "" })
      showToast("Sprint berhasil ditambahkan", "ok")
    } catch {
      showToast("Gagal menambah sprint", "err")
    } finally {
      setAdding(false)
    }
  }

  async function handleToggle(s: Sprint) {
    try {
      const res = await fetch(`/api/sprints/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !s.is_active }),
      })
      if (!res.ok) throw new Error()
      setSprints((prev) => prev.map((item) => (item.id === s.id ? { ...item, is_active: !item.is_active } : item)))
      showToast(`Sprint ${!s.is_active ? "diaktifkan" : "dinonaktifkan"}`, "ok")
    } catch {
      showToast("Gagal mengubah status", "err")
    }
  }

  const filtered = filterProject ? sprints.filter((s) => s.project_id === filterProject) : sprints

  return (
    <div>
      {toast && <Toast {...toast} />}
      <form onSubmit={handleAdd} className="grid grid-cols-2 gap-3 mb-5">
        <Select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
          <option value="">-- Pilih Project --</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <input
          value={form.name}
          onChange={(e) => { setForm({ ...form, name: e.target.value }); setError("") }}
          placeholder="Nama Sprint"
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Mulai</label>
          <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 whitespace-nowrap">Selesai</label>
          <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <Button type="submit" disabled={adding} className="col-span-2">
          {adding ? "Menyimpan..." : "Tambah Sprint"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="mb-3">
        <Select value={filterProject} onChange={(e) => setFilterProject(e.target.value)} className="w-48">
          <option value="">Semua Project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Sprint</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Mulai</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Selesai</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aktif</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(5)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-gray-500">Belum ada sprint</td></tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">{s.project_name || "-"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(s.start_date).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(s.end_date).toLocaleDateString("id-ID")}</td>
                  <td className="px-4 py-3"><Toggle checked={s.is_active} onChange={() => handleToggle(s)} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function HolidaysTab() {
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ date: "", name: "" })
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<Holiday | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetch("/api/holidays")
      .then((r) => r.json())
      .then((res) => setHolidays(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.date || !form.name.trim()) {
      setError("Semua field wajib diisi")
      return
    }
    if (holidays.some((h) => h.date === form.date)) {
      setError("Tanggal ini sudah ada di daftar hari libur")
      return
    }
    setError("")
    setAdding(true)
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const created = await res.json()
      setHolidays((prev) => [...prev, created.data || created].sort((a, b) => a.date.localeCompare(b.date)))
      setForm({ date: "", name: "" })
      showToast("Hari libur berhasil ditambahkan", "ok")
    } catch {
      showToast("Gagal menambah hari libur", "err")
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete(holiday: Holiday) {
    try {
      const res = await fetch(`/api/holidays/${holiday.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      setHolidays((prev) => prev.filter((h) => h.id !== holiday.id))
      setDeleteTarget(null)
      showToast("Hari libur dihapus", "ok")
    } catch {
      showToast("Gagal menghapus", "err")
    }
  }

  return (
    <div>
      {toast && <Toast {...toast} />}
      <form onSubmit={handleAdd} className="flex gap-3 mb-5 flex-wrap">
        <input type="date" value={form.date} onChange={(e) => { setForm({ ...form, date: e.target.value }); setError("") }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <input value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); setError("") }}
          placeholder="Nama Hari Libur"
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <Button type="submit" disabled={adding || !form.date || !form.name.trim()}>
          {adding ? "Menyimpan..." : "Tambah"}
        </Button>
      </form>
      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Tanggal</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Nama Hari Libur</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(3)].map((_, i) => (
                <tr key={i}>{[...Array(3)].map((__, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-200 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : holidays.length === 0 ? (
              <tr><td colSpan={3} className="text-center py-8 text-gray-500">Belum ada hari libur</td></tr>
            ) : (
              holidays.map((h) => (
                <tr key={h.id}>
                  <td className="px-4 py-3 text-gray-700">{new Date(h.date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</td>
                  <td className="px-4 py-3 font-medium">{h.name}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setDeleteTarget(h)} className="text-red-500 hover:text-red-700 text-xs">Hapus</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">Hapus Hari Libur?</h2>
            <p className="text-sm text-gray-600 mb-5">
              Hapus <strong>{deleteTarget.name}</strong> ({deleteTarget.date})? Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
              <button onClick={() => handleDelete(deleteTarget)} className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const tabs: { key: Tab; label: string }[] = [
  { key: "engineers", label: "Engineers" },
  { key: "projects", label: "Projects" },
  { key: "sprints", label: "Sprints" },
  { key: "holidays", label: "Holidays" },
]

function MasterDataContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeTab = (searchParams.get("tab") as Tab) || "engineers"

  function setTab(tab: Tab) {
    router.push(`/pm/master-data?tab=${tab}`)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Master Data</h1>
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {activeTab === "engineers" && <EngineersTab />}
      {activeTab === "projects" && <ProjectsTab />}
      {activeTab === "sprints" && <SprintsTab />}
      {activeTab === "holidays" && <HolidaysTab />}
    </div>
  )
}

export default function MasterDataPage() {
  return (
    <Suspense fallback={<div className="p-6"><div className="h-8 w-48 bg-gray-200 rounded animate-pulse" /></div>}>
      <MasterDataContent />
    </Suspense>
  )
}
