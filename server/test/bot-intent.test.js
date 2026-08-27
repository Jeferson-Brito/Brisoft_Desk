const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeBotInput, matchesCustomerCancellation } = require('../src/services/bot-intent.service');

const keywords = 'cancelar,encerrar,sair,parar,desistir,finalizar,0,não quero mais,cancelar atendimento';

test('normaliza acentos, pontuação e caracteres invisíveis', () => {
  assert.equal(normalizeBotInput('  NÃO\u200B quero mais!  '), 'nao quero mais');
});

test('reconhece cancelamento direto e frases naturais', () => {
  for (const message of ['cancelar', '0', 'Pode cancelar', 'não quero mais atendimento', 'não preciso mais', 'deixa pra lá', 'quero encerrar o chamado']) {
    assert.equal(matchesCustomerCancellation(message, keywords), true, message);
  }
});

test('não confunde negação ou dúvida com pedido de cancelamento', () => {
  for (const message of ['não quero cancelar', 'como cancelar um boleto?', 'talvez eu cancele depois', 'continuar atendimento']) {
    assert.equal(matchesCustomerCancellation(message, keywords), false, message);
  }
});
