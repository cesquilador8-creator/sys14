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

    const adminToken = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(adminToken);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ success: false, message: 'Invalid administrator token.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: permissionRow } = await supabase
      .from('employee_permissions')
      .select('can_access_admin')
      .eq('profile_id', userData.user.id)
      .single();

    if (!permissionRow?.can_access_admin) {
      return new Response(JSON.stringify({ success: false, message: 'Admin access is required.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const payload = await req.json();
    const password = (payload.password || 'TempPassword123!');
    const email = payload.work_email;
    const fullName = payload.full_name;

    if (!email || !fullName) {
      return new Response(JSON.stringify({ success: false, message: 'Work email and full name are required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createError) throw createError;

    const { error: profileError } = await supabase.from('profiles').insert({
      id: createdUser.user.id,
      employee_number: payload.employee_number || `EMP-${Date.now()}`,
      full_name: fullName,
      work_email: email,
      department: payload.department || 'Operations',
      account_status: 'active',
      can_access_admin: Boolean(payload.can_access_admin),
    });

    if (profileError) throw profileError;

    const { error: permissionError } = await supabase.from('employee_permissions').insert({
      profile_id: createdUser.user.id,
      can_access_admin: Boolean(payload.can_access_admin),
      can_manage_employees: false,
      can_manage_schedules: false,
      can_view_analytics: Boolean(payload.can_access_admin),
      can_manage_tickets: true,
      can_manage_laptops: false,
    });

    if (permissionError) throw permissionError;

    return new Response(JSON.stringify({ success: true, userId: createdUser.user.id, tempPassword: password }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Employee creation failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
