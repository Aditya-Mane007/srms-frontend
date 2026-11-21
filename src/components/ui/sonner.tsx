"use client"


import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light"

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      closeButton
      toastOptions={{
        // tinted card per type, icon in a white circle, X top-right (theme tokens: destructive/warning/success/info)
        classNames: {
          toast: "!items-start !gap-3 !rounded-xl !p-4 !pr-10 !shadow-lg !bg-linear-to-b to-popover",
          icon: "!m-0 !size-9 shrink-0 place-items-center rounded-full bg-background shadow-sm [&>svg]:!size-4.5",
          title: "!text-sm !font-semibold",
          description: "!text-sm !text-muted-foreground",
          error: "from-destructive/15 [&_[data-icon]]:text-destructive",
          warning: "from-warning/15 [&_[data-icon]]:text-warning",
          success: "from-success/15 [&_[data-icon]]:text-success",
          info: "from-info/15 [&_[data-icon]]:text-info",
          closeButton:
            "!left-auto !right-3 !top-4 !transform-none !border-0 !bg-transparent text-muted-foreground hover:!text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
