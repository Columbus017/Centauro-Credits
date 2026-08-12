import { Landmark, ShieldCheck, TrendingUp } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ThemeToggle } from '@/components/theme-toggle'
import { LoginForm } from '@/components/login-form'
import { formatPercent, formatQCompact } from '@/lib/format'
import { publicHeadline } from '@/lib/queries/dashboard'

export default async function LoginPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('login')
  const tApp = await getTranslations('app')

  const headline = await publicHeadline()
  const collectionRate = formatPercent(headline.collectionRate, locale)
  const portfolio = formatQCompact(headline.outstanding, locale)
  const year = new Date().getFullYear()

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
            <Landmark className="size-5" />
          </div>
          <span className="text-lg font-semibold tracking-tight">{tApp('name')}</span>
        </div>

        <div className="max-w-md space-y-6">
          <p className="text-2xl leading-snug font-medium text-balance">{t('pitch')}</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-primary-foreground/10 p-4 ring-1 ring-primary-foreground/15">
              <div className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                <TrendingUp className="size-4" />
                {t('statCollection')}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {collectionRate}
              </div>
            </div>
            <div className="rounded-xl bg-primary-foreground/10 p-4 ring-1 ring-primary-foreground/15">
              <div className="flex items-center gap-1.5 text-sm text-primary-foreground/80">
                <ShieldCheck className="size-4" />
                {t('statPortfolio')}
              </div>
              <div className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {portfolio}
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-primary-foreground/70">
          © {year} {tApp('name')}. {t('rights')}
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-col items-center justify-center px-6 py-12">
        <div className="absolute top-5 right-5">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Landmark className="size-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">{tApp('name')}</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">{t('subtitle')}</p>

          <LoginForm />
        </div>
      </div>
    </div>
  )
}
