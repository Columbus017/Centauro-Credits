'use client'

import * as React from 'react'
import { Toast as ToastPrimitive } from '@base-ui/react/toast'
import { CheckCircle2, XIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * A module-level manager, not a hook, so any client component — a dialog,
 * ActionButton, or the redirect listener — can fire a toast without sitting
 * inside ToastProvider's own render tree.
 */
export const toastManager = ToastPrimitive.createToastManager()

export function toastSuccess(message: string) {
  toastManager.add({ title: message, type: 'success' })
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      {children}
      <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-2 outline-none">
        <ToastList />
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Provider>
  )
}

function ToastList() {
  const { toasts } = ToastPrimitive.useToastManager()

  return toasts.map((toast) => (
    <ToastPrimitive.Root
      key={toast.id}
      toast={toast}
      className={cn(
        'relative flex items-start gap-2 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 duration-100',
        'data-starting-style:animate-in data-starting-style:fade-in-0 data-starting-style:slide-in-from-bottom-2',
        'data-ending-style:animate-out data-ending-style:fade-out-0',
        // Toasts past the Provider's `limit` are marked, not removed — they
        // wait inert and hidden until an earlier one closes and promotes them.
        'data-limited:hidden',
      )}
    >
      <CheckCircle2 className="mt-px size-4 shrink-0 text-success" />
      <ToastPrimitive.Title className="flex-1 text-sm leading-none font-medium" />
      <ToastPrimitive.Close
        className="shrink-0 rounded-md text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Close"
      >
        <XIcon className="size-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  ))
}
