import { Landmark, ShieldCheck, TrendingUp } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ThemeToggle } from '@/components/theme-toggle'
import { LinkButton } from '@/components/link-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatPercent, formatQCompact } from '@/lib/format'
import { delinquencyRate, outstandingTotal } from '@/lib/mock-data'

export default async function LoginPage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('login')
  const tApp = await getTranslations('app')

  const collectionRate = formatPercent(100 - delinquencyRate, locale)
  const portfolio = formatQCompact(outstandingTotal, locale)
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

          <form className="mt-8 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input id="username" name="username" autoComplete="username" className="h-10" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t('password')}</Label>
                <span className="text-xs text-muted-foreground">{t('forgot')}</span>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            <LinkButton size="lg" className="h-10 w-full" href="/">
              {t('submit')}
            </LinkButton>
          </form>
        </div>
      </div>
    </div>
  )
}
