import fs from 'node:fs';
import {createHub,HUB_DOORS,HUB_SPAWN} from '../js/world/hub.js';
import {DEFAULT_CONFIG} from '../js/config.js';
import {assetFilename} from '../js/assets.js';
import {findPath} from '../js/world/movement.js';
const manifest=JSON.parse(fs.readFileSync(new URL('../assets/manifest.json',import.meta.url)));
const objects=Object.fromEntries(manifest.objects.map(id=>{const b=fs.readFileSync(new URL('../assets/objects/'+assetFilename(manifest,'objects',id),import.meta.url));return[id,{w:b.readUInt32BE(16),h:b.readUInt32BE(20)}]}));
const s={w:96,h:72},couple=Object.fromEntries(['down','up','left','right'].map(d=>[d,[s]]));
const entries=Array.from({length:30},(_,i)=>({n:'guest'+i,c:i%10,t:i,m:'祝'}));
function layout(w,h,ty,group=false){
 const hub=createHub({config:DEFAULT_CONFIG,assets:{objects:{...objects,tree:{w,h}},characters:{couple}},data:{messages:[]}});
 hub.objects=hub.objects.map(o=>hub.makeObject({...o,ty:o.sprite==='tree'?ty:group&&o.sprite==='wedding-cake'?9:group&&o.id==='ribbon-left'?7:o.ty}));
 hub.guestMap=new Map();hub.setGuests([]);
 const guests=hub.guestMap.size;
 const objectData=hub.objects.map(o=>({id:o.id,sprite:o.sprite,src:'../assets/objects/'+assetFilename(manifest,'objects',o.sprite),x:o.tx*32,y:o.drawY,w:o.spr.w,h:o.spr.h,bottom:o.bottom,floor:!!o.floor,label:o.label}));
 const chars=hub.npcs.map(n=>{const side=n===hub.baseNpcs[0]?'couple':n===hub.baseNpcs[1]?'preset-4':'preset-'+((n.entry.c%10+10)%10);const w=side==='couple'?96:48;return{src:'../assets/characters/'+assetFilename(manifest,'characters',side),x:n.character.x-w/2,y:n.character.y-72,w,h:72,bottom:n.character.y};});
 hub.guestMap=new Map();hub.setGuests(entries);
 return{tree:[w,h],ty,group,defaultGuests:guests,maxDisplayed:hub.guestMap.size,doorPaths:Object.fromEntries(Object.entries(HUB_DOORS).map(([k,d])=>[k,findPath(hub.map.w,hub.map.h,(x,y)=>hub.isSolidTile(x,y),HUB_SPAWN,d.back)?.length??0])),objects:objectData,chars};
}
const result={note:'Design-only model; production code and assets are unchanged. Capacity uses existing full-width tree collision/reservations.',current:layout(64,96,5),treeOnly:layout(96,128,3),proposed:layout(96,128,3,true),lowerTree:layout(96,128,4),lowestTree:layout(96,128,5),oversize:layout(128,160,3)};
fs.writeFileSync(new URL('./garden-design-layouts.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(Object.fromEntries(Object.entries(result).filter(([k])=>k!=='note').map(([k,v])=>[k,{tree:v.tree,ty:v.ty,defaultGuests:v.defaultGuests,maxDisplayed:v.maxDisplayed,doorPaths:v.doorPaths}]))));
