const config = window.__SUPABASE_CONFIG__ || { url: '', anonKey: '' };
const isLoginPage = document.body.dataset.page === 'login';
const isUnconfigured = !config.url || !config.anonKey || config.url.includes('your-project') || config.anonKey.includes('your-anon');

if (isUnconfigured) {
  const target = document.getElementById('authError') || document.getElementById('announcementSummary');
  if (target) {
    target.textContent = 'Supabase is not configured. Add a valid project URL and anon key before using the dashboard.';
  }
}

const supabase = window.supabase
  ? window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

function setError(message) {
  const errorBox = document.getElementById('authError');
  if (errorBox) errorBox.textContent = message;
}

async function adminHasAccess() {
  if (!supabase || isUnconfigured) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('can_access_admin, account_status')
    .eq('id', data.session.user.id)
    .single();

  return !profileError && Boolean(profileData?.can_access_admin) && profileData.account_status === 'active';
}

async function ensureSessionForAdmin() {
  if (!supabase || isUnconfigured) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;
  return adminHasAccess();
}

async function loginAdmin(event) {
  event.preventDefault();

  const email = document.getElementById('email')?.value.trim();
  const password = document.getElementById('password')?.value;
  const rememberMe = document.getElementById('rememberMe')?.checked ?? true;

  if (!email || !password) {
    setError('Please enter your work email and password.');
    return;
  }

  if (isUnconfigured) {
    setError('Supabase is not configured. Add a valid project URL and anon key first.');
    return;
  }

  const loginButton = document.getElementById('loginButton');
  loginButton.disabled = true;
  loginButton.textContent = 'Signing in...';
  setError('');

  try {
    const client = window.supabase.createClient(config.url, config.anonKey, {
      auth: {
        persistSession: rememberMe,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const { data: profileData } = await client
      .from('profiles')
      .select('can_access_admin, account_status')
      .eq('id', data.user.id)
      .single();

    if (!profileData || !profileData.can_access_admin || profileData.account_status !== 'active') {
      await client.auth.signOut();
      throw new Error('This account does not have active admin-interface access.');
    }

    window.location.href = './dashboard.html';
  } catch (error) {
    setError(error.message || 'Authentication failed.');
  } finally {
    if (loginButton) {
      loginButton.disabled = false;
      loginButton.textContent = 'Log in';
    }
  }
}

function bindLoginPage() {
  const form = document.getElementById('loginForm');
  const toggle = document.getElementById('togglePassword');

  if (toggle) {
    toggle.addEventListener('click', () => {
      const field = document.getElementById('password');
      const show = field.type === 'password';
      field.type = show ? 'text' : 'password';
      toggle.textContent = show ? 'Hide' : 'Show';
    });
  }

  if (form) form.addEventListener('submit', loginAdmin);

  if (supabase && !isUnconfigured) {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        adminHasAccess().then((allowed) => {
          if (allowed) window.location.href = './dashboard.html';
        });
      }
    });
  }
}

async function countTable(tableName, filters = []) {
  let request = supabase.from(tableName).select('id', { count: 'exact', head: true });
  filters.forEach(({ column, operator, value }) => {
    request = request[operator](column, value);
  });
  const { count, error } = await request;
  return error ? null : Number(count || 0);
}

async function loadDashboardData() {
  if (!supabase || isUnconfigured) {
    const summary = document.getElementById('announcementSummary');
    if (summary) summary.textContent = 'Supabase is not configured. Connect the backend to view data.';
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    window.location.href = './login.html';
    return;
  }

  const metrics = {
    employeeCount: await countTable('profiles', [{ column: 'account_status', operator: 'eq', value: 'active' }]),
    laptopCount: await countTable('laptops'),
    deviceCount: await countTable('device_enrollments', [{ column: 'status', operator: 'eq', value: 'active' }]),
    scheduleCount: await countTable('blocking_schedules'),
    usageCount: await countTable('usage_events'),
    blockedCount: await countTable('usage_events', [{ column: 'event_type', operator: 'eq', value: 'blocked_domain' }]),
    ticketCount: await countTable('tickets', [{ column: 'status', operator: 'neq', value: 'closed' }]),
    replacementCount: await countTable('laptop_change_requests', [{ column: 'status', operator: 'neq', value: 'resolved' }]),
  };

  Object.entries(metrics).forEach(([key, value]) => {
    const node = document.getElementById(key);
    if (node) node.textContent = value === null ? '—' : String(value);
  });

  const { data: activityData } = await supabase
    .from('audit_logs')
    .select('action, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  const recentActivity = document.getElementById('recentActivity');
  if (recentActivity) {
    if (!activityData || !activityData.length) {
      recentActivity.innerHTML = '<li>No recent activity available.</li>';
    } else {
      recentActivity.innerHTML = activityData
        .map((entry) => `<li>${entry.action} — ${new Date(entry.created_at).toLocaleString()}</li>`)
        .join('');
    }
  }

  const { data: announcementData } = await supabase
    .from('announcements')
    .select('*')
    .eq('is_active', true)
    .order('published_at', { ascending: false })
    .limit(3);

  const announcementSummary = document.getElementById('announcementSummary');
  if (announcementSummary) {
    if (!announcementData || !announcementData.length) {
      announcementSummary.textContent = 'No active announcements.';
    } else {
      announcementSummary.innerHTML = announcementData
        .map((item) => `<div><strong>${item.title}</strong><div>${item.version || 'v1'} · ${new Date(item.published_at).toLocaleDateString()}</div></div>`)
        .join('');
    }
  }

  renderAnnouncementPopup(announcementData || []);
  renderBlockingSchedules();
  renderEmployeeTable();
  renderLaptopTable();
  renderTickets();
  renderEmployeeOptions();
}

function renderAnnouncementPopup(announcements) {
  const container = document.getElementById('announcementContainer');
  if (!container || !announcements.length) return;

  if (sessionStorage.getItem('sys14-announcement-dismissed') === 'true') return;

  const item = announcements[0];
  const html = `
    <div class="modal" id="announcementModal">
      <div class="modal-card">
        <h3>${item.title}</h3>
        <p class="muted">Version ${item.version || 'N/A'} • ${new Date(item.published_at).toLocaleDateString()}</p>
        <div>${item.details || 'No additional details available.'}</div>
        <div class="actions">
          <label class="checkbox-row">
            <input type="checkbox" id="announcementDontShowAgain" />
            <span>Don't show again this session</span>
          </label>
          <button class="primary-button" id="announcementClose">Close</button>
        </div>
      </div>
    </div>
  `;
  container.innerHTML = html;

  const closeButton = document.getElementById('announcementClose');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      const checked = document.getElementById('announcementDontShowAgain')?.checked;
      if (checked) sessionStorage.setItem('sys14-announcement-dismissed', 'true');
      const modal = document.getElementById('announcementModal');
      if (modal) modal.remove();
    });
  }
}

async function renderBlockingSchedules() {
  const scheduleTable = document.getElementById('scheduleTable');
  if (!scheduleTable) return;

  const { data, error } = await supabase.from('blocking_schedules').select('*').order('created_at', { ascending: false });

  if (error || !data || !data.length) {
    scheduleTable.innerHTML = '<div class="muted" style="padding:16px">No blocking schedules have been created.</div>';
    return;
  }

  scheduleTable.innerHTML = `
    <table>
      <thead>
        <tr><th>Name</th><th>Time</th><th>Days</th><th>Status</th><th>Domains</th></tr>
      </thead>
      <tbody>
        ${data
          .map(
            (schedule) => `
              <tr>
                <td>${schedule.name}</td>
                <td>${schedule.start_time || '—'} - ${schedule.end_time || '—'}</td>
                <td>${schedule.days_of_week || '—'}</td>
                <td>${schedule.is_active ? 'Active' : 'Disabled'}</td>
                <td>${Array.isArray(schedule.blocked_domains) ? schedule.blocked_domains.length : 0}</td>
              </tr>
            `,
          )
          .join('')}
      </tbody>
    </table>
  `;
}

async function renderEmployeeOptions() {
  const employeeSelect = document.getElementById('employeeSelect');
  if (!employeeSelect || !supabase) return;

  const { data, error } = await supabase.from('profiles').select('id, full_name').order('full_name');
  if (error || !data) return;

  employeeSelect.innerHTML = '<option value="">Select an employee</option>' + data.map((employee) => `<option value="${employee.id}">${employee.full_name}</option>`).join('');
}

async function renderEmployeeTable() {
  const employeeTable = document.getElementById('employeeTable');
  if (!employeeTable) return;

  const { data, error } = await supabase.from('profiles').select('*').order('full_name');
  if (error || !data) {
    employeeTable.innerHTML = '<div class="muted" style="padding:16px">No employees available.</div>';
    return;
  }

  employeeTable.innerHTML = `
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th><th>Department</th><th>Admin</th><th>Status</th></tr>
      </thead>
      <tbody>
        ${data.map((employee) => `
          <tr>
            <td>${employee.full_name || '—'}</td>
            <td>${employee.work_email || '—'}</td>
            <td>${employee.department || '—'}</td>
            <td>${employee.can_access_admin ? 'Yes' : 'No'}</td>
            <td>${employee.account_status || 'unknown'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function renderLaptopTable() {
  const laptopTable = document.getElementById('laptopTable');
  if (!laptopTable) return;

  const { data, error } = await supabase.from('laptops').select('*').order('created_at', { ascending: false });
  if (error || !data) {
    laptopTable.innerHTML = '<div class="muted" style="padding:16px">No laptops registered.</div>';
    return;
  }

  laptopTable.innerHTML = `
    <table>
      <thead>
        <tr><th>Asset Tag</th><th>Device</th><th>Assigned</th><th>Status</th><th>Last Sync</th></tr>
      </thead>
      <tbody>
        ${data.map((laptop) => `
          <tr>
            <td>${laptop.asset_tag || '—'}</td>
            <td>${laptop.device_name || '—'}</td>
            <td>${laptop.assigned_employee_id || 'Unassigned'}</td>
            <td>${laptop.status || 'unknown'}</td>
            <td>${laptop.last_sync_at ? new Date(laptop.last_sync_at).toLocaleString() : 'Never'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function renderTickets() {
  const ticketTable = document.getElementById('ticketTable');
  if (!ticketTable) return;

  const { data, error } = await supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(8);
  if (error || !data) {
    ticketTable.innerHTML = '<div class="muted" style="padding:16px">No tickets available.</div>';
    return;
  }

  ticketTable.innerHTML = `
    <table>
      <thead>
        <tr><th>ID</th><th>Subject</th><th>Category</th><th>Status</th><th>Priority</th></tr>
      </thead>
      <tbody>
        ${data.map((ticket) => `
          <tr>
            <td>${ticket.ticket_id || ticket.id}</td>
            <td>${ticket.subject || '—'}</td>
            <td>${ticket.category || '—'}</td>
            <td>${ticket.status || 'open'}</td>
            <td>${ticket.priority || 'normal'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function syncDashboard() {
  const syncButton = document.getElementById('syncDataButton');
  if (!syncButton) return;
  syncButton.textContent = 'Syncing...';

  try {
    if (!supabase || isUnconfigured) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
    await loadDashboardData();
    syncButton.textContent = 'Sync successful';
    setTimeout(() => { syncButton.textContent = 'Sync'; }, 2000);
  } catch (error) {
    syncButton.textContent = 'Sync failed';
    setTimeout(() => { syncButton.textContent = 'Sync'; }, 2500);
    window.alert(error.message || 'Sync failed.');
  }
}

function bindDashboardPage() {
  if (!supabase || isUnconfigured) return;

  const navButtons = document.querySelectorAll('.nav-item');
  const panels = document.querySelectorAll('.content-panel');
  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      navButtons.forEach((item) => item.classList.toggle('active', item === button));
      const target = button.dataset.section;
      panels.forEach((panel) => panel.classList.toggle('active', panel.id === `${target}Panel`));
    });
  });

  document.getElementById('themeToggle')?.addEventListener('click', async () => {
    const body = document.body;
    const isDark = body.classList.toggle('theme-dark');
    const theme = isDark ? 'dark' : 'light';
    body.classList.toggle('theme-light', !isDark);

    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.from('admin_preferences').upsert(
        { profile_id: data.session.user.id, theme, updated_at: new Date().toISOString() },
        { onConflict: 'profile_id' },
      );
    }
  });

  document.getElementById('logoutButton')?.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = './login.html';
  });

  document.getElementById('syncDataButton')?.addEventListener('click', syncDashboard);
  document.getElementById('createScheduleButton')?.addEventListener('click', () => {
    window.alert('Schedule forms and CRUD logic belong in the production admin module, connected to the backend schedule tables.');
  });
  document.getElementById('changeLaptopTab')?.addEventListener('click', () => {
    window.alert('Laptop replacement requests are handled through the backup request table and ticket flow.');
  });

  const deviceForm = document.getElementById('deviceForm');
  if (deviceForm) {
    deviceForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const assetTag = document.getElementById('assetTag').value.trim();
      const deviceName = document.getElementById('deviceName').value.trim();
      const serialNumber = document.getElementById('serialNumber').value.trim();
      const employeeId = document.getElementById('employeeSelect').value;

      if (!assetTag || !deviceName || !employeeId) {
        window.alert('Please provide the required employee and laptop details.');
        return;
      }

      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase.from('laptops').insert({
        asset_tag: assetTag,
        device_name: deviceName,
        serial_number: serialNumber || null,
        assigned_employee_id: employeeId,
        status: 'registered',
        enrollment_status: 'pending',
        last_sync_at: new Date().toISOString(),
        created_by: session.session?.user.id || null,
      });

      if (error) {
        window.alert(error.message || 'Laptop registration failed.');
        return;
      }

      window.alert('Laptop registration request created.');
      deviceForm.reset();
      await loadDashboardData();
    });
  }

  const { data: sessionCheck } = await supabase.auth.getSession();
  if (!sessionCheck.session) {
    window.location.href = './login.html';
    return;
  }

  if (!(await adminHasAccess())) {
    await supabase.auth.signOut();
    window.location.href = './login.html';
    return;
  }

  loadDashboardData();
}

async function boot() {
  if (isLoginPage) {
    bindLoginPage();
    return;
  }

  const hasSession = await ensureSessionForAdmin();
  if (!hasSession) {
    window.location.href = './login.html';
    return;
  }

  bindDashboardPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
