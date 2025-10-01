"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateAht = updateAht;
exports.getRollingAht = getRollingAht;
const memory_1 = require("../storage/memory");
function updateAht(did, callSeconds) {
    memory_1.memory.pushCall(did, callSeconds);
}
function getRollingAht(did) {
    return memory_1.memory.getAht(did);
}
