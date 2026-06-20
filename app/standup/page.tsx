"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Engineer, Project, Sprint } from "@/types"

type FormState = {
  engineer_id: string
  project_id: string
  sprint_id: string
  yesterday: string
  today: string
  blockers: string
}

const initialForm: FormState = {
  engineer_id: "",
  project_id: "",
  sprint_id: "",
  yesterday: "",
  today: "",
  blockers: "",
}

export default function StandupPage() {
  const [engineers, setEngineers] = useState<Engineer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([
      fetch("/api/engineers").then((r) => r.json()).catch(() => ({ data: [] })),
      fetch("/api/projects").then((r) => r.json()).catch(() => ({ data: [] })),
    ]).then(([engRes, projRes]) => {
      setEngineers(engRes.data || [])
      setProjects(projRes.data || [])
    })
  }, [])

  useEffect(() => {
    if (!form.project_id) {
      setSprints([])
      return
    }
    fetch(`/api/sprints?project_id=${form.project_id}&active=true`)
      .then((r) => r.json())
      .then((res) => setSprints(res.data || []))
      .catch(() => setSprints([]))
  }, [form.project_id])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (field === "project_id") {
      setForm((prev) => ({ ...prev, project_id: value, sprint_id: "" }))
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.engineer_id) {
      setError("Pilih nama engineer terlebih dahulu")
      return
    }
    if (!form.yesterday.trim() || !form.today.trim()) {
      setError("Isi pekerjaan kemarin dan hari ini")
      return
    }
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/standup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.message || "Gagal mengirim standup")
        return
      }
      setSubmitted(true)
    } catch {
      setError("Gagal terhubung ke server")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-xl shadow-md p-8 max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Standup Terkirim!</h2>
          <p className="text-sm text-gray-500 mb-6">Terima kasih. Standup kamu hari ini sudah diterima.</p>
          <Button
            onClick={() => {
              setForm(initialForm)
              setSubmitted(false)
            }}
          >
            Kirim Standup Lagi
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Daily Standup</h1>
          <p className="text-sm text-gray-500 mt-1">
            {new Date().toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Engineer <span className="text-red-500">*</span>
              </label>
              <Select
                value={form.engineer_id}
                onChange={(e) => handleChange("engineer_id", e.target.value)}
                required
              >
                <option value="">-- Pilih nama --</option>
                {engineers.map((eng) => (
                  <option key={eng.id} value={eng.id}>
                    {eng.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                <Select
                  value={form.project_id}
                  onChange={(e) => handleChange("project_id", e.target.value)}
                >
                  <option value="">-- Pilih project --</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
                <Select
                  value={form.sprint_id}
                  onChange={(e) => handleChange("sprint_id", e.target.value)}
                  disabled={!form.project_id}
                >
                  <option value="">-- Pilih sprint --</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kemarin saya mengerjakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.yesterday}
                onChange={(e) => handleChange("yesterday", e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Deskripsi pekerjaan kemarin..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hari ini saya akan mengerjakan <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.today}
                onChange={(e) => handleChange("today", e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Deskripsi pekerjaan hari ini..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blocker / Hambatan</label>
              <textarea
                value={form.blockers}
                onChange={(e) => handleChange("blockers", e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Tidak ada hambatan (kosongkan jika tidak ada)"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Mengirim..." : "Kirim Standup"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
