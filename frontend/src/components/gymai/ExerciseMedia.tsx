import { useEffect, useMemo, useState } from 'react'
import type { Exercise } from '@/types'
import { resolveExerciseImages } from '@/services/exerciseImageService'
import { DemoVideoCard } from '@/components/gymai/DemoVideoCard'

/**
 * Media box for the active exercise: a photo matched by exercise NAME first,
 * then backend photo candidates; if none of them loads, the demo video card
 * fills the box (so it is never empty or shows a broken-image icon).
 */
export function ExerciseMedia({ exercise }: { exercise: Pick<Exercise, 'id' | 'name' | 'slug' | 'imageUrl' | 'imageUrls'> }) {
  const [byName, setByName] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    let active = true
    setByName(null); setIndex(0); setExhausted(false)
    resolveExerciseImages(exercise.name, exercise.slug).then((urls) => { if (active) setByName(urls) })
    return () => { active = false }
  }, [exercise.id, exercise.name, exercise.slug])

  const sources = useMemo(() => {
    const backup = (exercise.imageUrls?.length ? exercise.imageUrls : [exercise.imageUrl]).filter(Boolean)
    return Array.from(new Set([...(byName ?? []), ...backup]))
  }, [byName, exercise.imageUrls, exercise.imageUrl])

  const showVideo = byName !== null && (exhausted || sources.length === 0)

  return (
    <div className="relative min-h-[220px] overflow-hidden rounded-xl border border-surface-border bg-surface-raised md:h-full">
      {byName === null ? (
        <div className="absolute inset-0 animate-pulse bg-charcoal-soft" aria-hidden />
      ) : showVideo ? (
        <DemoVideoCard />
      ) : (
        <img
          key={sources[index]}
          src={sources[index]}
          alt={`${exercise.name} exercise demonstration`}
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
          onError={() => (index < sources.length - 1 ? setIndex(index + 1) : setExhausted(true))}
        />
      )}
    </div>
  )
}
