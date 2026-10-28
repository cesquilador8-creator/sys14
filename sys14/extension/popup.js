const config = window.SYS14_EXTENSION_CONFIG || {};

function readSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['supabaseSession'], (result) => resolve(result.supabaseSession || null));
  });
}

function updateField(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function showError(message) {
  updateField('enrollmentStatus', message);
  updateField('blockingStatus', message);
  updateField('assignedLaptop', 'Unavailable');
  document.getElementById('statusBadge').textContent = 'Blocked';
  document.getElementById('statusBadge').className = 'badge offline';
}

async function loadExtensionState() {
  const session = await readSession();
  if (!session) {
    showError('This device is not registered. Please contact your IT administrator.');
    return;
  }

  try {
    const response = await fetch(`${config.supabaseUrl}/functions/v1/get-blocking-config`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: config.supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ device_id: session.device_id || null }),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.message || 'Unable to retrieve employee status.');
    }

    updateField('enrollmentStatus', payload.config?.enrollmentStatus || 'Authorized');
    updateField('assignedLaptop', payload.config?.laptopName || 'Not assigned');
    updateField('blockingStatus', payload.config?.active ? 'Active' : 'Inactive');
    updateField('lastSync', payload.config?.lastSync || 'Not synced');
    document.getElementById('statusBadge').textContent = payload.config?.active ? 'Authorized' : 'Inactive';
    document.getElementById('statusBadge').className = payload.config?.active ? 'badge active' : 'badge offline';
  } catch (error) {
    showError(error.message || 'Unable to load status.');
  }
}

document.getElementById('signOutButton')?.addEventListener('click', () => {
  chrome.storage.local.remove(['supabaseSession']);
  window.close();
});

document.getElementById('usageButton')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'options.html#usage-summary' });
});

document.getElementById('ticketsButton')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'options.html#tickets' });
});

document.getElementById('settingsButton')?.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById('reportButton')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'options.html#report-issue' });
});

loadExtensionState();
