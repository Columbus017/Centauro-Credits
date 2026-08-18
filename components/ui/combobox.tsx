"use client"

import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox"

import { cn } from "@/lib/utils"
import { CheckIcon, ChevronDownIcon, XIcon } from "lucide-react"

/**
 * The searchable counterpart of `components/ui/select.tsx`.
 *
 * Deliberately styled from the same class strings, because the two render side
 * by side on the same form — `SelectField` picks between them by option count,
 * and a visible seam there would read as a bug.
 *
 * `Combobox.Root` submits with a plain `name`, and derives both the displayed
 * label and the submitted value from a `{ value, label }` item without any
 * extra wiring, which is exactly the shape of `SelectOption`.
 */

const Combobox = ComboboxPrimitive.Root

function ComboboxInputGroup({
  className,
  size = "default",
  children,
  ...props
}: ComboboxPrimitive.InputGroup.Props & {
  size?: "sm" | "default"
}) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      data-size={size}
      className={cn(
        "relative flex w-full items-center gap-1.5 rounded-lg border border-input bg-transparent pr-1.5 pl-2.5 text-sm transition-colors outline-none focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 has-data-disabled:cursor-not-allowed has-data-disabled:opacity-50 has-aria-invalid:border-destructive has-aria-invalid:ring-3 has-aria-invalid:ring-destructive/20 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
    </ComboboxPrimitive.InputGroup>
  )
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-input"
      className={cn(
        // `any-pointer-coarse:text-base` keeps iOS from zooming the viewport
        // when the field takes focus.
        "h-full min-w-0 flex-1 bg-transparent text-sm any-pointer-coarse:text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
  )
}

function ComboboxTrigger({
  className,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      aria-label="Open"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      <ComboboxPrimitive.Icon render={<ChevronDownIcon className="size-4" />} />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-none transition-colors hover:text-foreground",
        className
      )}
      {...props}
    >
      <XIcon className="size-4" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "start",
  alignOffset = 0,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        className="isolate z-50 outline-none"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto overscroll-contain p-1 outline-none data-empty:p-0",
        className
      )}
      {...props}
    />
  )
}

/**
 * Renders only when nothing matched. Base UI keeps this element mounted so the
 * change is announced politely — do not conditionally render it away.
 */
function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "px-3 py-6 text-center text-sm text-muted-foreground empty:p-0",
        className
      )}
      {...props}
    />
  )
}

function ComboboxItem({
  className,
  children,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        // Base UI Select drives this off `focus:`; Combobox uses
        // `data-highlighted`, so the highlight tracks the keyboard cursor while
        // focus stays in the input. Same colours either way.
        "relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1.5 pr-8 pl-1.5 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export {
  Combobox,
  ComboboxClear,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
}
