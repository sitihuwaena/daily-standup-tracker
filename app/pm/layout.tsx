import { PMSidebar } from "@/components/pm-sidebar"

export default function PMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <PMSidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
