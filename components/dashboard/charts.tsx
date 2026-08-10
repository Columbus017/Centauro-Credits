'use client'

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useLocale, useTranslations } from 'next-intl'

import { formatMonth, formatNumber, formatQ, formatQCompact } from '@/lib/format'
import {
  agingBuckets,
  closeCash,
  collectorPerformance,
  monthlyCashFlow,
  monthlyTrend,
} from '@/lib/mock-data'

const axisProps = {
  stroke: 'var(--color-muted-foreground)',
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const

function TooltipBox({
  label,
  rows,
}: {
  label?: string
  rows: { name: string; value: string; color?: string }[]
}) {
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <div className="mb-1 font-medium text-popover-foreground">{label}</div>}
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.name} className="flex items-center gap-2">
            {row.color && (
              <span className="size-2 rounded-full" style={{ background: row.color }} />
            )}
            <span className="text-muted-foreground">{row.name}</span>
            <span className="ml-auto font-mono font-medium text-popover-foreground tabular-nums">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Capital placed against cash collected, by month. */
export function PortfolioTrendChart() {
  const locale = useLocale()
  const t = useTranslations('dashboard.trend')

  const data = monthlyTrend.map((point) => ({
    ...point,
    label: formatMonth(point.month, locale),
  }))

  const names: Record<string, string> = {
    disbursed: t('disbursed'),
    collected: t('collected'),
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <defs>
          <linearGradient id="gDisbursed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps} dy={6} />
        <YAxis
          {...axisProps}
          width={56}
          tickFormatter={(value) => formatQCompact(Number(value), locale)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--color-border)' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox
                label={label as string}
                rows={payload.map((point) => ({
                  name: names[String(point.dataKey)] ?? String(point.dataKey),
                  value: formatQ(Number(point.value), locale),
                  color: point.color,
                }))}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="disbursed"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          fill="url(#gDisbursed)"
        />
        <Area
          type="monotone"
          dataKey="collected"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          fill="url(#gCollected)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

/** Base, collections, surplus and the resulting net cash per month. */
export function CashFlowChart() {
  const locale = useLocale()
  const t = useTranslations('dashboard.cashFlow')

  const data = monthlyCashFlow.map((point) => ({
    label: formatMonth(point.month, locale),
    base: point.base,
    collected: point.collected,
    surplus: point.surplus,
    cash: closeCash({
      id: 0,
      collectorId: 0,
      closeDate: point.month,
      base: point.base,
      collected: point.collected,
      surplus: point.surplus,
      disbursed: point.disbursed,
    }),
  }))

  const names: Record<string, string> = {
    base: t('base'),
    collected: t('collected'),
    surplus: t('surplus'),
    cash: t('cash'),
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps} dy={6} />
        <YAxis
          {...axisProps}
          width={56}
          tickFormatter={(value) => formatQCompact(Number(value), locale)}
        />
        <Tooltip
          cursor={{ stroke: 'var(--color-border)' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox
                label={label as string}
                rows={payload.map((point) => ({
                  name: names[String(point.dataKey)] ?? String(point.dataKey),
                  value: formatQ(Number(point.value), locale),
                  color: point.color,
                }))}
              />
            ) : null
          }
        />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">
              {names[String(value)] ?? String(value)}
            </span>
          )}
        />
        <Line type="monotone" dataKey="base" stroke="var(--color-chart-4)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="collected" stroke="var(--color-chart-3)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="surplus" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="cash" stroke="var(--color-chart-1)" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Outstanding book against cash collected, per collector. */
export function CollectorPerformanceChart() {
  const locale = useLocale()
  const t = useTranslations('dashboard.collectorPerformance')

  const data = collectorPerformance().map((entry) => ({
    label: entry.name,
    portfolio: entry.portfolio,
    collected: entry.collected,
  }))

  const names: Record<string, string> = {
    portfolio: t('portfolio'),
    collected: t('collected'),
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 3" />
        <XAxis dataKey="label" {...axisProps} dy={6} interval={0} />
        <YAxis
          {...axisProps}
          width={56}
          tickFormatter={(value) => formatQCompact(Number(value), locale)}
        />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)' }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <TooltipBox
                label={label as string}
                rows={payload.map((point) => ({
                  name: names[String(point.dataKey)] ?? String(point.dataKey),
                  value: formatQ(Number(point.value), locale),
                  color: point.color,
                }))}
              />
            ) : null
          }
        />
        <Bar dataKey="portfolio" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="collected" fill="var(--color-chart-3)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const agingColors: Record<string, string> = {
  current: 'var(--color-chart-3)',
  d1to30: 'var(--color-chart-4)',
  d31to60: 'var(--color-chart-5)',
  d60plus: 'var(--color-destructive)',
}

/** Live credits bucketed by days since their last payment. */
export function AgingChart() {
  const locale = useLocale()
  const t = useTranslations('dashboard.aging')

  const buckets = agingBuckets()
  const data = buckets.map((bucket) => ({
    key: bucket.key,
    label: t(bucket.key),
    value: bucket.credits,
    amount: bucket.amount,
  }))

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width="100%" height={200} className="max-w-56">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.key} fill={agingColors[entry.key]} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) =>
              active && payload?.length ? (
                <TooltipBox
                  rows={[
                    {
                      name: String(payload[0].name),
                      value: `${formatNumber(Number(payload[0].value), locale)} ${t('credits')}`,
                      color: payload[0].payload.fill,
                    },
                  ]}
                />
              ) : null
            }
          />
        </PieChart>
      </ResponsiveContainer>

      <ul className="w-full flex-1 space-y-2">
        {data.map((entry) => (
          <li key={entry.key} className="flex items-center gap-2 text-sm">
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ background: agingColors[entry.key] }}
            />
            <span className="text-muted-foreground">{entry.label}</span>
            <span className="ml-auto font-mono text-xs tabular-nums">
              {formatNumber(entry.value, locale)}
            </span>
            <span className="w-24 text-right font-mono text-xs tabular-nums text-muted-foreground">
              {formatQ(entry.amount, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
