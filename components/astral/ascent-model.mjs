export const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,value));
export const ease=value=>{const t=clamp(value);return t*t*(3-2*t);};
export const stages=[
  {key:'abyss',at:0,name:'Demon Avenger',chapter:'THE LONG NIGHT',title:'For so long,<br>bound to the dark.',description:'But even here, a light has been waiting.'},
  {key:'genesis',at:.20,name:'Demon Avenger',chapter:'GENESIS',title:'The time<br>has come.',description:'One holy strike. The chains of the past fall away.'},
  {key:'maple',at:.38,name:'Demon Avenger',chapter:'MAPLE WORLD',title:'Beyond the shadows,<br>a world awaits.',description:'Rise slowly. The darkness no longer holds you.'},
  {key:'symbol',at:.51,name:'Demon Slayer',chapter:'HOLY SYMBOL',title:'Not an ending.<br>An awakening.',description:'A sacred blessing. A new strength. Wings touched by light.'},
  {key:'rebirth',at:.82,name:'Angel Avenger',chapter:'ANGELIC REBIRTH',title:'What was broken<br>becomes glorious.',description:'Dark wings fall away. An Angel Avenger rises.'},
  {key:'nexus',at:.96,name:'Angel Avenger',chapter:'ASTRAL NEXUS',title:'Your story.<br><em>Begins here.</em>',description:'A familiar world. A new story. Welcome to TRIXTERMS.'}
];
export function journeyState(raw){
  const progress=clamp(Number.isFinite(raw)?raw:0);
  const phase=stages.reduce((index,stage,i)=>progress>=stage.at?i:index,0);
  const demonToSlayer=ease((progress-.515)/.08);
  const slayerToAngel=ease((progress-.845)/.09);
  const beam=Math.max(0,Math.sin(clamp((progress-.20)/.16)*Math.PI));
  const blessing=Math.max(0,Math.sin(clamp((progress-.51)/.17)*Math.PI));
  const flash=Math.max(0,Math.sin(clamp((progress-.85)/.05)*Math.PI))*.5;
  return {progress,phase,demonToSlayer,slayerToAngel,beam,blessing,flash,unbound:ease((progress-.255)/.065),wingLight:ease((progress-.64)/.19)};
}
