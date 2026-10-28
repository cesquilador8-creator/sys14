// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid session.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();
    const { subject, description, category, priority = 'normal', laptop_id } = payload;
    if (!subject || !description || !category) {
      return new Response(JSON.stringify({ success: false, message: 'Subject, description, and category are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: ticket, error } = await supabase.from('tickets').insert({
      employee_id: userData.user.id,
      laptop_id: laptop_id || null,
      subject,
      description,
      category,
      priority,
      status: 'open',
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, ticket }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Ticket creation failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
