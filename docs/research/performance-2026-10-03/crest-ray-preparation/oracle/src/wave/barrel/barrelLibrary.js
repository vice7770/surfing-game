"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.barrelCasesFor = barrelCasesFor;
exports.loadBarrelCaseBytes = loadBarrelCaseBytes;
exports.libraryFromBytes = libraryFromBytes;
exports.loadBarrelLibrary = loadBarrelLibrary;
const barrelLibraryIndex_1 = require("./barrelLibraryIndex");
const profileFormat_1 = require("./profileFormat");
const ProfileLibrary_1 = require("./ProfileLibrary");
/** The index's cases for one spot (Part B, PR 7): a spot loads only its own transect's cases. */
function barrelCasesFor(spot, cases = barrelLibraryIndex_1.BARREL_CASES) {
    return cases.filter((entry) => entry.spot === spot);
}
/**
 * Every case's file in the list, fetched: the page draws from them and hands them to the surf zone for its contact
 * (the Padang Padang spec, Part B, PR 4). A node caller passes a fetcher that reads public/.
 */
async function loadBarrelCaseBytes(cases = barrelLibraryIndex_1.BARREL_CASES, fetcher = globalThis.fetch.bind(globalThis)) {
    if (cases.length === 0)
        throw new Error('The barrel library has no cases; run npm run barrels');
    return Promise.all(cases.map(async (entry) => {
        const response = await fetcher(entry.asset);
        if (!response.ok)
            throw new Error(`The barrel case ${entry.asset} did not load (${response.status})`);
        return new Uint8Array(await response.arrayBuffer());
    }));
}
/** Case files decoded into one library. */
function libraryFromBytes(bytes) {
    return new ProfileLibrary_1.ProfileLibrary(bytes.map(profileFormat_1.decodeCase));
}
/** Every case in the list, fetched and decoded into one library. */
async function loadBarrelLibrary(cases = barrelLibraryIndex_1.BARREL_CASES, fetcher = globalThis.fetch.bind(globalThis)) {
    return libraryFromBytes(await loadBarrelCaseBytes(cases, fetcher));
}
