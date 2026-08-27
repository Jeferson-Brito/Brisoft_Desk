function normalizeBotInput(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesCustomerCancellation(value, configuredKeywords = '') {
  const input = normalizeBotInput(value);
  if (!input) return false;

  // Evita encerrar quando o cliente nega explicitamente a intenção de cancelar.
  if (/\bnao\s+(quero|desejo|preciso)\s+(cancelar|encerrar|parar|finalizar)\b/.test(input)) {
    return false;
  }

  const keywords = String(configuredKeywords || 'cancelar,encerrar,sair,parar,desistir,finalizar,0')
    .split(',')
    .map(normalizeBotInput)
    .filter(Boolean);

  if (keywords.some(keyword => input === keyword)) return true;

  const explicitIntentPatterns = [
    /\b(quero|desejo|pode|favor|gostaria de)\s+(cancelar|encerrar|finalizar|parar)\b/,
    /\b(cancela|cancelar|encerra|encerrar|finaliza|finalizar)\s+(o\s+)?(atendimento|chamado|conversa)\b/,
    /\b(nao quero mais|nao preciso mais|desisti|deixa pra la|deixe pra la|pode parar)\b/,
    /\b(quero sair|desejo sair|sair do atendimento)\b/
  ];
  if (explicitIntentPatterns.some(pattern => pattern.test(input))) return true;

  // Frases configuradas com duas ou mais palavras são intenções explícitas.
  return keywords.some(keyword => keyword.includes(' ') && input.includes(keyword));
}

module.exports = { normalizeBotInput, matchesCustomerCancellation };
