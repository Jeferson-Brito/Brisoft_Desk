export function getMediaSource(message = {}) {
  if (message.media_url) return message.media_url
  if (message.mediaUrl) return message.mediaUrl
  const match = String(message.text || '').match(/\|\|(\/(?:api\/)?media\/[^\s]+)/)
  return match?.[1] || null
}

export function cleanMediaDisplayText(value, hasMediaSource = false) {
  const text = String(value || '').replace(/\|\|\/(?:api\/)?media\/[^\s]+/g, '').trim()
  if (!hasMediaSource) return text
  const automaticMarker = /^(?:📷|🎙️|🎵|🎥|🖼️|📄)?\s*\[(?:Imagem|Mensagem de Voz|Áudio|Vídeo|Figurinha|Documento(?::[^\]]+)?|Mídia\/Arquivo)\]$/i
  return automaticMarker.test(text) ? '' : text
}

export function getDocumentDisplayName(message = {}, source = '') {
  const textMatch = String(message.text || '').match(/\[Documento:\s*([^\]]+)\]/i)
  if (textMatch?.[1]) return textMatch[1]
  const fileName = String(source || '').split('/').pop()?.split('?')[0]
  if (!fileName) return 'Baixar documento'
  try { return decodeURIComponent(fileName).replace(/^doc_\d+_/, '') } catch { return fileName }
}
