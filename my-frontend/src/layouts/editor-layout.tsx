import type { ReactNode } from 'react'

type EditorLayoutProps = {
  sidebar: ReactNode
  header: ReactNode
  content: ReactNode
}

export function EditorLayout({
  sidebar,
  header,
  content,
}: EditorLayoutProps) {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto grid min-h-screen max-w-[1680px] gap-5 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-6 lg:py-6">
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          {sidebar}
        </div>

        <section className="grid gap-5 lg:gap-6">
          {header}
          <div className="min-w-0">{content}</div>
        </section>
      </div>
    </main>
  )
}
