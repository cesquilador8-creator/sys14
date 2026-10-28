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

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userData.user.id).single();
    if (!profile) {
      return new Response(JSON.stringify({ success: false, message: 'This device is not registered. Please contact your IT administrator.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const { data: enrollment } = await supabase
      .from('device_enrollments')
      .select('*')
      .eq('employee_id', userData.user.id)
      .eq('enrollment_status', 'active')
      .order('enrolled_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ success: false, message: 'This device is not enrolled or has been revoked.', config: { active: false, reason: 'Invalid enrollment.', domains: [], lastSync: null } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { data: assignment } = await supabase
      .from('schedule_assignments')
      .select('schedule_id, schedule: blocking_schedules(*)')
      .eq('employee_id', userData.user.id)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentSchedule = assignment?.schedule;
    const { data: domains } = currentSchedule
      ? await supabase.from('blocked_domains').select('domain').eq('schedule_id', currentSchedule.id)
      : { data: [] };

    return new Response(JSON.stringify({
      success: true,
      config: {
        active: Boolean(currentSchedule && currentSchedule.enabled),
        domains: (domains || []).map((row) => row.domain),
        schedule: currentSchedule ? { id: currentSchedule.id, name: currentSchedule.name, time_zone: currentSchedule.time_zone } : null,
        reason: currentSchedule && currentSchedule.enabled ? 'Blocking is active.' : 'No active schedule is currently assigned.',
        lastSync: new Date().toISOString(),
        laptopName: 'Assigned laptop',
        enrollmentStatus: enrollment.enrollment_status,
      },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, message: error.message || 'Blocking configuration retrieval failed.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
