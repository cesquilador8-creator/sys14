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

    const { data: permissionRow } = await supabase
      .from('employee_permissions')
      .select('can_access_admin')
      .eq('profile_id', userData.user.id)
      .single();

    if (!permissionRow?.can_access_admin) {
      return new Response(JSON.stringify({ success: false, message: 'Admin permission required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();
    const { request_id, status, replacement_laptop_id, it_response } = payload;
    const { data: updatedRequest, error } = await supabase.from('laptop_change_requests').update({
      status,
      replacement_laptop_id: replacement_laptop_id || null,
      it_response: it_response || null,
      updated_at: new Date().toISOString(),
    }).eq('id', request_id).select().single();

    if (error) throw error;

    return new Response(JSON.stringify({ success: true, request: updatedRequest }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Laptop change request update failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
