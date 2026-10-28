import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Bell, BriefcaseBusiness, ChartColumn, FileText, Laptop2, LogOut, Moon, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ChangelogModal } from '../components/ChangelogModal';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { DashboardMetrics, Laptop, Profile, Ticket } from '../lib/types';

const navItems = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'blocking', label: 'Blocking Schedule' },
  { key: 'analytics', label: 'Analytics' },
  { key: 'devices', label: 'Register Device' },
  { key: 'employees', label: 'Employees' },
  { key: 'laptops', label: 'Laptops' },
  { key: 'tickets', label: 'Tickets' },
];

const emptyMetrics: DashboardMetrics = {
  employees: 0,
  laptops: 0,
  enrolledDevices: 0,
  activeBlocking: 0,
  unassignedLaptops: 0,
  pendingRegistrations: 0,
  openTickets: 0,
  pendingLaptopChanges: 0,
};

export function DashboardPage() {
  const { profile, signOut } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics>(emptyMetrics);
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [laptops, setLaptops] = useState<Laptop[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [{ data: employeeRows }, { data: laptopRows }, { data: ticketRows }, { data: enrollmentRows }] = await Promise.all([
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
        supabase.from('laptops').select('*').order('created_at', { ascending: false }),
        supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('device_enrollments').select('id'),
      ]);

      const employeesData = employeeRows ?? [];
      const laptopData = laptopRows ?? [];
      const ticketsData = ticketRows ?? [];
      const enrollmentCount = enrollmentRows?.length ?? 0;

      setEmployees(employeesData as Profile[]);
      setLaptops(laptopData as Laptop[]);
      setTickets(ticketsData as Ticket[]);
      setMetrics({
        employees: employeesData.length,
        laptops: laptopData.length,
        enrolledDevices: enrollmentCount,
        activeBlocking: laptopData.filter((l) => l.reported_blocking_state).length,
        unassignedLaptops: laptopData.filter((l) => !l.assigned_employee_id).length,
        pendingRegistrations: employeesData.filter((person) => person.account_status === 'pending').length,
        openTickets: ticketsData.filter((ticket) => ticket.status !== 'resolved' && ticket.status !== 'closed').length,
        pendingLaptopChanges: 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  const summaryCards = useMemo(
    () => [
      { title: 'Registered employees', value: metrics.employees, icon: Users },
      { title: 'Registered laptops', value: metrics.laptops, icon: Laptop2 },
      { title: 'Active enrolled devices', value: metrics.enrolledDevices, icon: ShieldCheck },
      { title: 'Devices with active blocking', value: metrics.activeBlocking, icon: Activity },
      { title: 'Unassigned laptops', value: metrics.unassignedLaptops, icon: BriefcaseBusiness },
      { title: 'Pending employee registrations', value: metrics.pendingRegistrations, icon: ArrowUpRight },
      { title: 'Open IT tickets', value: metrics.openTickets, icon: FileText },
      { title: 'Pending laptop requests', value: metrics.pendingLaptopChanges, icon: ChartColumn },
    ],
    [metrics],
  );

  const syncData = async () => {
    setSyncing(true);
    try {
      await supabase.from('announcements').select('id').limit(1);
      await loadDashboard();
    } finally {
      setSyncing(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <>
      <ChangelogModal />
      <div className={darkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900 lg:block">
          <div className="mb-8 flex items-center gap-3">
            <div className="rounded-2xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-xl font-bold">MINDLOCK</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Admin console</div>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveView(item.key)}
                className={`flex w-full items-center rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                  activeView === item.key
                    ? 'bg-sky-50 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="lg:ml-72">
          <header className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Operations overview</div>
                <h1 className="text-2xl font-bold">Admin dashboard</h1>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={syncData}
                  disabled={syncing}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing…' : 'Sync'}
                </button>
                <button
                  type="button"
                  onClick={() => setDarkMode((current) => !current)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  aria-label="Toggle dark mode"
                >
                  <Moon className="h-4 w-4" />
                </button>
                <button type="button" className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-100 font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-200">
                    {profile?.full_name?.slice(0, 1).toUpperCase() ?? 'A'}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{profile?.full_name ?? 'Administrator'}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{profile?.role ?? 'administrator'}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          </header>

          <main className="p-6">
            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {activeView === 'dashboard' && (
              <>
                <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {summaryCards.map(({ title, value, icon: Icon }) => (
                    <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm text-slate-500 dark:text-slate-400">{title}</span>
                        <Icon className="h-4 w-4 text-sky-600" />
                      </div>
                      <div className="text-3xl font-bold">{value}</div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="mb-4 text-lg font-semibold">Recent ticket activity</h2>
                    {tickets.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                        No tickets have been raised yet.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tickets.slice(0, 5).map((ticket) => (
                          <div key={ticket.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
                            <div>
                              <div className="font-medium">{ticket.subject}</div>
                              <div className="text-xs text-slate-500">{ticket.category} • {ticket.status}</div>
                            </div>
                            <div className="text-xs text-slate-500">{new Date(ticket.created_at).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <h2 className="mb-4 text-lg font-semibold">Device status</h2>
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between"><span>Registered laptops</span><strong>{metrics.laptops}</strong></div>
                      <div className="flex justify-between"><span>Pending registrations</span><strong>{metrics.pendingRegistrations}</strong></div>
                      <div className="flex justify-between"><span>Unassigned devices</span><strong>{metrics.unassignedLaptops}</strong></div>
                      <div className="flex justify-between"><span>Blocking active</span><strong>{metrics.activeBlocking}</strong></div>
                    </div>
                  </section>
                </div>
              </>
            )}

            {activeView === 'blocking' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold">Blocking schedule</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Schedule configuration</div>
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <div>Schedule name: Company focus windows</div>
                      <div>Timezone: UTC</div>
                      <div>Window: 09:00–17:00</div>
                      <div>Blocked domains: 18 configured</div>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                    <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">Assignment status</div>
                    <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <div>Assigned employees: {employees.length}</div>
                      <div>Assigned devices: {laptops.length}</div>
                      <div>Synchronization: ready</div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {activeView === 'analytics' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold">Analytics</h2>
                <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                  Analytics will display actual usage_event records once the Supabase project is connected and data is present.
                </div>
              </section>
            )}

            {activeView === 'devices' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold">Register device</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="mb-1 block">Asset ID</span>
                    <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="LT-1001" />
                  </label>
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="mb-1 block">Laptop name</span>
                    <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="ThinkPad T14" />
                  </label>
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="mb-1 block">Serial number</span>
                    <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="Optional" />
                  </label>
                  <label className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="mb-1 block">Operating system</span>
                    <input className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" placeholder="Windows 11" />
                  </label>
                </div>
              </section>
            )}

            {activeView === 'employees' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Employee management</h2>
                  <Link to="/dashboard" className="text-sm text-sky-700">Back to dashboard</Link>
                </div>

                <EmployeeCreationForm />

                {employees.length === 0 ? (
                  <div className="mt-6 rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                    No employee records exist yet.
                  </div>
                ) : (
                  <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-50 dark:bg-slate-800">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Employee</th>
                          <th className="px-4 py-3 font-semibold">Department</th>
                          <th className="px-4 py-3 font-semibold">Role</th>
                          <th className="px-4 py-3 font-semibold">Admin access</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((person) => (
                          <tr key={person.id} className="border-t border-slate-200 dark:border-slate-800">
                            <td className="px-4 py-3">{person.full_name}</td>
                            <td className="px-4 py-3">{person.department ?? 'N/A'}</td>
                            <td className="px-4 py-3">{person.role}</td>
                            <td className="px-4 py-3">{person.can_access_admin ? 'Granted' : 'Blocked'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            )}

            {activeView === 'laptops' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold">Registered laptops</h2>
                {laptops.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                    No company laptops are currently registered.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {laptops.map((laptop) => (
                      <div key={laptop.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="font-semibold">{laptop.laptop_name}</div>
                          <div className="rounded-full bg-sky-100 px-2 py-1 text-xs text-sky-700">{laptop.registration_status}</div>
                        </div>
                        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                          <div>Asset: {laptop.asset_id}</div>
                          <div>OS: {laptop.operating_system ?? 'Not set'}</div>
                          <div>Browser: {laptop.browser_type ?? 'Not set'}</div>
                          <div>Last sync: {laptop.last_sync_at ? new Date(laptop.last_sync_at).toLocaleString() : 'Never'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {activeView === 'tickets' && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 text-xl font-semibold">Ticket console</h2>
                {tickets.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-sm text-slate-500 text-center">
                    No tickets available yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {tickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="font-semibold">{ticket.ticket_number}</div>
                          <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200">{ticket.status}</div>
                        </div>
                        <div className="text-sm text-slate-600 dark:text-slate-300">{ticket.subject}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
    </>
  );
}

function EmployeeCreationForm() {
  const [form, setForm] = useState({
    employee_id: '',
    full_name: '',
    work_email: '',
    department: '',
    role: 'employee',
    account_status: 'pending',
    can_access_admin: false,
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [response, setResponse] = useState<{ type: 'idle' | 'error' | 'success'; message: string }>({ type: 'idle', message: '' });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setResponse({ type: 'idle', message: '' });

    try {
      const payload: Record<string, unknown> = {
        action: 'create_employee',
        employee_id: form.employee_id,
        full_name: form.full_name,
        email: form.work_email,
        department: form.department,
        role: form.role,
        account_status: form.account_status,
        can_access_admin: form.can_access_admin,
      };

      if (form.password.trim()) {
        payload.password = form.password;
      }

      const { data, error } = await supabase.functions.invoke('privileged-admin', { body: payload });
      if (error) {
        throw new Error(error.message ?? 'Account creation failed.');
      }

      if (!data?.success) {
        throw new Error(data?.error ?? 'Employee account creation was rejected by the backend.');
      }

      setResponse({ type: 'success', message: 'Employee account created successfully.' });
      setForm({
        employee_id: '',
        full_name: '',
        work_email: '',
        department: '',
        role: 'employee',
        account_status: 'pending',
        can_access_admin: false,
        password: '',
      });
    } catch (error) {
      setResponse({
        type: 'error',
        message: error instanceof Error ? error.message : 'The backend rejected this employee creation request.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/60">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Employee ID</span>
          <input value={form.employee_id} onChange={(event) => handleChange('employee_id', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" required />
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Full name</span>
          <input value={form.full_name} onChange={(event) => handleChange('full_name', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" required />
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Work email</span>
          <input value={form.work_email} onChange={(event) => handleChange('work_email', event.target.value)} type="email" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" required />
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Department</span>
          <input value={form.department} onChange={(event) => handleChange('department', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Role</span>
          <select value={form.role} onChange={(event) => handleChange('role', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="employee">Employee</option>
            <option value="it_personnel">IT Personnel</option>
            <option value="administrator">Administrator</option>
          </select>
        </label>
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Account status</span>
          <select value={form.account_status} onChange={(event) => handleChange('account_status', event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2">
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <label className="text-sm text-slate-700 dark:text-slate-200">
          <span className="mb-1 block">Temporary password</span>
          <input value={form.password} onChange={(event) => handleChange('password', event.target.value)} type="password" placeholder="Optional" className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2" />
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm text-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={form.can_access_admin} onChange={(event) => handleChange('can_access_admin', event.target.checked)} className="h-4 w-4" />
          Admin dashboard access
        </label>
      </div>

      {response.type !== 'idle' && (
        <div className={`rounded-xl border px-3 py-2 text-sm ${response.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
          {response.message}
        </div>
      )}

      <button type="submit" disabled={submitting} className="w-full rounded-xl bg-sky-600 px-4 py-3 font-semibold text-white disabled:opacity-60">
        {submitting ? 'Creating account…' : 'Create employee'}
      </button>
    </form>
  );
}
