'use client'

import { Printer } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/button'

export function PrintButton() {
  const t = useTranslations('payments.receipt')

  return (
    <Button size="lg" onClick={() => window.print()}>
      <Printer className="size-4" />
      {t('print')}
    </Button>
  )
}
