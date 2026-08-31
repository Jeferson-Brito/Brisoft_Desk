// ==========================================================================
// BRISOFT DESK - CONTACTS CONTROLLER
// ==========================================================================

const { supabase, isSupabaseConfigured } = require('../config/supabase');

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeEmployee(value) {
  return value === true || value === 'true';
}

async function syncContactClassification(contact) {
  if (!contact?.id) return;
  const linkedResult = await supabase.from('tickets').update({ is_employee: Boolean(contact.is_employee) }).eq('contact_id', contact.id);
  if (linkedResult.error) throw linkedResult.error;
  const phone = normalizePhone(contact.phone);
  if (phone) {
    const phoneResult = await supabase.from('tickets').update({ is_employee: Boolean(contact.is_employee), contact_id: contact.id }).eq('phone', phone);
    if (phoneResult.error) throw phoneResult.error;
  }
}

class ContactsController {
  async listContacts(req, res) {
    if (!isSupabaseConfigured()) return res.json({ success: true, contacts: [] });
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, contacts: data || [] });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createContact(req, res) {
    if (!isSupabaseConfigured()) return res.status(503).json({ success: false, error: 'Banco de dados indisponivel.' });
    const { name, phone, email, cnpj, status, channel, notes, is_employee } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Nome obrigatorio.' });
    const normalizedPhone = normalizePhone(phone);
    if (normalizeEmployee(is_employee) && !normalizedPhone) {
      return res.status(400).json({ success: false, error: 'Informe o número do WhatsApp do funcionário.' });
    }
    const crypto = require('crypto');
    try {
      const contactPayload = {
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: normalizedPhone || null,
        email: email || null,
        cnpj: cnpj || null,
        status: status || 'Ativo',
        channel: channel || 'Web',
        notes: notes || null,
        is_employee: normalizeEmployee(is_employee)
      };
      let existing = null;
      if (normalizedPhone) {
        const suffix = normalizedPhone.slice(-8);
        const existingResult = await supabase.from('contacts').select('*').ilike('phone', `%${suffix}%`).limit(50);
        if (existingResult.error) throw existingResult.error;
        existing = (existingResult.data || []).find(item => normalizePhone(item.phone) === normalizedPhone) || null;
      }
      const { id: _newId, ...existingContactPayload } = contactPayload;
      const operation = existing
        ? supabase.from('contacts').update(existingContactPayload).eq('id', existing.id)
        : supabase.from('contacts').insert(contactPayload);
      const { data, error } = await operation.select().single();
      if (error) throw error;
      await syncContactClassification(data);
      return res.json({ success: true, contact: data, updatedExisting: Boolean(existing) });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateContact(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID invalido.' });
    if (!isSupabaseConfigured()) return res.status(503).json({ success: false, error: 'Banco de dados indisponivel.' });

    const allowed = ['name', 'phone', 'email', 'cnpj', 'status', 'channel', 'notes', 'is_employee'];
    const payload = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }
    if (payload.phone !== undefined) payload.phone = normalizePhone(payload.phone) || null;
    if (payload.is_employee !== undefined) payload.is_employee = normalizeEmployee(payload.is_employee);
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo valido para atualizar.' });
    }

    try {
      const { data: current, error: currentError } = await supabase.from('contacts').select('phone, is_employee').eq('id', id).maybeSingle();
      if (currentError) throw currentError;
      if (!current) return res.status(404).json({ success: false, error: 'Contato não encontrado.' });
      const finalEmployee = payload.is_employee ?? Boolean(current.is_employee);
      const finalPhone = payload.phone !== undefined ? payload.phone : current.phone;
      if (finalEmployee && !normalizePhone(finalPhone)) {
        return res.status(400).json({ success: false, error: 'Informe o número do WhatsApp do funcionário.' });
      }
      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await syncContactClassification(data);
      return res.json({ success: true, contact: data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async deleteContact(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID invalido.' });
    if (!isSupabaseConfigured()) return res.status(503).json({ success: false, error: 'Banco de dados indisponivel.' });
    try {
      const { error } = await supabase.from('contacts').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new ContactsController();
module.exports._test = { normalizePhone, normalizeEmployee };

