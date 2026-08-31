const test = require('node:test');
const assert = require('node:assert/strict');
const performanceService = require('../src/services/performance.service');

test('calcula o intervalo mensal sem misturar o mês seguinte', () => {
  const august = performanceService._test.parseMonth('2026-08', new Date(2026, 7, 15));
  assert.equal(august.key, '2026-08');
  assert.equal(august.previousKey, '2026-07');
  assert.equal(august.days, 31);
  assert.equal(august.isCurrent, true);
});

test('calcula indicadores reais de atendimentos, SLA e avaliações', () => {
  const ticket = {
    id: '1', agent_name: 'Ana', encerrado_por: 'Ana', status: 'finalizado',
    created_at: '2026-08-01T10:00:00Z', assumed_at: '2026-08-01T10:05:00Z',
    closed_at: '2026-08-01T10:35:00Z', sla_minutes_target: 10
  };
  const metrics = performanceService._test.calculateMetrics({
    createdTickets: [ticket], closedTickets: [ticket], activeTickets: [],
    ratings: [{ agent_name: 'Ana', score: 5 }],
    period: { days: 31, isCurrent: false }, agent: { name: 'Ana' }
  });
  assert.equal(metrics.total, 1);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.tma, '00:30:00');
  assert.equal(metrics.tme, '00:05:00');
  assert.equal(metrics.slaPercent, 100);
  assert.equal(metrics.ratingAverage, 5);
});

test('inverte a comparação de tempos porque menor é melhor', () => {
  const comparison = performanceService._test.buildComparison(
    { total: 12, completed: 10, tmaSeconds: 60, tmeSeconds: 30, slaPercent: 95, ratingAverage: 4.8, satisfactionPercent: 90 },
    { total: 10, completed: 8, tmaSeconds: 120, tmeSeconds: 60, slaPercent: 90, ratingAverage: 4.5, satisfactionPercent: 80 }
  );
  assert.equal(comparison.total, 20);
  assert.equal(comparison.tma, 50);
  assert.equal(comparison.sla, 5);
});
