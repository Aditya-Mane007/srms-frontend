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
        classNames: {
          toast: "cn-toast pr-10",
          // sonner puts the X on the top-left corner; move it to the end of the message
          closeButton:
            "!left-auto !right-2 !top-1/2 !-translate-y-1/2 !transform !border-0 !bg-transparent text-muted-foreground hover:!text-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
