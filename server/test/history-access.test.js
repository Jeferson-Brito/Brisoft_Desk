const test = require('node:test');
const assert = require('node:assert/strict');
const ticketService = require('../src/services/ticket.service');

const visible = ticketService._test.historyTicketVisibleToUser;

test('administrador consulta qualquer conversa finalizada', () => {
  assert.equal(visible({ role: 'Administrador' }, { id: 't1', department_id: 'financeiro' }), true);
});

test('supervisor consulta somente conversas dos departamentos vinculados', () => {
  const supervisor = { role: 'Supervisor', department_ids: ['financeiro', 'comercial'] };
  assert.equal(visible(supervisor, { id: 't1', department_id: 'financeiro' }), true);
  assert.equal(visible(supervisor, { id: 't2', department_id: 'suporte' }), false);
});

test('analista consulta apenas conversas atendidas ou em que participou', () => {
  const analyst = { id: 'u1', name: 'Ana', role: 'Analista', department_id: 'financeiro' };
  assert.equal(visible(analyst, { id: 't1', user_id: 'u1', department_id: 'financeiro' }), true);
  assert.equal(visible(analyst, { id: 't2', agent_name: 'Ana', department_id: 'financeiro' }), true);
  assert.equal(visible(analyst, { id: 't3', encerrado_por: 'Ana', department_id: 'financeiro' }), true);
  assert.equal(visible(analyst, { id: 't4', department_id: 'financeiro' }, new Set(['t4'])), true);
  assert.equal(visible(analyst, { id: 't5', agent_name: 'Carlos', department_id: 'financeiro' }), false);
});
