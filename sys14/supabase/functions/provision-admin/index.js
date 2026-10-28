// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  try {
    const { email, password, full_name = 'System Administrator' } = await req.json();
    const adminEmail = Deno.env.get('ADMIN_EMAIL');
    const adminPassword = Deno.env.get('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      return new Response(JSON.stringify({ success: false, message: 'Admin provisioning is not configured.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) throw listError;

    const alreadyExists = existingUsers.users.some((user) => user.email === (email || adminEmail));
    const targetEmail = email || adminEmail;
    const targetPassword = password || adminPassword;

    let userId = null;
    if (!alreadyExists) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: targetEmail,
        password: targetPassword,
        email_confirm: true,
        user_metadata: { full_name },
      });
      if (error) throw error;
      userId = data.user.id;
    } else {
      const existingUser = existingUsers.users.find((user) => user.email === targetEmail);
      userId = existingUser?.id ?? null;
    }

    if (!userId) {
      throw new Error('Unable to create or locate the administrator account.');
    }

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: userId,
      work_email: targetEmail,
      full_name,
      department: 'IT',
      account_status: 'active',
      can_access_admin: true,
    }, { onConflict: 'id' });

    if (profileError) throw profileError;

    const { error: permissionError } = await supabase.from('employee_permissions').upsert({
      profile_id: userId,
      can_access_admin: true,
      can_manage_employees: true,
      can_manage_schedules: true,
      can_view_analytics: true,
      can_manage_tickets: true,
      can_manage_laptops: true,
    }, { onConflict: 'profile_id' });

    if (permissionError) throw permissionError;

    return new Response(JSON.stringify({ success: true, userId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Admin provisioning failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
