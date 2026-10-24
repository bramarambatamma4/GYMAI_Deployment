/**
 * Demo video shown in the exercise media box when no photo can be loaded.
 *
 * Pinterest short links (pin.it/...) cannot be embedded. To play it INSIDE the page,
 * open the pin in your browser, copy the full address (it looks like
 * https://www.pinterest.com/pin/1234567890123/) and paste it into `pinUrl`.
 * A direct video file also works: put its address in `mp4Url`.
 */
export const DEMO_VIDEO = {
  shortUrl: 'https://pin.it/5N3g0JYF2', // opens in a new tab until `pinUrl` or `mp4Url` is set
  pinUrl: '',
  mp4Url: '',
} as const

/** Numeric pin id from a full pinterest.com/pin/<id> address, or null. */
export function pinIdFrom(url: string): string | null {
  const match = url.match(/pinterest\.[a-z.]+\/pin\/(?:[^/]*--)?(\d+)/i)
  return match ? match[1] : null
}
