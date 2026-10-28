declare const chrome: any;

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    'mindlock-state': {
      authorized: false,
      updatedAt: Date.now(),
    },
  });
});

chrome.runtime.onMessage.addListener((message: any) => {
  if (message?.type === 'set-auth-status') {
    chrome.storage.local.set({ 'mindlock-state': { authorized: Boolean(message.authorized), updatedAt: Date.now() } });
  }
});

chrome.webRequest.onBeforeRequest.addListener(
  (details: any) => {
    if (!details.url) return {};
    return {};
  },
  { urls: ['http://*/*', 'https://*/*'] },
  ['blocking'],
);
