const test = require('node:test');
const assert = require('node:assert/strict');

const whatsappService = require('../src/services/whatsapp.service');

test('normaliza roteamento padrão para geral quando não especificado', () => {
  const result = whatsappService._test.normalizeAccountRouting({});
  assert.equal(result.routingMode, 'general');
  assert.equal(result.departmentId, null);
  assert.equal(result.departmentName, null);
});

test('normaliza roteamento dedicado para departamento', () => {
  const result = whatsappService._test.normalizeAccountRouting({
    routing_mode: 'department',
    department_id: 'dept-123-uuid',
    department_name: 'Suporte Técnico'
  });
  assert.equal(result.routingMode, 'department');
  assert.equal(result.departmentId, 'dept-123-uuid');
  assert.equal(result.departmentName, 'Suporte Técnico');
});

test('limpa departamento quando roteamento é alterado para geral', () => {
  const result = whatsappService._test.normalizeAccountRouting({
    routing_mode: 'general',
    department_id: 'dept-123-uuid',
    department_name: 'Suporte Técnico'
  });
  assert.equal(result.routingMode, 'general');
  assert.equal(result.departmentId, null);
  assert.equal(result.departmentName, null);
});
