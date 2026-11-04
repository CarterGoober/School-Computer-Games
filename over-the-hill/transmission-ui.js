/* Direct manual selection with an automatic clutch; authority repeats every safety check. */
'use strict';
let selectedGear=1,pendingGearSequence=1;
function chooseGear(gear){
 if(mode!=='playing'||chatOpen)return false;
 const reason=P.shiftReason(car,gear);if(reason){showLocation(reason);return false;}
 selectedGear=gear;pendingGearSequence=nextCommand;P.shift(car,gear);sendInput();return true;
}
function resetTransmission(){selectedGear=1;pendingGearSequence=nextCommand;car.gear=1;car.manual=true;car.shiftTime=0;}
function reconcileTransmission(state,ack){
 if(!P.GEARS[state?.gear]||pendingGearSequence!==null&&ack<pendingGearSequence)return false;
 const wanted=selectedGear,refused=pendingGearSequence!==null&&wanted!==state.gear;
 selectedGear=state.gear;car.gear=state.gear;car.manual=state.manual===true;car.shiftTime=state.shiftTime||0;if(Number.isFinite(state.rpm))car.rpm=state.rpm;pendingGearSequence=null;
 if(refused)showLocation('Shift refused by the server','Brake before changing direction or selecting a lower gear.');
 return true;
}
addEventListener('keydown',e=>{
 if(mode!=='playing'||chatOpen||e.repeat||e.target.matches('input,textarea,select,[contenteditable=true]')||e.ctrlKey||e.altKey||e.metaKey)return;
 const digit=/^(?:Digit|Numpad)([1-6])$/.exec(e.code)?.[1]||(/^[1-6]$/.test(e.key)?e.key:null);
 if(e.code==='ShiftRight'||digit){e.preventDefault();e.stopImmediatePropagation();chooseGear(e.code==='ShiftRight'?-1:Number(digit));}
},true);
$('#shift-down').onclick=()=>chooseGear(selectedGear===-1?1:Math.max(1,selectedGear-1));
$('#shift-up').onclick=()=>chooseGear(selectedGear===-1?1:Math.min(6,selectedGear+1));
$('#shift-reverse').onclick=()=>chooseGear(selectedGear===-1?1:-1);
