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
    if (userError) throw userError;

    const { data: adminPermission } = await supabase
      .from('employee_permissions')
      .select('can_access_admin')
      .eq('profile_id', userData.user.id)
      .single();

    if (!adminPermission?.can_access_admin) {
      return new Response(JSON.stringify({ success: false, message: 'Admin permission required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();
    const assetTag = String(payload.asset_tag || '').trim();
    if (!assetTag) {
      return new Response(JSON.stringify({ success: false, message: 'Asset tag is required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: laptop, error: laptopError } = await supabase.from('laptops').upsert({
      asset_tag: assetTag,
      device_name: payload.device_name || `Laptop-${assetTag}`,
      serial_number: payload.serial_number || null,
      operating_system: payload.operating_system || null,
      browser_name: payload.browser_name || null,
      browser_version: payload.browser_version || null,
      enrollment_status: 'registered',
      assigned_employee_id: payload.employee_id || null,
      blocking_config_status: 'configured',
    }, { onConflict: 'asset_tag' }).select().single();

    if (laptopError) throw laptopError;

    if (payload.employee_id) {
      await supabase.from('audit_logs').insert({
        actor_id: userData.user.id,
        target_table: 'laptops',
        target_id: laptop.id,
        action: 'laptop_registered',
        details: { employee_id: payload.employee_id, asset_tag: assetTag },
      });
    }

    return new Response(JSON.stringify({ success: true, laptop }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Laptop registration failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
