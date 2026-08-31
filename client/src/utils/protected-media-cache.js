import http from '@/api/http'
import { getMediaSource } from '@/utils/media-message'

const MAX_CACHED_MEDIA = 100
const mediaCache = new Map()

function trimCache() {
  if (mediaCache.size <= MAX_CACHED_MEDIA) return
  const entries = [...mediaCache.entries()].filter(([, entry]) => entry.settled).sort((a, b) => a[1].lastUsed - b[1].lastUsed)
  const excess = Math.min(entries.length, mediaCache.size - MAX_CACHED_MEDIA)
  for (const [key, entry] of entries.slice(0, excess)) {
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
    mediaCache.delete(key)
  }
}

export async function loadProtectedMedia(source) {
  const existing = mediaCache.get(source)
  if (existing) {
    existing.lastUsed = Date.now()
    return existing.promise
  }

  const entry = { lastUsed: Date.now(), objectUrl: null, promise: null, settled: false }
  const apiPath = source.startsWith('/api/') ? source.slice(4) : source
  const refreshedPath = `${apiPath}${apiPath.includes('?') ? '&' : '?'}media_cache=2`
  entry.promise = http
    .get(refreshedPath, { responseType: 'blob', headers: { 'Cache-Control': 'no-cache' } })
    .then(response => {
      entry.objectUrl = URL.createObjectURL(response.data)
      entry.settled = true
      trimCache()
      return entry.objectUrl
    })
    .catch(error => {
      mediaCache.delete(source)
      throw error
    })
  mediaCache.set(source, entry)
  trimCache()
  return entry.promise
}

export function clearProtectedMediaCache() {
  for (const entry of mediaCache.values()) {
    if (entry.objectUrl) URL.revokeObjectURL(entry.objectUrl)
  }
  mediaCache.clear()
}

export async function preloadTicketMedia(messages = [], concurrency = 3) {
  const sources = [...new Set(messages.map(getMediaSource).filter(source => source?.startsWith('/api/media/') || source?.startsWith('/media/')))]
  let cursor = 0
  async function worker() {
    while (cursor < sources.length) {
      const source = sources[cursor++]
      await loadProtectedMedia(source).catch(() => null)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, sources.length) }, worker))
  return sources.length
}
