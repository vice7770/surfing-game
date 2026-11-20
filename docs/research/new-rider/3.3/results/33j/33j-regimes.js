const fs=require("fs");
const files=process.argv.slice(2);
const rows=[];
for(const f of files) for(const l of fs.readFileSync(f,"utf8").trim().split("\n")) rows.push(JSON.parse(l));
const num=(r,k)=>r[k]===null||r[k]===undefined?NaN:Number(r[k]);
const sp=(v,d=2)=>{const s=v.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?`${s[0].toFixed(d)}–${s[s.length-1].toFixed(d)}`:"–";};
const med=(v)=>{const s=v.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?s[Math.floor(s.length/2)]:NaN;};
const regime=(r)=>{const a=Math.abs(num(r,"rollRaw"));return a<10?"A flat (<10°)":a<60?"B partial (10–60°)":"C capsize (≥60°)";};
const groups={};
for(const r of rows){const k=regime(r);(groups[k]=groups[k]||[]).push(r);}
groups["ALL"]=rows;
const cols=[["n",g=>g.length],
 ["fell",g=>g.filter(x=>x.fell).length],
 ["stances",g=>`${g.filter(x=>x.stance==="tall").length}t/${g.filter(x=>x.stance==="compress").length}c`],
 ["sticks",g=>sp(g.map(x=>num(x,"steer")),2)],
 ["fellAt s",g=>sp(g.map(x=>num(x,"fellAt")))],
 ["roll@fall °",g=>sp(g.map(x=>num(x,"rollRaw")),1)],
 ["roll peak °",g=>sp(g.map(x=>num(x,"rollPeak")),1)],
 ["LEAD °",g=>sp(g.map(x=>num(x,"lead")),1)],
 ["lead med °",g=>med(g.map(x=>num(x,"lead"))).toFixed(1)],
 ["lead>0",g=>`${g.filter(x=>num(x,"lead")>0).length}/${g.length}`],
 ["leadShare",g=>sp(g.map(x=>num(x,"leadShareHalf")),2)],
 ["com@fall m",g=>sp(g.map(x=>num(x,"comEnd")),3)],
 ["comPeak m",g=>sp(g.map(x=>num(x,"comPeakHalf")),3)],
 ["×feet",g=>sp(g.map(x=>num(x,"comOverFeet")),2)],
 ["over feet",g=>`${g.filter(x=>num(x,"comOverFeet")>1).length}/${g.length}`],
 ["px m",g=>sp(g.map(x=>num(x,"px")),3)],
 ["demand m",g=>sp(g.map(x=>num(x,"demand")),3)],
 ["offX m",g=>sp(g.map(x=>num(x,"offX")),3)],
 ["deckShare",g=>sp(g.map(x=>num(x,"deckShare")),2)],
 ["vTerm m",g=>sp(g.map(x=>num(x,"vTermSigned")),3)],
 ["trigger b/w/t",g=>`${g.filter(x=>x.trigger==="beyond").length}/${g.filter(x=>x.trigger==="weightPast").length}/${g.filter(x=>x.trigger==="together").length}`],
 ["aRes/aMax",g=>sp(g.map(x=>num(x,"aResHeld")/num(x,"aMax")),2)],
 ["aMax m/s²",g=>sp(g.map(x=>num(x,"aMax")),2)],
 ["ankle peak/bound",g=>sp(g.map(x=>num(x,"ankleRatioPeakHalf")),2)],
 ["bodyFelt m/s",g=>sp(g.map(x=>num(x,"bodyFelt")),2)],
 ["feetFelt m/s",g=>sp(g.map(x=>num(x,"feetFelt")),2)],
 ["bodyFaster",g=>`${g.filter(x=>x.bodyFaster===1).length}/${g.filter(x=>x.bodyFaster!==null).length}`],
 ["frozen last",g=>sp(g.map(x=>num(x,"frozenLast")),2)],
 ["net °",g=>sp(g.map(x=>num(x,"net")),1)],
];
const names=Object.keys(groups);
console.log(["quantity",...names].join(" | "));
console.log(["---",...names.map(()=>"---")].join(" | "));
for(const [label,fn] of cols) console.log([label,...names.map(n=>fn(groups[n]))].join(" | "));
