import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

import { AuthHero } from './auth-hero'

type AuthShellProps = {
  badge: string
  title: string
  description: string
  formTitle: string
  formDescription: string
  footerText: string
  footerLinkLabel: string
  footerLinkTo: string
  children: ReactNode
}

export function AuthShell({
  badge,
  title,
  description,
  formTitle,
  formDescription,
  footerText,
  footerLinkLabel,
  footerLinkTo,
  children,
}: AuthShellProps) {
  return (
    <main className="min-h-screen text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center px-4 py-8 lg:px-6">
        <section className="panel-dark grid w-full gap-6 rounded-[2rem] p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <AuthHero
            badge={badge}
            title={title}
            description={description}
          />

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-6">
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/80">
                Authentication
              </div>
              <h2 className="mt-2 font-['Space_Grotesk',_'Segoe_UI',_sans-serif] text-3xl font-semibold text-white">
                {formTitle}
              </h2>
              <p className="mt-2 text-sm text-slate-400">{formDescription}</p>
            </div>

            {children}

            <div className="mt-5 text-sm text-slate-400">
              {footerText}{' '}
              <Link
                to={footerLinkTo}
                className="font-semibold text-cyan-200 underline decoration-cyan-400/40 underline-offset-4"
              >
                {footerLinkLabel}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
