(function(root){
'use strict';
const P=typeof module!=='undefined'&&module.exports?require('./trenches-core.js'):root.TrenchesCore;
const KEY='afterclass-trenches-v1',SKILLS=['strength','footwork','awareness','run','pass','stamina'];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),text=(v,max=48)=>typeof v==='string'?v.trim().slice(0,max):'';
const rating=v=>Number.isFinite(Number(v))?clamp(Math.round(Number(v)),1,99):70;
function player(id,alias,position=''){return{id,alias,position,number:'',strength:70,footwork:70,awareness:70,run:70,pass:70,stamina:70};}
function fresh(){return{version:1,settings:{team:'gold',sound:false,voice:false,realNames:false},teams:{gold:{name:'Little Elm Freshman Gold',color:'#e7b94a',emblem:'wolf',players:[player('gold-c','Gold player A','C'),player('gold-rg','Gold player B','RG'),player('gold-rt','Gold player C','RT'),player('gold-lg','Gold player D','LG'),player('gold-t','Gold player E','T')]},navy:{name:'Little Elm Freshman Navy',color:'#344a7a',emblem:'wolf',players:Array.from({length:6},(_,i)=>player(['navy-c','navy-z','navy-s','navy-p','navy-l','navy-j'][i],'Navy player '+String.fromCharCode(65+i),i?'':'C'))}},privateNames:{},training:{gold:0,navy:0},practice:[],season:null,current:null,currentMeta:null};}
function displayName(data,p){return data.settings.realNames&&data.privateNames[p.id]?data.privateNames[p.id]:p.alias;}
function lineup(data,team){return P.POSITIONS.map(position=>{const p=data.teams[team].players.find(p=>p.position===position);return p||{...player(null,'Unassigned '+position,position)};});}
function editPlayer(data,team,id,values){
 const rows=data.teams[team].players,p=rows.find(p=>p.id===id);if(!p)throw Error('Unknown roster player.');
 if(typeof values.alias==='string')p.alias=text(values.alias)||p.alias;
 if(values.number!==undefined){const n=String(values.number).trim();if(n&&!/^\d{1,2}$/.test(n))throw Error('Use a jersey number from 0 to 99, or leave it blank.');p.number=n;}
 if(values.position!==undefined){if(!['','T',...P.POSITIONS].includes(values.position))throw Error('Choose a known position or TBD.');p.position=values.position;if(P.POSITIONS.includes(p.position))for(const other of rows)if(other!==p&&other.position===p.position)other.position='';}
 for(const key of SKILLS)if(values[key]!==undefined)p[key]=rating(values[key]);return p;
}
function importRoster(data,input){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Choose a roster JSON file.');
 const out=JSON.parse(JSON.stringify(data));
 if(input.privateNames){
  const ids=Object.values(out.teams).flatMap(t=>t.players.map(p=>p.id));
  if(typeof input.privateNames!=='object'||Array.isArray(input.privateNames)||Object.entries(input.privateNames).some(([id,name])=>!ids.includes(id)||typeof name!=='string'||!name.trim()||name.length>60))throw Error('Private roster contains an unknown player ID or invalid name.');
  Object.assign(out.privateNames,input.privateNames);
 }else if(input.version===1&&input.teams){
  for(const team of ['gold','navy']){const incoming=input.teams[team];if(!incoming||!Array.isArray(incoming.players))throw Error('Both teams are required.');
   out.teams[team].name=text(incoming.name)||out.teams[team].name;
   if(/^#[0-9a-f]{6}$/i.test(incoming.color))out.teams[team].color=incoming.color;
   if(['wolf','star','mountain'].includes(incoming.emblem))out.teams[team].emblem=incoming.emblem;
   // Clear assignments before restoring so stale duplicate assignments cannot survive an import.
   for(const p of out.teams[team].players)p.position='';
   for(const p of incoming.players)editPlayer(out,team,p.id,p);
  }
 }else throw Error('This is not a Trenches roster export.');
 return out;
}
function publicExport(data){return{version:1,settings:{...data.settings,realNames:false},teams:JSON.parse(JSON.stringify(data.teams))};}
function newSeason(team,id){
 const names=['Copper Creek Scouts','Prairie Ridge Cubs','Cedar Hollow Juniors','Lakeside Wolves','Westfield Rookies','Oak Valley Cadets','Northbank Juniors','Lakeside Wolves'];
 return{id,team,week:0,wins:0,losses:0,ties:0,complete:false,receipts:[],schedule:names.map((name,i)=>({week:i+1,name,fictional:true,rivalry:i===3||i===7,home:i%2===0,result:null})),stats:{plays:0,yards:0,sacks:0,pancakes:0,pickups:0,perfect:0,gradeTotal:0}};
}
function recordGame(season,match,id){
 if(!season||season.complete||match.phase!=='final'||match.mode!=='season'||match.team!==season.team||season.receipts.includes(id)||id!==season.id+':'+season.week)return false;
 const result=match.score>match.opponentScore?'W':match.score<match.opponentScore?'L':'T';season[result==='W'?'wins':result==='L'?'losses':'ties']++;
 season.schedule[season.week].result={result,score:match.score,against:match.opponentScore,grade:Math.round(match.stats.gradeTotal/Math.max(1,match.stats.plays))};
 for(const k of Object.keys(season.stats))season.stats[k]+=match.stats[k]||0;season.receipts.push(id);season.week++;season.complete=season.week===8;return true;
}
function practiceResult(data,team,drill,grade,id){
 if(data.practice.some(p=>p.id===id))return false;
 data.practice.unshift({team,drill,grade:Math.round(grade),id});data.practice=data.practice.slice(0,50);data.training[team]=Math.min(8,data.training[team]+(grade>=60?.4:.1));return true;
}
function validCurrent(s){
 if(!s||s.version!==1||!['presnap','live','result','final'].includes(s.phase)||!P.CALLS[s.call?.code]||!['gold','navy'].includes(s.team)||!['season','quick','scrimmage','practice'].includes(s.mode))return false;
 if(!['snap','run','pass','blitz','reaction'].includes(s.drill)||!Array.isArray(s.ratings)||![0,5].includes(s.ratings.length)||!s.ratings.every(r=>SKILLS.every(k=>Number.isFinite(r?.[k])&&r[k]>=1&&r[k]<=99)))return false;
 if(s.assignment&&(!['ArrowLeft','ArrowRight','ArrowDown','ArrowUp'].includes(s.assignment.key)||typeof s.assignment.correct!=='boolean'||!Number.isFinite(s.assignment.quality)||s.assignment.quality<0||s.assignment.quality>1||!Number.isFinite(s.assignment.delay)))return false;
 if(!Array.isArray(s.line)||s.line.length!==5||!Array.isArray(s.defenders)||![5,6].includes(s.defenders.length))return false;
 const numbers=['seed','quarter','clock','down','toGo','ball','score','opponentScore','time','playNumber','playTime','meter','meterDirection','target','challenge','reactionBoost','snapAt','snapQuality'];
 if(!numbers.every(k=>Number.isFinite(s[k])))return false;
 if(s.down<1||s.down>4||s.quarter<1||s.quarter>4||s.clock<0||s.clock>90||s.toGo<=0||s.ball<0||s.ball>100)return false;
 if(!s.line.every(p=>['x','y','home','steps','stamina','leverage','vx','vy'].every(k=>Number.isFinite(p[k]))&&SKILLS.every(k=>Number.isFinite(p.rating?.[k]))))return false;
 if(!s.defenders.every(p=>['x','y','pressure'].every(k=>Number.isFinite(p[k]))))return false;
 if(!['qb','runner'].every(k=>Number.isFinite(s[k]?.x)&&Number.isFinite(s[k]?.y))||!Object.keys(freshStats()).every(k=>Number.isFinite(s.stats?.[k])&&(k==='yards'||s.stats[k]>=0)))return false;
 if(s.prompt&&(!['ArrowLeft','ArrowRight','ArrowDown'].includes(s.prompt.key)||!Number.isFinite(s.prompt.expires)||typeof s.prompt.label!=='string'))return false;
 if(['result','final'].includes(s.phase)&&(!s.result||typeof s.result.kind!=='string'||!Number.isFinite(s.result.grade)||!Number.isFinite(s.result.yards)))return false;
 return !!s.blitz&&['edge','interior','none'].includes(s.blitz.type)&&[-1,0,1].includes(s.blitz.side)&&typeof s.blitz.fake==='boolean'&&Array.isArray(s.log)&&s.log.length<=12;
}
function freshStats(){return{plays:0,yards:0,sacks:0,pancakes:0,pickups:0,perfect:0,gradeTotal:0};}
function validSeason(s){
 if(!s||!['gold','navy'].includes(s.team)||typeof s.id!=='string'||!Number.isInteger(s.week)||s.week<0||s.week>8||s.complete!==(s.week===8)||!Array.isArray(s.schedule)||s.schedule.length!==8||!Array.isArray(s.receipts)||s.receipts.length!==s.week)return false;
 if(!['wins','losses','ties'].every(k=>Number.isInteger(s[k])&&s[k]>=0)||s.wins+s.losses+s.ties!==s.week||!Object.keys(freshStats()).every(k=>Number.isFinite(s.stats?.[k])))return false;
 const counts={W:0,L:0,T:0};
 for(let i=0;i<8;i++){
  const w=s.schedule[i];if(!w||typeof w.name!=='string'||w.fictional!==true||w.week!==i+1||typeof w.home!=='boolean'||typeof w.rivalry!=='boolean')return false;
  if(i<s.week){const r=w.result;if(!r||!['W','L','T'].includes(r.result)||!Number.isFinite(r.grade)||!Number.isInteger(r.score)||!Number.isInteger(r.against)||r.score<0||r.against<0||s.receipts[i]!==s.id+':'+i)return false;counts[r.result]++;}
  else if(w.result!==null)return false;
 }
 return counts.W===s.wins&&counts.L===s.losses&&counts.T===s.ties;
}
function load(storage){
 let d=fresh();try{
  const raw=JSON.parse(storage.getItem(KEY));if(raw?.version!==1)return d;
  if(raw.teams){try{d=importRoster(d,{version:1,teams:raw.teams});}catch{}}
  if(raw.privateNames){try{d=importRoster(d,{privateNames:raw.privateNames});}catch{}}
  for(const k of ['sound','voice','realNames'])d.settings[k]=raw.settings?.[k]===true;
  d.settings.team=raw.settings?.team==='navy'?'navy':'gold';
  for(const t of ['gold','navy'])d.training[t]=clamp(Number(raw.training?.[t])||0,0,8);
  if(Array.isArray(raw.practice))d.practice=raw.practice.filter(p=>p&&typeof p.id==='string'&&['gold','navy'].includes(p.team)&&Number.isFinite(p.grade)).slice(0,50);
  if(validSeason(raw.season))d.season=raw.season;
  if(validCurrent(raw.current)&&raw.currentMeta&&typeof raw.currentMeta.id==='string'&&typeof raw.currentMeta.opponent==='string'){
   const s=raw.current;if(s.mode!=='season'||d.season&&(raw.currentMeta.id===d.season.id+':'+d.season.week||d.season.receipts.includes(raw.currentMeta.id))){s.call=P.CALLS[s.call.code];d.current=s;d.currentMeta=raw.currentMeta;}
  }
 }catch{}return d;
}
function save(data,storage){try{storage.setItem(KEY,JSON.stringify(data));return true;}catch{return false;}}
const api={KEY,SKILLS,fresh,displayName,lineup,editPlayer,importRoster,publicExport,newSeason,recordGame,practiceResult,load,save};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TrenchesData=api;
})(typeof window!=='undefined'?window:globalThis);
