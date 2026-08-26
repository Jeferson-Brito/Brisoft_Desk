const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBotConfig, renderBotMessage, departmentOptions } = require('../src/services/bot-config.service');

test('normalizeBotConfig aplica limites e preserva valores válidos', () => {
  const config = normalizeBotConfig({
    enabled: false,
    resume_window_hours: 999,
    rating_window_minutes: 1,
    invalid_attempt_limit: 0,
    collect_customer_name: false,
    require_customer_last_name: true,
    customer_name_attempt_limit: 99,
    greeting_message: 'Olá, {nome}'
  });
  assert.equal(config.enabled, false);
  assert.equal(config.resume_window_hours, 168);
  assert.equal(config.rating_window_minutes, 5);
  assert.equal(config.invalid_attempt_limit, 3);
  assert.equal(config.collect_customer_name, false);
  assert.equal(config.require_customer_last_name, true);
  assert.equal(config.customer_name_attempt_limit, 5);
  assert.equal(config.greeting_message, 'Olá, {nome}');
});

test('renderBotMessage substitui apenas variáveis conhecidas', () => {
  const message = renderBotMessage('Olá {nome}, fila {departamento}. {desconhecida}', {
    nome: 'Maria',
    departamento: 'Financeiro'
  });
  assert.equal(message, 'Olá Maria, fila Financeiro. {desconhecida}');
});

test('departmentOptions cria menu numerado', () => {
  assert.equal(departmentOptions([{ name: 'Comercial' }, { name: 'Suporte' }]), '1️⃣ - Comercial\n2️⃣ - Suporte');
});
