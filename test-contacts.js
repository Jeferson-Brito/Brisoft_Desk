const axios = require('axios');
const crypto = require('crypto');

async function run() {
  try {
    // Generate a test token or just mock the req if we load the controller directly
    const contactsController = require('./server/src/controllers/contacts.controller');
    
    // We can't easily mock Express req/res. Let's just try to call the supabase directly
    // to see if we get a schema error.
    const { supabase } = require('./server/src/config/supabase');
    
    // Try to insert a contact
    const { data, error } = await supabase.from('contacts').insert({
        id: crypto.randomUUID(),
        name: 'Teste Cliente',
        phone: '5511999999999',
        email: null,
        cnpj: null,
        status: 'Ativo',
        channel: 'WhatsApp',
        notes: null,
        is_employee: false
    }).select().single();
    
    if (error) {
      console.log('Supabase Error:', error);
    } else {
      console.log('Insert Success:', data);
      
      // Try to update tickets
      const { error: tErr } = await supabase.from('tickets').update({ 
        is_employee: false, 
        contact_id: data.id 
      }).eq('phone', '5511999999999');
      
      if (tErr) console.log('Tickets Update Error:', tErr);
      else console.log('Tickets Update Success');
      
      // Delete it
      const { error: delErr } = await supabase.from('contacts').delete().eq('id', data.id);
      if (delErr) console.log('Delete Error:', delErr);
      else console.log('Delete Success');
    }
    
  } catch (err) {
    console.error('Fatal:', err);
  }
}
run();
