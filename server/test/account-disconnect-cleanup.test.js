const test = require('node:test');
const assert = require('node:assert/strict');
const ticketService = require('../src/services/ticket.service');

test('handleAccountDisconnected lida com parâmetros ausentes com segurança', async () => {
  const result = await ticketService.handleAccountDisconnected(null);
  assert.equal(result.success, false);
  assert.equal(result.closedCount, 0);
  assert.equal(result.inactivedGroupsCount, 0);

  const resultEmpty = await ticketService.handleAccountDisconnected('');
  assert.equal(resultEmpty.success, false);
});

test('handleAccountDisconnected aceita motivos manual_disconnect e device_logout', async () => {
  // Teste de chamada com conta fictícia que não possui tickets no Supabase
  const fakeIo = {
    events: [],
    emit(event, data) {
      this.events.push({ event, data });
    },
    to() {
      return this;
    }
  };

  const result = await ticketService.handleAccountDisconnected('non-existent-account-id', 'manual_disconnect', fakeIo);
  assert.equal(result.success, true);
  assert.equal(result.closedCount, 0);
  assert.equal(result.inactivedGroupsCount, 0);
});

test('makeInitials gera iniciais limpas e não quebra com emojis nem gera surrogates inválidos', () => {
  const { makeInitials } = ticketService._test;
  
  // Grupo com emoji como #soucombatente 🛡️
  const initialsCombatente = makeInitials('#soucombatente 🛡️');
  assert.equal(initialsCombatente, 'SO');
  
  // Grupo com emoji no início
  const initialsShield = makeInitials('🛡️ Suporte Técnico');
  assert.equal(initialsShield, 'ST');
  
  // Grupo somente com emojis
  const initialsEmojiOnly = makeInitials('🛡️🔥');
  assert.equal(initialsEmojiOnly, '🛡️');

  // Serialização JSON nunca deve falhar ou conter surrogates soltos
  const json = JSON.stringify({ initials: initialsCombatente, emojiInitials: initialsEmojiOnly });
  assert.ok(json.includes('SO'));
});

