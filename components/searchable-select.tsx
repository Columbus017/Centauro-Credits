'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

import type { SelectOption } from '@/components/select-field'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
} from '@/components/ui/combobox'
import { displayLabel, filterOptions } from '@/lib/option-search'

/**
 * The searchable half of `SelectField`, for option lists too long to scan.
 *
 * Base UI's `Select` has typeahead but renders the query nowhere, so an
 * operator looking up a card number types blind. Here the query is the input.
 *
 * Same prop surface as `SelectField` on purpose — the two are interchangeable
 * and `SelectField` picks between them by option count.
 */
export function SearchableSelect({
  options,
  defaultValue,
  className,
  size,
  name,
  autoFocus,
  onValueChange,
}: {
  options: SelectOption[]
  defaultValue?: string
  className?: string
  size?: 'sm' | 'default'
  name?: string
  /** Focus the search input on mount, for a row a repeater just added. */
  autoFocus?: boolean
  onValueChange?: (value: string) => void
}) {
  const t = useTranslations('common')
  const [open, setOpen] = useState(false)

  // Base UI holds the whole option object as the value, not the id string.
  //
  // Resolved once and frozen: after mount the Combobox owns its own selection,
  // and feeding a *changing* `defaultValue` to an uncontrolled one is both a
  // no-op and a console warning. Callers that need the field to reset — the
  // daily-close repeater when the collector changes — remount it with a `key`.
  const [initialValue] = useState(
    () => options.find((option) => option.value === defaultValue) ?? null,
  )

  return (
    <Combobox
      items={options}
      name={name}
      defaultValue={initialValue}
      onOpenChange={setOpen}
      // `{ value, label }` is the shape Base UI submits and displays from
      // automatically; only the joined second line needs saying.
      itemToStringLabel={displayLabel}
      // Reuses the same matcher the tests cover, one option at a time.
      filter={(option, query) => filterOptions([option as SelectOption], query).length > 0}
      autoHighlight
      onValueChange={
        onValueChange
          ? (value) => onValueChange(value ? (value as SelectOption).value : '')
          : undefined
      }
    >
      <ComboboxInputGroup size={size} className={className}>
        <ComboboxInput
          autoFocus={autoFocus}
          // Open, the field is a search box; closed, it is a picker.
          placeholder={open ? t('searchOption') : t('selectPlaceholder')}
        />
        <ComboboxTrigger />
      </ComboboxInputGroup>

      <ComboboxContent>
        <ComboboxEmpty>{t('noResults')}</ComboboxEmpty>
        <ComboboxList>
          {(option: SelectOption) => (
            <ComboboxItem key={option.value} value={option}>
              <span className="flex min-w-0 flex-col text-left">
                {/* Mono only when there is a second line: that is the case
                    where the first line is a card number being matched against
                    a paper card, not a person's name. */}
                <span className={option.detail ? 'font-mono' : undefined}>
                  {option.label}
                </span>
                {option.detail ? (
                  <span className="truncate text-xs text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  )
}
