import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanMediaDisplayText, getDocumentDisplayName, getMediaSource } from '../src/utils/media-message.js'

test('encontra URLs de mídia novas e legadas', () => {
  assert.equal(getMediaSource({ media_url: '/api/media/a.jpg' }), '/api/media/a.jpg')
  assert.equal(getMediaSource({ text: '📷 [Imagem]||/api/media/a.jpg' }), '/api/media/a.jpg')
  assert.equal(getMediaSource({ text: '📷 [Imagem]||/media/a.jpg' }), '/media/a.jpg')
})

test('remove o endereço técnico e o marcador automático, preservando legendas', () => {
  assert.equal(cleanMediaDisplayText('🎙️ [Mensagem de Voz]||/api/media/a.ogg', true), '')
  assert.equal(cleanMediaDisplayText('Foto do equipamento||/api/media/a.jpg', true), 'Foto do equipamento')
})

test('mostra o nome original de documentos', () => {
  assert.equal(getDocumentDisplayName({ text: '📄 [Documento: proposta.pdf]' }, '/api/media/doc_1_proposta.pdf'), 'proposta.pdf')
})
