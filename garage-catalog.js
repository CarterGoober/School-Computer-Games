(function(root){
  'use strict';
  const tiers=['rare','legendary','ultra'];
  const newVehicles=[
    {id:'gt3',name:'Apex GT3',kind:'gt3',rarity:'legendary',color:['#368eab','#286a86','#83cdd4'],accel:19,max:55,grip:5.8,turn:.059,mass:1,description:'A wide-body circuit car with a towering rear wing.'},
    {id:'landboat',name:'Land Yacht',kind:'landboat',rarity:'rare',color:['#e2dfc4','#5e8d94','#f7efdc'],accel:13,max:44,grip:3.9,turn:.05,mass:1.4,description:'A boat hull, teak deck, and four very necessary wheels.'},
    {id:'plane',name:'Runway Rebel',kind:'plane',rarity:'legendary',color:['#d8dce0','#839bab','#f1eee0'],accel:18,max:52,grip:4.2,turn:.052,mass:1.1,description:'Wings, a propeller, and a tail. Drives on the road like a car.'},
    {id:'heart',name:'Heartbreaker',kind:'heart',rarity:'rare',color:['#e57891','#b44f77','#ffb3b7'],accel:17,max:47,grip:5.2,turn:.06,mass:.9,description:'A heart-shaped ride with twin rounded lobes and a pointed nose.'},
    {id:'crate',name:'Crate Escape',kind:'crate',rarity:'rare',color:['#c19451','#956b37','#e2c185'],accel:12,max:40,grip:4.8,turn:.05,mass:1.6,description:'The cargo box grew wheels. Handle with absolutely no care.'},
    {id:'hybrid',name:'Trident X',kind:'hybrid',rarity:'ultra',color:['#8faecb','#526d93','#dbdded'],accel:20,max:57,grip:5.7,turn:.057,mass:1.3,description:'The rarest ride: a car cockpit, boat hull, and airplane wings in one.'}
  ];
  const base=[
    {id:'apex',name:'Apex Sprint',kind:'car',color:['#a9c647','#8ca43f','#daf567'],description:'The original precision racer.'},
    {id:'coupe',name:'Sunset Coupe',kind:'car',color:['#cb7340','#b76036','#edaa69']},
    {id:'truck',name:'Trail Pickup',kind:'truck',color:['#729b8b','#547a70','#9bbba3']},
    {id:'train',name:'Little Locomotive',kind:'train',color:['#b34d3f','#823d35','#d57958']},
    {id:'sf90',name:'Ferrari SF90 · tribute',kind:'supercar',color:['#c43832','#982e29','#ee5d43']},
    {id:'cargo',name:'M.V. Wayfarer',kind:'cargo',color:['#253f4c','#ad6554','#e2ddc6']},
    {id:'cruise',name:'M.S. Sundancer',kind:'cruise',color:['#e7e6d5','#294f5c','#bb765d']}
  ];
  const models=Object.fromEntries([...base,...newVehicles].map(v=>[v.id,v]));
  // Each model has its own named design, palette, motif, and layout seed in every rarity.
  const designs={
    apex:[['Gridline Mint','checker','#294d56','#b8edce','#f3f5cb'],['Solarflare Sprint','flame','#702f30','#ffbc4f','#f6e2ad'],['Starlight Circuit','galaxy','#272b5c','#88e7e7','#cda3ff']],
    coupe:[['Pumpkin Run','spooky','#553150','#ed9243','#efedba'],['Neon Terminal','circuit','#143b38','#6ff1a1','#e7ffbc'],['Supernova Sunday','galaxy','#462164','#f2a4df','#8fd6ff']],
    truck:[['Trail Sketch','cartoon','#477a75','#eee2b7','#ef9a70'],['Copper Voltage','lightning','#3c4759','#f6a75d','#e5ded0'],['Polar Aurora','ribbon','#203b62','#74e3ca','#bea4fa']],
    train:[['Midnight Express','spooky','#393044','#b8afdf','#f5c879'],['Ember Freight','flame','#4a3236','#ff8853','#ffd98c'],['Cosmic Railway','galaxy','#23375b','#c5abff','#f5d289']],
    sf90:[['Scuderia Check','checker','#a93645','#fff1df','#293647'],['Crimson Dragon','flame','#65203a','#ffbd6b','#eb7361'],['Hologram 90','prism','#305674','#78f1ec','#ee91d8']],
    gt3:[['Pitlane Domino','checker','#f1e7d6','#394b66','#ed8d55'],['Afterburner 03','flame','#29323f','#f86d9c','#ffc570'],['Event Horizon GT','galaxy','#1e2c49','#e8cb77','#9faff7']],
    landboat:[['Marina Pop','stripe','#418b9d','#e9bc7f','#f2ecda'],['Ghostwake','spooky','#344956','#b9f4cc','#87afcf'],['Abyssal Pearl','ribbon','#244663','#8bdbe0','#dcb4df']],
    plane:[['Air Mail','stripe','#e6ddc4','#c75964','#5e8eaf'],['Storm Chaser','lightning','#305478','#c2e9f4','#d7b6ff'],['Stratosphere','galaxy','#50628b','#e4ebfa','#deb1ed']],
    heart:[['Sweethearts','heart','#ad4371','#ffd1b8','#fff0dd'],['Pixel Crush','circuit','#562854','#f8a4e1','#a9f3bb'],['Love Nebula','galaxy','#692f72','#ffb7d8','#8ee2da']],
    crate:[['Special Delivery','hazard','#b58947','#343b45','#f4dda4'],['Encrypted Cargo','circuit','#263d35','#a9ef7e','#e1d8aa'],['Pandora Prism','prism','#4d4380','#81efde','#ffc0e1']],
    hybrid:[['Tidal Checkmate','checker','#326482','#dce9e3','#d3b37c'],['Triple Threat','lightning','#353b51','#f9b46b','#91dbe1'],['Singularity One','prism','#282744','#f5b4ff','#7beddf']],
    cargo:[['Harbor Hazard','hazard','#c4984d','#263f4c','#f3deac'],['Digital Freighter','circuit','#1f4644','#91efbd','#c6ece4'],['Deep Space Hauler','galaxy','#29355d','#b5b2fb','#edc995']],
    cruise:[['Coral Postcard','cartoon','#e3d9bf','#6eafb0','#e99384'],['Sunset Royale','ribbon','#985478','#ffcd8f','#dbb1db'],['Celestial Voyage','galaxy','#b4d7e4','#4a5d8c','#f9e8bd']]
  };
  const liveries=Object.entries(designs).flatMap(([vehicle,rows],vi)=>rows.map(([name,pattern,body,accent,detail],i)=>({id:`${vehicle}-${tiers[i]}`,vehicle,name,pattern,body,accent,detail,rarity:tiers[i],seed:vi*11+i*29+7,kind:'livery'})));
  const paints=Object.fromEntries(liveries.map(p=>[p.id,p]));
  const games={apex:{name:'Apex Circuit',currency:'Garage Points',models:['apex',...newVehicles.map(v=>v.id)],starters:['apex']},drift:{name:'Sunday Slide',currency:'Garage Points',models:['coupe','truck','train','sf90',...newVehicles.map(v=>v.id)],starters:['coupe','truck','train','sf90']},tide:{name:'Tideline',currency:'Garage Points',models:['cargo','cruise'],starters:['cargo','cruise']}};
  const packages={rare:{name:'Rare',color:'#63ce9a',odds:[.85,.14,.01],vehicle:600,livery:300},legendary:{name:'Legendary',color:'#f6c65b',odds:[.25,.65,.10],vehicle:1800,livery:900},ultra:{name:'Ultra',color:'#d397ff',odds:[.05,.30,.65],vehicle:4800,livery:2700}};
  const api={tiers,newVehicles,models,liveries,paints,games,packages};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GarageCatalog=api;
})(typeof window!=='undefined'?window:globalThis);
