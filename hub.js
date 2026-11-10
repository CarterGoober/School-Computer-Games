'use strict';
const statusElement=document.querySelector('#status'),installButton=document.querySelector('#install');let deferredPrompt=null;
for(const id of ['about-button','install-help'])document.getElementById(id).onclick=()=>document.querySelector('#info').showModal();
document.querySelector('#close-info').onclick=()=>document.querySelector('#info').close();
addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredPrompt=event;installButton.hidden=false});
installButton.onclick=async()=>{if(!deferredPrompt)return;await deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;installButton.hidden=true};
addEventListener('appinstalled',()=>{installButton.hidden=true});
if('serviceWorker' in navigator){navigator.serviceWorker.addEventListener('message',event=>{if(event.data==='OFFLINE_READY')statusElement.textContent='OFFLINE READY'});navigator.serviceWorker.register('./sw.js').then(async()=>{const registration=await navigator.serviceWorker.ready;const worker=registration.active||navigator.serviceWorker.controller;if(worker)worker.postMessage('CACHE_STATUS')}).catch(()=>{statusElement.textContent='ONLINE ONLY'})}else statusElement.textContent='ONLINE ONLY';

function updatePoints(){document.querySelectorAll('[data-points]').forEach(el=>{el.textContent=`${Progression.read('apex').balance.toLocaleString()} GARAGE POINTS / SHARED WALLET`;});}updatePoints();addEventListener('pageshow',updatePoints);addEventListener('storage',updatePoints);

addEventListener('garage:updated',updatePoints);

// Read the real shared-world population without creating a guest session.
async function refreshCityPopulation(){const el=document.getElementById('city-online');if(!el||document.hidden)return;try{const r=await fetch('city-heist/api/population',{cache:'no-store',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('Unavailable');const d=await r.json();if(!Number.isInteger(d.online)||d.online<0)throw Error('Invalid population');el.textContent=d.online+' '+(d.online===1?'player':'players')+' online';}catch{el.textContent='Player count unavailable';}}
refreshCityPopulation();setInterval(refreshCityPopulation,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshCityPopulation()});
