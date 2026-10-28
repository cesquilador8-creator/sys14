const config = window.SYS14_EXTENSION_CONFIG || {
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseAnonKey: 'your-anon-key',
};

async function readSession() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['supabaseSession'], (result) => {
      resolve(result.supabaseSession || null);
    });
  });
}

function normalizeDomain(rawDomain) {
  return String(rawDomain || '').trim().replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
}

async function getBlockingConfig() {
  const session = await readSession();
  if (!session) {
    await chrome.storage.local.set({ blockingConfig: { active: false, domains: [], reason: 'No valid employee session.' } });
    return false;
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
      throw new Error(payload.message || 'Failed to retrieve blocking configuration.');
    }

    const domains = (payload.config?.domains || []).map((domain) => normalizeDomain(domain)).filter(Boolean);
    await chrome.storage.local.set({
      blockingConfig: {
        active: Boolean(payload.config?.active),
        domains,
        schedule: payload.config?.schedule || null,
        reason: payload.config?.reason || 'No blocking schedule is currently active.',
        lastSync: new Date().toISOString(),
      },
    });

    return true;
  } catch (error) {
    await chrome.storage.local.set({
      blockingConfig: { active: false, domains: [], reason: error.message || 'Unable to access backend configuration.' },
    });
    return false;
  }
}

async function applyBlockingRules() {
  const success = await getBlockingConfig();
  const blockingConfig = await new Promise((resolve) => chrome.storage.local.get(['blockingConfig'], (result) => resolve(result.blockingConfig || { domains: [] })));

  const domains = (blockingConfig.domains || []).map((domain) => normalizeDomain(domain)).filter(Boolean);
  const rules = domains.map((domain, index) => ({
    id: index + 1,
    priority: 1,
    action: { type: 'block' },
    condition: {
      urlFilter: `||${domain}^`,
      resourceTypes: ['main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object', 'xmlhttprequest', 'other']
    }
  }));

  if (success && domains.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: rules.map((rule) => rule.id), addRules: rules });
  } else {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: Array.from({ length: 1000 }, (_, idx) => idx + 1) });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  applyBlockingRules();
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.supabaseSession) {
    applyBlockingRules();
  }
});

chrome.runtime.onStartup.addListener(() => {
  applyBlockingRules();
});

setInterval(() => {
  applyBlockingRules();
}, 300000);
