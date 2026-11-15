import { useState } from "react"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { NativeSelect } from "@/components/layout"
import { locationCode, useStates } from "@/data"

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
      <Field>
        <FieldLabel htmlFor="stateId">State *</FieldLabel>
        <NativeSelect id="stateId" name="stateId" required value={stateId} onChange={(e) => (setStateId(e.target.value), setCityId(""))}>
          <option value="">Choose a state</option>
          {states.filter((s) => s.active).map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </NativeSelect>
      </Field>
      <Field>
        <FieldLabel htmlFor="cityId">City *</FieldLabel>
        <NativeSelect id="cityId" name="cityId" required value={cityId} onChange={(e) => setCityId(e.target.value)} disabled={!state}>
          <option value="">{state ? "Choose a city" : "Choose a state first"}</option>
          {state?.cities.filter((c) => c.active).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </NativeSelect>
      </Field>
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
