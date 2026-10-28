import { createClient } from '@supabase/supabase-js';
import type { Request } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('SUPABASE_URL and one of SUPABASE_SECRET_KEY/SUPABASE_SERVICE_ROLE_KEY must be configured for privileged backend functions.');
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const jsonResponse = (code: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), {
    status: code,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(401, { error: 'Missing Authorization header.' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !userData.user) {
      return jsonResponse(401, { error: 'Unauthorized request.' });
    }

    const actorId = userData.user.id;
    const body = await req.json();
    const action = body.action as string | undefined;

    if (!action) {
      return jsonResponse(400, { error: 'Action is required.' });
    }

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role, can_access_admin')
      .eq('id', actorId)
      .single();

    const isAdmin = Boolean(profile?.can_access_admin && profile?.role === 'administrator');
    if (!isAdmin) {
      return jsonResponse(403, { error: 'Admin permission is required for this backend action.' });
    }

    if (action === 'create_employee') {
      const {
        email,
        password,
        full_name,
        employee_id,
        department,
        role,
        account_status,
        can_access_admin,
        assigned_laptop_id,
        assigned_schedule_id,
      } = body as {
        email: string;
        password?: string;
        full_name: string;
        employee_id: string;
        department?: string;
        role?: string;
        account_status?: string;
        can_access_admin?: boolean;
        assigned_laptop_id?: string | null;
        assigned_schedule_id?: string | null;
      };

      if (!email || !full_name || !employee_id) {
        return jsonResponse(400, { error: 'Email, full name, and employee ID are required.' });
      }

      const normalizedRole = role === 'it_personnel' ? 'it_personnel' : 'employee';
      const passwordToUse = password?.trim() || undefined;

      const userCreation = await adminClient.auth.admin.createUser({
        email,
        password: passwordToUse ?? crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          employee_id,
          full_name,
          role: normalizedRole,
        },
      });

      if (userCreation.error || !userCreation.data.user) {
        return jsonResponse(400, {
          error: userCreation.error?.message ?? 'Unable to create the employee account.',
        });
      }

      const employeeAuthId = userCreation.data.user.id;

      const { error: profileError } = await adminClient.from('profiles').insert({
        id: employeeAuthId,
        employee_id,
        full_name,
        work_email: email,
        department: department ?? 'General',
        role: normalizedRole,
        account_status: account_status ?? 'pending',
        can_access_admin: Boolean(can_access_admin),
        assigned_laptop_id: assigned_laptop_id ?? null,
        assigned_schedule_id: assigned_schedule_id ?? null,
      });

      if (profileError) {
        return jsonResponse(400, {
          error: `Profile creation failed: ${profileError.message}`,
        });
      }

      const { error: permissionError } = await adminClient.from('employee_permissions').upsert({
        employee_id: employeeAuthId,
        can_access_admin: Boolean(can_access_admin),
        role: normalizedRole,
        permissions: {
          can_access_admin: Boolean(can_access_admin),
          role: normalizedRole,
        },
        updated_by: actorId,
      });

      if (permissionError) {
        return jsonResponse(400, {
          error: `Permission assignment failed: ${permissionError.message}`,
        });
      }

      await adminClient.from('audit_logs').insert({
        actor_id: actorId,
        entity_type: 'profiles',
        entity_id: employeeAuthId,
        action: 'employee_created',
        details: {
          employee_id,
          email,
          can_access_admin: Boolean(can_access_admin),
        },
      });

      return jsonResponse(200, {
        success: true,
        message: 'Employee account created successfully.',
        employee_id: employeeAuthId,
      });
    }

    if (action === 'update_admin_access') {
      const { employee_id, can_access_admin, role } = body as {
        employee_id: string;
        can_access_admin: boolean;
        role?: string;
      };

      if (!employee_id) {
        return jsonResponse(400, { error: 'Employee ID is required.' });
      }

      const nextRole = role === 'administrator' || role === 'it_personnel' ? role : 'employee';

      const { error: profileError } = await adminClient
        .from('profiles')
        .update({
          can_access_admin: Boolean(can_access_admin),
          role: nextRole,
          updated_at: new Date().toISOString(),
        })
        .eq('id', employee_id);

      if (profileError) {
        return jsonResponse(400, { error: profileError.message });
      }

      const { error: permissionError } = await adminClient
        .from('employee_permissions')
        .upsert({
          employee_id,
          can_access_admin: Boolean(can_access_admin),
          role: nextRole,
          permissions: { can_access_admin: Boolean(can_access_admin), role: nextRole },
          updated_by: actorId,
        });

      if (permissionError) {
        return jsonResponse(400, { error: permissionError.message });
      }

      await adminClient.from('audit_logs').insert({
        actor_id: actorId,
        entity_type: 'employee_permissions',
        entity_id: employee_id,
        action: 'admin_access_updated',
        details: { can_access_admin: Boolean(can_access_admin), role: nextRole },
      });

      return jsonResponse(200, { success: true, message: 'Admin access updated.' });
    }

    return jsonResponse(400, { error: `Unsupported action: ${action}` });
  } catch (error) {
    console.error('privileged-admin failed:', error);
    return jsonResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown backend error.',
    });
  }
});
