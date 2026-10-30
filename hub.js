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
