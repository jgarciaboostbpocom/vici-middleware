import { LiveCall } from './types';
import { memory } from '../storage/memory';
import { getPool as getStatePool, getStates, getActiveDidForState } from '../storage/dids';
import { config } from '../config';
import { getPool as sql, updateAccidCidForState } from './db';

type Mode = 'mock'|'real';
const MODE: Mode = ((process.env.VICI_MODE || 'mock').toLowerCase() as Mode);

const NAME2ABBR: Record<string,string> = {
  AL:'AL', ALABAMA:'AL', AK:'AK', ALASKA:'AK', AZ:'AZ', ARIZONA:'AZ', AR:'AR', ARKANSAS:'AR',
  CA:'CA', CALIFORNIA:'CA', CO:'CO', COLORADO:'CO', CT:'CT', CONNECTICUT:'CT', DE:'DE', DELAWARE:'DE',
  FL:'FL', FLORIDA:'FL', GA:'GA', GEORGIA:'GA', HI:'HI', HAWAII:'HI', ID:'ID', IDAHO:'ID',
  IL:'IL', ILLINOIS:'IL', IN:'IN', INDIANA:'IN', IA:'IA', IOWA:'IA', KS:'KS', KANSAS:'KS',
  KY:'KY', KENTUCKY:'KY', LA:'LA', LOUISIANA:'LA', ME:'ME', MAINE:'ME', MD:'MD', MARYLAND:'MD',
  MA:'MA', MASSACHUSETTS:'MA', MI:'MI', MICHIGAN:'MI', MN:'MN', MINNESOTA:'MN', MS:'MS', MISSISSIPPI:'MS',
  MO:'MO', MISSOURI:'MO', MT:'MT', MONTANA:'MT', NE:'NE', NEBRASKA:'NE', NV:'NV', NEVADA:'NV',
  NH:'NH', 'NEW HAMPSHIRE':'NH', NJ:'NJ', 'NEW JERSEY':'NJ', NM:'NM', 'NEW MEXICO':'NM',
  NY:'NY', 'NEW YORK':'NY', NC:'NC', 'NORTH CAROLINA':'NC', ND:'ND', 'NORTH DAKOTA':'ND',
  OH:'OH', OHIO:'OH', OK:'OK', OKLAHOMA:'OK', OR:'OR', OREGON:'OR', PA:'PA', PENNSYLVANIA:'PA',
  RI:'RI', 'RHODE ISLAND':'RI', SC:'SC', 'SOUTH CAROLINA':'SC', SD:'SD', 'SOUTH DAKOTA':'SD',
  TN:'TN', TENNESSEE:'TN', TX:'TX', TEXAS:'TX', UT:'UT', UTAH:'UT', VT:'VT', VERMONT:'VT',
  VA:'VA', VIRGINIA:'VA', WA:'WA', WASHINGTON:'WA', WV:'WV', 'WEST VIRGINIA':'WV',
  WI:'WI', WISCONSIN:'WI', WY:'WY', WYOMING:'WY'
};
function descToState(desc:string):string|null {
  const left=(desc||'').toUpperCase().split('-')[0].trim();
  return NAME2ABBR[left]||null;
}

// MOCK generator
async function mockCalls(): Promise<LiveCall[]> {
  const states = await getStates();
  const out: LiveCall[] = [];
  for (const st of states) {
    let did = memory.getActiveDid(st);
    if (!did) {
      const pool = await getStatePool(st);
      if (pool[0]) { did = pool[0]; memory.setActiveDid(st, did); }
    }
    if (!did) continue;
    for (let i=0;i<3;i++) {
      const dur = 40 + Math.floor(Math.random()*120);
      const vm = Math.random()<0.2;
      out.push({ did, callSeconds:dur, isVoicemail:vm, state:st });
    }
  }
  return out;
}

let lastPollIso: string | null = null;
function isoNow() { return new Date().toISOString().slice(0,19).replace('T',' '); }
function isVmStatus(s: string){ s=(s||'').toUpperCase(); return ['AM','AL','AA','VM','AMM','AAM','A'].includes(s); }

export async function fetchLiveCalls(): Promise<LiveCall[]> {
  if (MODE==='mock') return mockCalls();

  const db = sql();

  // Load AC-CID areacode->state map (plural table)
  const [accidRows] = await (await db).query(
    `SELECT areacode, cid_description, active
       FROM vicidial_campaign_cid_areacodes
      WHERE campaign_id = ?`,
    [config.vici.campaignId]
  );
  const map = new Map<string,string>();
  for (const r of accidRows as any[]) {
    if ((r.active||'N')!=='Y') continue;
    const abbr = descToState(String(r.cid_description||'')); if (abbr) map.set(String(r.areacode), abbr);
  }

  const since = lastPollIso ? lastPollIso : new Date(Date.now()-60_000).toISOString().slice(0,19).replace('T',' ');
  const nowIso = isoNow();

  const [rows] = await (await db).query(
    `SELECT call_date, length_in_sec, status, phone_number
       FROM vicidial_log
      WHERE call_date > ? AND call_date <= ?
        AND campaign_id = ?
      ORDER BY call_date ASC
      LIMIT 2000`,
    [since, nowIso, config.vici.campaignId]
  );
  lastPollIso = nowIso;

  const out: LiveCall[] = [];
  for (const r of rows as any[]) {
    const phone = String(r.phone_number||'');
    const ac = phone.replace(/\D/g,'').slice(0,3);
    const state = map.get(ac) || 'UNASSIGNED';
    let did = memory.getActiveDid(state) || await getActiveDidForState(state) || null as any;
    if (did) memory.setActiveDid(state, did); else continue;
    const len = Number(r.length_in_sec||0);
    const status = String(r.status||'');
    out.push({ did, callSeconds: Number.isFinite(len)?len:0, isVoicemail: isVmStatus(status), state, areaCode: ac });
  }
  return out;
}

export async function updateAcCidForState(state: string, newDid: string) {
  // delegate to db.ts (schema-aware)
  return updateAccidCidForState(config.vici.campaignId, state, newDid);
}
