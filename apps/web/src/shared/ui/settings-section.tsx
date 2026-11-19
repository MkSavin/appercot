import type { ReactNode } from 'react'

export const SettingsSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="grid gap-3">
    <h2 className="text-base font-semibold">{title}</h2>
    <div className="settings-card grid gap-4">{children}</div>
  </section>
)
