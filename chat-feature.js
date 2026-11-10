/* Homepage announcement only. Never changes registration, Auth, roles or access.
 * To announce launch, set state='live' AND confirm all four checks after actual tests.
 * These are editorial release checks, not security controls or automatic readiness detection.
 */
(function(root){'use strict';
const config={state:'testing',checks:{ownerSetup:false,moderation:false,realMessaging:false,accountSecurity:false}};
function resolve(c){return c?.state==='live'&&['ownerSetup','moderation','realMessaging','accountSecurity'].every(k=>c.checks?.[k]===true)?{badge:'NOW LIVE',status:'Now Live',note:'Connect with your classmates.'}:{badge:'NEW',status:'Limited Testing',note:'School-domain signup · Email ownership unverified'}}
const state=resolve(config);if(typeof document!=='undefined'){for(const [id,text]of Object.entries({'chat-announcement-badge':state.badge,'chat-announcement-status':state.status,'chat-announcement-note':state.note})){const e=document.getElementById(id);if(e)e.textContent=text}}
root.ChatAnnouncement={config,resolve};if(typeof module!=='undefined')module.exports={config,resolve};
})(globalThis);
