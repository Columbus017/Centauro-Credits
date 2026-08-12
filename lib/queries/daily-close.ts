import 'server-only'

import { db } from '@/lib/db'
import { fromDbAmount, fromDbDate } from '@/lib/db-utils'
import { dailyCloseCash } from '@/lib/ledger'

export type DailyCloseRow = {
  id: number
  collectorId: number
  collectorName: string
  closeDate: string
  collected: number
  base: number
  surplus: number
  disbursed: number
  cash: number
}

export async function listDailyCloses(
  filter: { collectorId?: number } = {},
  limit = 30,
): Promise<DailyCloseRow[]> {
  const rows = await db.dailyClose.findMany({
    where: filter.collectorId ? { collectorId: filter.collectorId } : {},
    include: { collector: true },
    orderBy: [{ closeDate: 'desc' }, { id: 'desc' }],
    take: limit,
  })

  return rows.map((row) => {
    const close = {
      collected: fromDbAmount(row.collected),
      base: fromDbAmount(row.base),
      surplus: fromDbAmount(row.surplus),
      disbursed: fromDbAmount(row.disbursed),
    }

    return {
      id: row.id,
      collectorId: row.collectorId,
      collectorName: `${row.collector.firstName} ${row.collector.lastName}`,
      closeDate: fromDbDate(row.closeDate),
      ...close,
      cash: dailyCloseCash(close),
    }
  })
}
