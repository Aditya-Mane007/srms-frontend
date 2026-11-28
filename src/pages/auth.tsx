import { CheckIcon, EyeIcon, EyeOffIcon, KeyRoundIcon, LogInIcon, SendIcon } from "lucide-react"
import { useState, type ReactNode } from "react"
import { ErrorText, str, useSubmit } from "@/components/layout"
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router"
import { api, must } from "@/api/client"
import { useAuth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/** login-04 layout: form on the left, brand panel on the right. */
function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted p-6 md:p-10">
      <div className="w-full max-w-sm md:max-w-3xl">
        <Card className="overflow-hidden p-0 md:h-[70svh] md:min-h-fit">
          <CardContent className="grid h-full p-0 md:grid-cols-2">
            <div className="flex flex-col justify-center p-6 md:p-8">
              <FieldGroup>
                <div className="flex flex-col items-center gap-2 text-center">
                  <h1 className="text-2xl font-bold">{title}</h1>
                  <p className="text-balance text-muted-foreground">{subtitle}</p>
                </div>
                {children}
              </FieldGroup>
            </div>
            <div className="relative hidden flex-col justify-end bg-primary p-8 text-primary-foreground md:flex">
              <p className="text-2xl font-semibold">SRMS</p>
              <p className="text-sm opacity-80">Statutory registers, generated every month.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

export function LoginPage() {
  const { auth, login } = useAuth()
  const state = useLocation().state as { from?: string; email?: string } | null
  const from = state?.from ?? "/"
  const { busy, onSubmit } = useSubmit((d) => login(str(d, "email"), str(d, "password")))
  if (auth.status === "in") return <Navigate to={from} replace />
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to SRMS">
      <form onSubmit={onSubmit} className="contents">
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" defaultValue={state?.email ?? ""} required />
        </Field>
        <Field>
          <div className="flex items-center">
            <FieldLabel htmlFor="password">Password</FieldLabel>
            <Link to="/forgot-password" className="ml-auto text-sm underline-offset-2 hover:underline">
              Forgot your password?
            </Link>
          </div>
          <PasswordInput autoComplete="current-password" />
        </Field>
        <Field>
          <Button type="submit" disabled={busy}>
            <LogInIcon aria-hidden /> {busy ? "Signing in…" : "Sign in"}
          </Button>
        </Field>
      </form>
    </AuthCard>
  )
}

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { busy, onSubmit } = useSubmit(async (d) => {
    await must(api.POST("/auth/forgot-password", { body: { email: str(d, "email") } }))
    setSent(true)
  })
  return (
    <AuthCard title="Reset password" subtitle="We'll email you a link to set a new password">
      {sent ? (
        <p role="status">If that email has an account, a reset link is on its way. It is valid for 30 minutes.</p>
      ) : (
        <form onSubmit={onSubmit} className="contents">
          <Field>
            <FieldLabel htmlFor="email">Email</FieldLabel>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Button type="submit" disabled={busy}>
            <SendIcon aria-hidden /> Send link
          </Button>
        </form>
      )}
      <FieldDescription className="text-center">
        <Link to="/login">Back to sign in</Link>
      </FieldDescription>
    </AuthCard>
  )
}

/** Password input with an eye button that shows or hides what was typed. */
function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input id="password" name="password" required {...props} type={shown ? "text" : "password"} className="pr-9" />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="absolute inset-y-0 right-1 my-auto text-muted-foreground active:not-aria-[haspopup]:translate-y-0"
        aria-label={shown ? "Hide password" : "Show password"}
        aria-pressed={shown}
        onClick={() => setShown((v) => !v)}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </Button>
    </div>
  )
}

function NewPassword() {
  return (
    <Field>
      <FieldLabel htmlFor="password">New password</FieldLabel>
      <PasswordInput autoComplete="new-password" minLength={10} maxLength={200} aria-describedby="pw-hint" />
      <FieldDescription id="pw-hint">At least 10 characters.</FieldDescription>
    </Field>
  )
}

export function ResetPasswordPage() {
  const token = useSearchParams()[0].get("token") ?? ""
  const navigate = useNavigate()
  const { busy, onSubmit } = useSubmit(async (d) => {
    await must(api.POST("/auth/reset-password", { body: { token, password: str(d, "password") } }))
    navigate("/login", { replace: true })
  })
  return (
    <AuthCard title="Set a new password" subtitle="Choose a password for your account">
      <form onSubmit={onSubmit} className="contents">
        <NewPassword />
        <ErrorText error={token ? null : "This link is missing its token. Ask for a new one."} />
        <Button type="submit" disabled={busy || !token}>
          <KeyRoundIcon aria-hidden /> Save password
        </Button>
      </form>
    </AuthCard>
  )
}

export function AcceptInvitePage() {
  const token = useSearchParams()[0].get("token") ?? ""
  const navigate = useNavigate()
  const { busy, onSubmit } = useSubmit(async (d) => {
    const user = await must(
      api.POST("/invitations/accept", { body: { token, name: str(d, "name"), password: str(d, "password") } }),
    )
    navigate("/login", { replace: true, state: { email: user.email } })
  })
  return (
    <AuthCard title="Join SRMS" subtitle="Set your name and password to accept the invite">
      <form onSubmit={onSubmit} className="contents">
        <Field>
          <FieldLabel htmlFor="name">Your name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" maxLength={200} required />
        </Field>
        <NewPassword />
        <ErrorText error={token ? null : "This link is missing its token. Ask for a new invite."} />
        <Button type="submit" disabled={busy || !token}>
          <CheckIcon aria-hidden /> Accept invite
        </Button>
      </form>
    </AuthCard>
  )
}
