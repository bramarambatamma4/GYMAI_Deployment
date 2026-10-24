/**
 * CHANGE 2: maps an exercise NAME to real demonstration photos.
 *
 * The open Free Exercise DB catalog (public domain) is fetched once, indexed by
 * name, cached in localStorage, and every GymAI exercise is matched to its own
 * entry (exact name -> alias -> best word-overlap). No match = no photo, so the
 * UI falls back to local guide art instead of showing a different exercise.
 */
const RAW = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main'
const CATALOG_URL = `${RAW}/dist/exercises.json`
const IMAGE_BASE = `${RAW}/exercises/`
const CACHE_KEY = 'gymai_exercise_catalog_v1'

interface CatalogEntry { id: string; name: string; images: string[] }
interface IndexedEntry extends CatalogEntry { key: string; tokens: Set<string> }

// Words that describe equipment/intensity rather than the movement itself.
const NOISE = new Set(['the', 'a', 'of', 'with', 'heavy', 'weighted', 'paused', 'bodyweight', 'body', 'weight', 'lifting'])

// Slug-level overrides for GymAI names that differ from the catalog's naming.
const ID_BY_SLUG: Record<string, string> = {
  'beginner-bodyweight-good-morning': 'Good_Morning', // shown as "Lifting Body" in the UI
}

const singular = (w: string) => (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)
const tokenize = (name: string) =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean).map(singular)
const keyOf = (name: string) => tokenize(name).join('')

let indexPromise: Promise<IndexedEntry[]> | null = null

function buildIndex(entries: CatalogEntry[]): IndexedEntry[] {
  return entries.map((e) => ({ ...e, key: keyOf(e.name), tokens: new Set(tokenize(e.name).filter((t) => !NOISE.has(t))) }))
}

function loadIndex(): Promise<IndexedEntry[]> {
  if (indexPromise) return indexPromise
  indexPromise = (async () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) return buildIndex(JSON.parse(cached) as CatalogEntry[])
    } catch { /* ignore corrupt cache */ }
    const res = await fetch(CATALOG_URL)
    if (!res.ok) throw new Error(`catalog ${res.status}`)
    const raw = (await res.json()) as CatalogEntry[]
    const slim = raw.map(({ id, name, images }) => ({ id, name, images: images ?? [] }))
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(slim)) } catch { /* quota: fine */ }
    return buildIndex(slim)
  })().catch((err) => { indexPromise = null; throw err })
  return indexPromise
}

function bestMatch(name: string, slug: string | undefined, index: IndexedEntry[]): IndexedEntry | null {
  const forced = slug ? ID_BY_SLUG[slug] : undefined
  if (forced) return index.find((e) => e.id === forced) ?? null

  const key = keyOf(name)
  const exact = index.find((e) => e.key === key)
  if (exact) return exact

  const want = new Set(tokenize(name).filter((t) => !NOISE.has(t)))
  if (want.size === 0) return null
  let best: IndexedEntry | null = null
  let bestScore = 0
  for (const entry of index) {
    let shared = 0
    want.forEach((t) => { if (entry.tokens.has(t)) shared += 1 })
    if (shared === 0) continue
    const score = shared / (want.size + entry.tokens.size - shared) // Jaccard
    if (score > bestScore || (score === bestScore && best && entry.name.length < best.name.length)) { best = entry; bestScore = score }
  }
  return bestScore >= 0.6 ? best : null
}

/** Photo URLs (movement start/end) for one exercise; empty when no confident match. */
export async function resolveExerciseImages(name: string, slug?: string): Promise<string[]> {
  try {
    const match = bestMatch(name, slug, await loadIndex())
    return match ? match.images.map((path) => IMAGE_BASE + path) : []
  } catch {
    return [] // offline / blocked: caller falls back to backend candidates
  }
}
