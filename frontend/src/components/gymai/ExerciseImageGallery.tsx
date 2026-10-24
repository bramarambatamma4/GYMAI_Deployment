import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react'
import type { Exercise } from '@/types'
import { resolveExerciseImages } from '@/services/exerciseImageService'
import { guideArtUrl, PLACEHOLDER_IMAGE } from '@/lib/mediaUrl'

export function ExerciseImageGallery({ exercise, compact = false }: { exercise: Exercise; compact?: boolean }) {
  // CHANGE 2: photos resolved from the exercise NAME come first; backend candidates are the backup.
  const [byName, setByName] = useState<string[] | null>(null)
  const [index, setIndex] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setByName(null); setIndex(0); setFailed(false)
    resolveExerciseImages(exercise.name, exercise.slug).then((urls) => { if (active) setByName(urls) })
    return () => { active = false }
  }, [exercise.id, exercise.name, exercise.slug])

  // Order: photo matched by name -> backend photo candidates -> backend guide art. Each failing URL moves on to the next;
  // when all fail an inline placeholder is shown, so no card is ever blank or broken.
  const photos = useMemo(() => {
    const backup = exercise.imageUrls?.length ? exercise.imageUrls : [exercise.imageUrl]
    return Array.from(new Set([...(byName ?? []), ...backup, guideArtUrl(exercise.slug)].filter(Boolean)))
  }, [byName, exercise.imageUrls, exercise.imageUrl, exercise.slug])

  const source = failed ? PLACEHOLDER_IMAGE : photos[index] ?? PLACEHOLDER_IMAGE
  const step = (dir: 1 | -1) => setIndex((v) => (v + dir + photos.length) % photos.length)
  const showControls = !compact && photos.length > 1 && !failed

  return (
    <div className={`relative w-full overflow-hidden rounded-2xl bg-charcoal ${compact ? 'aspect-[16/9]' : 'aspect-[4/3] sm:aspect-[16/8]'}`}>
      {byName === null ? (
        <div className="h-full w-full animate-pulse bg-charcoal-soft" aria-hidden />
      ) : (
        <img
          key={source}
          src={source}
          alt={`${exercise.name} exercise demonstration`}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => {
            // Try the next photo of this exercise before giving up to the local guide art.
            if (index < photos.length - 1) setIndex(index + 1)
            else setFailed(true)
          }}
        />
      )}

      {showControls && (
        <>
          <button type="button" onClick={() => step(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2 text-white backdrop-blur-md" aria-label="Previous exercise photo"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => step(1)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-black/55 p-2 text-white backdrop-blur-md" aria-label="Next exercise photo"><ChevronRight size={16} /></button>
        </>
      )}

      <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-xl border border-white/10 bg-black/55 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-md">
        <ImageIcon size={13} className="text-emerald" />
        {failed ? 'Exercise guide' : index === 0 ? 'Start position' : 'Movement view'}
      </div>
    </div>
  )
}
