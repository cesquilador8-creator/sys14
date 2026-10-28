(function(){const r=document.createElement("link").relList;if(r&&r.supports&&r.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))n(e);new MutationObserver(e=>{for(const i of e)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function a(e){const i={};return e.integrity&&(i.integrity=e.integrity),e.referrerPolicy&&(i.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?i.credentials="include":e.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(e){if(e.ep)return;e.ep=!0;const i=a(e);fetch(e.href,i)}})();const c=document.querySelector("#app"),d={ok:!1,message:"Your device is not registered with MINDLOCK.",details:"Website blocking and usage analytics are currently inactive. Please contact your IT administrator to register your company laptop."},s=t=>{c.innerHTML=`
    <div style="padding: 18px; background: linear-gradient(180deg, #eff6ff 0%, #f8fafc 100%); color: #0f172a; min-height: 500px;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px;">
        <div>
          <div style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #64748b;">MINDLOCK</div>
          <div style="font-weight: 700; font-size: 30px;">Extension</div>
        </div>
        <div style="padding: 8px 10px; border-radius: 10px; background: ${t.ok?"#dcfce7":"#fee2e2"}; color: ${t.ok?"#166534":"#991b1b"}; font-size: 12px; font-weight: 700;">
          ${t.ok?"Authorized":"Unregistered"}
        </div>
      </div>

      <div style="background: white; border-radius: 16px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 16px; box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);">
        <div style="font-size: 15px; font-weight: 700; color: ${t.ok?"#0f766e":"#b91c1c"}; margin-bottom: 8px;">
          ${t.message}
        </div>
        <div style="font-size: 12px; color: #475569; line-height: 1.5;">
          ${t.details}
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 16px;">
        <div style="padding: 12px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Status</div>
          <div style="font-weight: 700; margin-top: 6px;">${t.ok?"Active":"Inactive"}</div>
        </div>
        <div style="padding: 12px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
          <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em;">Privacy</div>
          <div style="font-weight: 700; margin-top: 6px;">Domain-level</div>
        </div>
      </div>

      <div style="background: #f8fafc; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0;">
        <div style="font-size: 12px; font-weight: 700; margin-bottom: 8px;">Compliance</div>
        <div style="font-size: 12px; color: #475569;">Incognito and InPrivate behavior depends on managed-browser policy; MINDLOCK cannot universally disable private browsing on unmanaged devices.</div>
      </div>
    </div>
  `},l=async()=>{try{const r=(await chrome.storage.local.get(["mindlock-state"]))["mindlock-state"];if(r&&r.authorized)return{ok:!0,message:"Your device is registered and blocking is active.",details:"Your schedule is synced with MINDLOCK and browsing restrictions are applied at the configured times."}}catch(t){console.warn("MINDLOCK extension could not read browser storage.",t)}return d};s(d);l().then(t=>s(t));
