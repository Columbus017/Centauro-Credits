import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { displayLabel } from '@/lib/option-search'

export type SelectOption = {
  value: string
  label: string
  /**
   * A second line under `label` — the client's name beneath a card number.
   *
   * The searchable variant stacks the two; this plain one joins them on a
   * single line. Both are searched. It is optional because most option lists
   * (collectors, roles, statuses) have nothing to put there.
   */
  detail?: string
}

/**
 * A labelled select.
 *
 * Base UI's `Select.Value` renders the raw *value* unless the root is given an
 * `items` map — without it a collector picker shows "1" instead of the name.
 * Deriving `items` from the same options that build the list keeps the trigger
 * and the popup from ever disagreeing.
 */
export function SelectField({
  options,
  defaultValue,
  className,
  size,
  name,
  onValueChange,
}: {
  options: SelectOption[]
  defaultValue?: string
  className?: string
  size?: React.ComponentProps<typeof SelectTrigger>['size']
  name?: string
  /**
   * For selects inside a repeater, whose value has to be mirrored in state.
   *
   * Only ever passed by a Client Component. This component itself is a Server
   * Component, and forwarding a handler unconditionally — even a wrapper
   * around `undefined` — makes every server-rendered page that uses a select
   * fail with "Event handlers cannot be passed to Client Component props".
   */
  onValueChange?: (value: string) => void
}) {
  // One list feeds both `items` and the popup, so the trigger and the options
  // can never disagree about what a row says — including its second line.
  const items = options.map((option) => ({
    value: option.value,
    label: displayLabel(option),
  }))

  return (
    <Select
      items={items}
      name={name}
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={
        onValueChange ? (value) => onValueChange(String(value)) : undefined
      }
    >
      <SelectTrigger size={size} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
