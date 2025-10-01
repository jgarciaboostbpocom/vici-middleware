"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addSwitch = addSwitch;
exports.addVmDrop = addVmDrop;
exports.getEvents = getEvents;
const fs_1 = require("fs");
const DATA_DIR = '/opt/vici-mw/data';
const FILE = `${DATA_DIR}/events.json`;
const MAX_EVENTS = 2000;
async function readAll() {
    try {
        return JSON.parse(await fs_1.promises.readFile(FILE, 'utf-8'));
    }
    catch {
        return [];
    }
}
async function writeAll(list) {
    await fs_1.promises.mkdir(DATA_DIR, { recursive: true });
    await fs_1.promises.writeFile(FILE, JSON.stringify(list.slice(-MAX_EVENTS), null, 2), 'utf-8');
}
async function addSwitch(e) {
    const list = await readAll();
    list.push({ type: 'switch', time: new Date().toISOString(), ...e });
    await writeAll(list);
}
async function addVmDrop(e) {
    const list = await readAll();
    list.push({ type: 'vm', time: new Date().toISOString(), ...e });
    await writeAll(list);
}
async function getEvents(limit = 200) {
    const list = await readAll();
    return list.slice(-limit);
}
