const e=window.location.href,i=e.includes("facebook.com")||e.includes("instagram.com");i&&(document.body.innerHTML=`
    <div style="font-family: Arial, sans-serif; padding: 32px; text-align: center; color: #0f172a; background: #f8fafc; min-height: 100vh;">
      <h2 style="margin-bottom: 12px;">MINDLOCK</h2>
      <p style="max-width: 540px; margin: 0 auto; line-height: 1.6;">
        This website is currently blocked by your company schedule. Website blocking is enforced only when the device is registered, authorized, and within an active schedule window.
      </p>
    </div>
  `);chrome.runtime.sendMessage({type:"set-auth-status",authorized:!1});
