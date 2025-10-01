import { promises as fsp } from 'fs';
const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/events.json`;
const MAX_EVENTS = 2000;

export type SwitchEvent = {
  type: 'switch';
  time: string;
  state: string;
  reason: string;
  oldDid: string | null;
  newDid: string;
  callsToday?: number;
  aht?: number;
};

export type VmDropEvent = {
  type: 'vm';
  time: string;
  state: string;
  did: string;
  seconds: number;
};

type AnyEvent = SwitchEvent | VmDropEvent;

async function readAll(): Promise<AnyEvent[]> {
  try { return JSON.parse(await fsp.readFile(FILE, 'utf-8')); }
  catch { return []; }
}
async function writeAll(list: AnyEvent[]) {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.writeFile(FILE, JSON.stringify(list.slice(-MAX_EVENTS), null, 2), 'utf-8');
}

export async function addSwitch(e: Omit<SwitchEvent, 'type' | 'time'>) {
  const list = await readAll();
  list.push({ type: 'switch', time: new Date().toISOString(), ...e });
  await writeAll(list);
}
export async function addVmDrop(e: Omit<VmDropEvent, 'type' | 'time'>) {
  const list = await readAll();
  list.push({ type: 'vm', time: new Date().toISOString(), ...e });
  await writeAll(list);
}
export async function getEvents(limit = 200): Promise<AnyEvent[]> {
  const list = await readAll();
  return list.slice(-limit);
}
