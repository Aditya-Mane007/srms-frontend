import { useState } from "react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { locationCode, useStates } from "@/data"

type Item = { value: string; label: string }

/** shadcn Select that posts with FormData (`name`); `value` + `onValueChange` when controlled. */
export function SelectField({
  id,
  name,
  label,
  items,
  placeholder,
  value,
  defaultValue,
  onValueChange,
  required,
  disabled,
}: {
  id: string
  name: string
  label: string
  items: Item[]
  placeholder: string
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  required?: boolean
  disabled?: boolean
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && <span aria-hidden> *</span>}
      </FieldLabel>
      <Select
        name={name}
        items={items}
        required={required}
        disabled={disabled}
        {...(value !== undefined ? { value: value || null } : { defaultValue: defaultValue || null })}
        onValueChange={(v) => onValueChange?.((v as string | null) ?? "")}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {items.map((i) => (
            <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

/** shadcn date picker; posts `name` as YYYY-MM-DD, shows DD-MM-YYYY. */
export function DateField({ name, label, required, defaultValue }: { name: string; label: string; required?: boolean; defaultValue?: string }) {
  const [date, setDate] = useState(() => (defaultValue ? parse(defaultValue.slice(0, 10), "yyyy-MM-dd", new Date()) : undefined))
  const [open, setOpen] = useState(false)
  return (
    <Field>
      <FieldLabel htmlFor={name}>
        {label}
        {required && <span aria-hidden> *</span>}
      </FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button id={name} variant="outline" className="w-full justify-between font-normal" />}>
          {date ? format(date, "dd-MM-yyyy") : <span className="text-muted-foreground">Pick a date</span>}
          <CalendarIcon aria-hidden />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} defaultMonth={date} captionLayout="dropdown" onSelect={(d) => (setDate(d), setOpen(false))} />
        </PopoverContent>
      </Popover>
      {/* carries the value into FormData and blocks submit when required and empty */}
      <input className="sr-only" tabIndex={-1} aria-hidden name={name} required={required} value={date ? format(date, "yyyy-MM-dd") : ""} onChange={() => {}} />
    </Field>
  )
}

/** Labelled text input; `hint` is tied to the input for screen readers. */
export function TextField({
  name,
  label,
  hint,
  multiline,
  ...props
}: { name: string; label: string; hint?: string; multiline?: boolean } & React.ComponentProps<"input">) {
  const hintId = hint ? `${name}-hint` : undefined
  return (
    <Field>
      <FieldLabel htmlFor={name}>
        {label}
        {props.required && <span aria-hidden> *</span>}
      </FieldLabel>
      {multiline ? (
        <Textarea id={name} name={name} defaultValue={props.defaultValue as string} required={props.required} aria-describedby={hintId} maxLength={500} />
      ) : (
        <Input id={name} name={name} aria-describedby={hintId} {...props} />
      )}
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
    </Field>
  )
}

/**
 * State, city and location of a new site, with the site code shown live.
 * The code is built by the backend the same way; it can't be typed or edited.
 */
export function PlaceFields({ clientCode }: { clientCode: string }) {
  const { data: states = [] } = useStates()
  const [stateId, setStateId] = useState("")
  const [cityId, setCityId] = useState("")
  const [location, setLocation] = useState("")
  const state = states.find((s) => s.id === stateId)
  const city = state?.cities.find((c) => c.id === cityId)
  const code = [clientCode || "CLIENT", state?.code ?? "STATE", city?.code ?? "CITY", locationCode(location) || "LOCATION"].join("_")

  return (
    <>
      <SelectField
        id="stateId"
        name="stateId"
        label="State"
        required
        placeholder="Choose a state"
        items={states.filter((s) => s.active).map((s) => ({ value: s.id, label: s.name }))}
        value={stateId}
        onValueChange={(v) => (setStateId(v), setCityId(""))}
      />
      <SelectField
        id="cityId"
        name="cityId"
        label="City"
        required
        disabled={!state}
        placeholder={state ? "Choose a city" : "Choose a state first"}
        items={state?.cities.filter((c) => c.active).map((c) => ({ value: c.id, label: c.name })) ?? []}
        value={cityId}
        onValueChange={setCityId}
      />
      <TextField name="location" label="Location" required maxLength={100} value={location} onChange={(e) => setLocation(e.target.value)} hint="The location name, e.g. Platina. A different location is a different site." />
      <p className="rounded-md bg-muted px-3 py-2 font-mono text-sm" aria-live="polite">
        <span className="sr-only">Site code will be </span>
        {code}
      </p>
    </>
  )
}

/** The editable details shared by site create and edit. */
export function SiteDetailFields({ site }: { site?: { name: string; address: string | null; natureOfWork: string | null; workingHours: string | null; restInterval: string | null } }) {
  return (
    <>
      <TextField name="name" label="Site name" defaultValue={site?.name} maxLength={500} hint="Blank on a new site = the location name." />
      <TextField name="address" label="Address" multiline defaultValue={site?.address ?? ""} />
      <TextField name="natureOfWork" label="Nature of work" defaultValue={site?.natureOfWork ?? ""} maxLength={500} />
      <TextField name="workingHours" label="Working hours" defaultValue={site?.workingHours ?? ""} maxLength={500} placeholder="e.g. 9:00 AM – 6:00 PM" />
      <TextField name="restInterval" label="Rest interval" defaultValue={site?.restInterval ?? ""} maxLength={500} placeholder="e.g. 1:00 PM – 2:00 PM" />
    </>
  )
}
