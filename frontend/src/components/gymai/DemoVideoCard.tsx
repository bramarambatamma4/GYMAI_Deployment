import { ExternalLink, PlayCircle } from 'lucide-react'
import { DEMO_VIDEO, pinIdFrom } from '@/data/demoVideo'

/** Plays the configured demo video inline, or links to it when it cannot be embedded. */
export function DemoVideoCard() {
  const pinId = DEMO_VIDEO.pinUrl ? pinIdFrom(DEMO_VIDEO.pinUrl) : null

  if (DEMO_VIDEO.mp4Url) {
    return <video className="h-full w-full object-cover" src={DEMO_VIDEO.mp4Url} controls playsInline loop muted preload="metadata" />
  }
  if (pinId) {
    return (
      <iframe
        title="Exercise demo video"
        src={`https://assets.pinterest.com/ext/embed.html?id=${pinId}`}
        className="h-full min-h-[320px] w-full border-0"
        loading="lazy"
        allowFullScreen
      />
    )
  }
  return (
    <a
      href={DEMO_VIDEO.shortUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex h-full min-h-[220px] w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-orange/15 via-transparent to-orange/5 p-5 text-center"
    >
      <PlayCircle size={44} className="text-orange transition-transform group-hover:scale-110" />
      <span className="text-sm font-semibold text-ink">Watch exercise demo</span>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-orange/40 px-3 py-1 text-xs text-orange">Open video <ExternalLink size={12} /></span>
    </a>
  )
}
