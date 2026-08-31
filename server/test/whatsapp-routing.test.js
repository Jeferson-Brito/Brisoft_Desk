const test = require('node:test');
const assert = require('node:assert/strict');

const whatsappService = require('../src/services/whatsapp.service');

test('mantém mensagens recentes disponíveis para novas tentativas de descriptografia', () => {
  const cache = new whatsappService._test.ExpiringCache({ ttlMs: 1000, maxEntries: 2 });
  const key = whatsappService._test.messageCacheKey({ remoteJid: '558399999999:2@s.whatsapp.net', id: 'ABC' });
  cache.set(key, { conversation: 'Olá' });
  assert.deepEqual(cache.get('558399999999@s.whatsapp.net:ABC'), { conversation: 'Olá' });
  cache.del(key);
  assert.equal(cache.get(key), undefined);
});

test('mantém habilitados os eventos de mensagens enviadas por outros dispositivos', () => {
  assert.equal(whatsappService._test.EMIT_OWN_EVENTS, true);
});

test('não mantém a sessão artificialmente online para preservar o celular principal', () => {
  assert.equal(whatsappService._test.MARK_ONLINE_ON_CONNECT, false);
});

test('não troca um JID telefônico pelo LID ao exibir o destinatário', () => {
  const lidMap = new Map([
    ['558393858515@s.whatsapp.net', '25117639839856@lid'],
    ['25117639839856@lid', '558393858515@s.whatsapp.net']
  ]);
  assert.equal(
    whatsappService._test.getPhoneFromJid('558393858515@s.whatsapp.net', lidMap),
    '558393858515'
  );
  assert.equal(
    whatsappService._test.getPhoneFromJid('25117639839856@lid', lidMap),
    '558393858515'
  );
});

test('prioriza o telefone alternativo fornecido pelo WhatsApp para mensagens LID', () => {
  const message = {
    key: {
      remoteJid: '25117639839856@lid',
      remoteJidAlt: '558393858515@s.whatsapp.net'
    }
  };
  assert.equal(
    whatsappService._test.phoneJidFromMessageMetadata(message),
    '558393858515@s.whatsapp.net'
  );
});

test('não confunde o identificador numérico LID com um telefone', () => {
  const message = { key: { remoteJid: '25117639839856@lid' } };
  assert.equal(whatsappService._test.phoneJidFromMessageMetadata(message), '');
});

test('resolve LID pelo repositório interno antes de enviar', async () => {
  const account = {
    name: 'Teste',
    lidMap: new Map(),
    sock: {
      signalRepository: {
        lidMapping: {
          getPNForLID: async () => '558393858515@s.whatsapp.net'
        }
      }
    }
  };
  assert.equal(
    await whatsappService._test.resolveJid('25117639839856@lid', account),
    '558393858515@s.whatsapp.net'
  );
});

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

test('restaura o roteamento anterior quando a persistência falha', async () => {
  const account = {
    routingMode: 'department',
    departmentId: 'departamento-original',
    departmentName: 'Financeiro'
  };

  await assert.rejects(
    whatsappService._test.applyAccountRoutingWithPersistence(
      account,
      { routingMode: 'general', departmentId: null, departmentName: null },
      async () => { throw new Error('Supabase indisponível'); }
    ),
    /Supabase indisponível/
  );

  assert.deepEqual(account, {
    routingMode: 'department',
    departmentId: 'departamento-original',
    departmentName: 'Financeiro'
  });
});
