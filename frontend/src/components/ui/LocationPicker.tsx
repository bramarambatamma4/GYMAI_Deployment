import { useMemo } from 'react'
import { Combobox } from '@/components/ui/Combobox'
import { STATES, getCountries, getAreas } from '@/data/locations'
interface Props { country: string; state: string; area?: string; onChange: (country: string, state: string, area?: string) => void }
export function LocationPicker({ country, state, area, onChange }: Props) {
 const countries=useMemo(getCountries,[]), states=STATES[country]??[], areas=getAreas(country,state)
 return <div className="space-y-2"><Combobox value={country} onChange={c=>onChange(c,'','')} options={countries} placeholder="Country - select" ariaLabel="Country"/><Combobox value={state} onChange={v=>onChange(country,v,'')} options={states} disabled={!country} placeholder="State - select" ariaLabel="State"/><Combobox value={area ?? ''} onChange={v=>onChange(country,state,v)} options={areas} disabled={!state} placeholder="Area / city - select" ariaLabel="Area"/></div>
}
