import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Standup Tracker",
  description: "Daily Standup & Resource Tracker — Gamatecha",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
