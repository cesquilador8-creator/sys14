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
    const { domain, event_type = 'visit', laptop_id } = payload;
    if (!domain || !laptop_id) {
      return new Response(JSON.stringify({ success: false, message: 'domain and laptop_id are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: enrollment } = await supabase
      .from('device_enrollments')
      .select('*')
      .eq('employee_id', userData.user.id)
      .eq('laptop_id', laptop_id)
      .eq('enrollment_status', 'active')
      .single();

    if (!enrollment) {
      return new Response(JSON.stringify({ success: false, message: 'Unregistered or revoked device cannot submit usage.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: event, error } = await supabase.from('usage_events').insert({
      employee_id: userData.user.id,
      laptop_id,
      device_enrollment_id: enrollment.id,
      event_type,
      domain,
      visit_count: payload.visit_count || 1,
      metadata: payload.metadata || {},
    }).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, event }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Usage submission failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
