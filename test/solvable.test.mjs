// Generates many seeded runs with the shipped spawn code and checks every
// obstacle sequence can be cleared given flip duration and player size.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const src = readFileSync(new URL("../docs/assets/index-BBzqjW_B.js", import.meta.url), "utf8");
const grab = (re) => { const x = src.match(re); assert.ok(x, "missing " + re); return x[0]; };
const consts = ["R", "S", "m"].map((k) => grab(new RegExp(`\\b${k}=\\{[^}]*\\}`))).join(";");
const funcs = grab(/function ve\(\)[\s\S]*?(?=function xe\(\))/);

function rng(seed) { return () => { seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const SEEDS = Number(process.env.SEEDS || 2000);
let checked = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const r = rng(seed);
  const ctx = vm.createContext({ Math: Object.assign(Object.create(Math), { random: r }) });
  vm.runInContext(`var ${consts};var s=800,w=380,x=120,B=0,E=S.baseSpeed,C=[],O=176+480,lastSide="floor";${funcs};
    ve();var all=[];var seen=new Set();
    for(var t=0;t<120;t+=1/60){E=Math.min(S.maxSpeed,E+S.speedRamp*t*0+S.speedRamp/60);B+=E/60;Pe();for(var o of C){if(!seen.has(o)){seen.add(o);all.push({x:o.x,w:o.w,side:o.side,E:E})}}}
    E=S.maxSpeed;`, ctx);
  const { all, R, S } = ctx;
  const obs = [...all].sort((a, b) => a.x - b.x);
  assert.ok(obs.length > 50, `seed ${seed}: too few obstacles`);
  for (let i = 1; i < obs.length; i++) {
    const a = obs[i - 1], b = obs[i];
    assert.ok(b.x > a.x + a.w, `seed ${seed}: overlapping obstacles at x=${b.x}`);
    if (a.side === b.side) continue; // stay put, always passable
    const speed = S.maxSpeed; // worst case
    const window = (b.x - (a.x + a.w) - R.size) / speed;
    assert.ok(window >= R.flipDuration, `seed ${seed}: impassable pair at x=${a.x.toFixed(0)} (window ${window.toFixed(3)}s < ${R.flipDuration}s)`);
    checked++;
  }
}
console.log(`ok: ${SEEDS} seeds, ${checked} opposite-side transitions passable`);
