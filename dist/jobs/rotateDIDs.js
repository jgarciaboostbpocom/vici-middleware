"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rotateDIDs = rotateDIDs;
const didRotation_1 = require("../logic/didRotation");
async function rotateDIDs() {
    return (0, didRotation_1.rotateAllStatesIfNeeded)();
}
