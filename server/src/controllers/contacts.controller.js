// ==========================================================================
// BRISOFT DESK - CONTACTS CONTROLLER
// ==========================================================================

const { supabase, isSupabaseConfigured } = require('../config/supabase');

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
    const { name, phone, email, cnpj, status, channel, notes } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, error: 'Nome obrigatorio.' });
    const crypto = require('crypto');
    try {
      const { data, error } = await supabase.from('contacts').insert({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone ? String(phone).replace(/\D/g, '') : null,
        email: email || null,
        cnpj: cnpj || null,
        status: status || 'Ativo',
        channel: channel || 'Web',
        notes: notes || null
      }).select().single();
      if (error) throw error;
      return res.json({ success: true, contact: data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateContact(req, res) {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'ID invalido.' });
    if (!isSupabaseConfigured()) return res.status(503).json({ success: false, error: 'Banco de dados indisponivel.' });

    const allowed = ['name', 'phone', 'email', 'cnpj', 'status', 'channel', 'notes'];
    const payload = {};
    for (const field of allowed) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }
    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ success: false, error: 'Nenhum campo valido para atualizar.' });
    }

    try {
      const { data, error } = await supabase
        .from('contacts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
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

