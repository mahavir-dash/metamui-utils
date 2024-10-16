
const { u8aToHex, stringToU8a, hexToU8a } = require('@polkadot/util');
const { signatureVerify } = require('@polkadot/util-crypto');
const sha256 = require('js-sha256');
const { Keyring } = require('@polkadot/api');

async function verifySign(hash, signature, publicKey) {
    return signatureVerify(
        hexToU8a(hash),
        hexToU8a(signature),
        publicKey,
    ).isValid;
}

async function signData(keyringTyoe, json, mnemonics) {
    // sign the VC
    const keyring = new Keyring({ type: keyringTyoe });
    let keyPair = keyring.addFromUri(mnemonics);
    const hash = u8aToHex(sha256(stringToU8a(JSON.stringify(json))));
    const dataToSign = hexToU8a(hash);
    const signedData = keyPair.sign(dataToSign);
    return {
        json: json,
        hash: hash,
        signature: u8aToHex(signedData),
    };
}

let hash = '0x3e464b08d0a8c98c46df1556bbc76e07f3d73734eeea92d2c429b12e4043cd97';
let signature = '0x129499d3b5eddaab5d4f4e66bd0f11c47016165f05c4dcebbd596fc4a191a81eb11eabad345c706ba5354451e6f29f070cbf4521696923f5543e57ea94c9d883';
let publicKey = '0x3e464b08d0a8c98c46df1556bbc76e07f3d73734eeea92d2c429b12e4043cd97';
verifySign(hash, signature, publicKey);

let keyringTyoe = 'sr25519';
let json = {
    "appId": "MASTER",
    "issuerAppid": "MMUISSID",
    "newPublicKey": "0x3e464b08d0a8c98c46df1556bbc76e07f3d73734eeea92d2c429b12e4043cd97"
};
let mnemonics = '';
signData(keyringTyoe, json, mnemonics);