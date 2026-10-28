export type Profile = {
  id: string;
  employee_id: string;
  full_name: string;
  work_email: string;
  department?: string;
  role: 'administrator' | 'it_personnel' | 'employee';
  account_status: 'active' | 'pending' | 'inactive' | 'disabled';
  can_access_admin: boolean;
  assigned_laptop_id?: string | null;
  assigned_schedule_id?: string | null;
};

export type Ticket = {
  id: string;
  ticket_number: string;
  employee_id?: string | null;
  laptop_id?: string | null;
  category: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string | null;
  created_at: string;
  updated_at: string;
};

export type Laptop = {
  id: string;
  asset_id: string;
  laptop_name: string;
  assigned_employee_id?: string | null;
  operating_system?: string;
  browser_type?: string;
  registration_status: string;
  device_enrollment_status: string;
  last_sync_at?: string | null;
  reported_blocking_state?: boolean;
  notes?: string;
};

export type DashboardMetrics = {
  employees: number;
  laptops: number;
  enrolledDevices: number;
  activeBlocking: number;
  unassignedLaptops: number;
  pendingRegistrations: number;
  openTickets: number;
  pendingLaptopChanges: number;
};
