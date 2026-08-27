const test = require('node:test');
const assert = require('node:assert/strict');

const whatsappService = require('../src/services/whatsapp.service');

test('identifica mídia dentro de mensagens temporárias e de visualização única', () => {
  const imageMessage = { mimetype: 'image/jpeg', caption: 'Teste' };
  const wrapped = {
    ephemeralMessage: {
      message: {
        viewOnceMessageV2: {
          message: { imageMessage }
        }
      }
    }
  };
  assert.equal(whatsappService._test.unwrapMessageContent(wrapped).imageMessage, imageMessage);
});

test('remove caracteres inseguros de identificadores usados em arquivos', () => {
  assert.equal(whatsappService._test.safeFileToken('../abc,123'), 'abc123');
});
