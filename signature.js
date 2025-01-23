
const { u8aToHex, stringToU8a, hexToU8a } = require('@polkadot/util');
const { signatureVerify } = require('@polkadot/util-crypto');
const sha256 = require('js-sha256');
const { Keyring } = require('@polkadot/api');
const { bytesToHex } = require('mui-metablockchain-sdk/src/utils');

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

async function main(params) {
    // let hash = bytesToHex('e3795307047aa10b16449b8eb973b14a397232ddd22c6a9cbe9c81cb6e5d1913');
    let hash = '0xe3795307047aa10b16449b8eb973b14a397232ddd22c6a9cbe9c81cb6e5d1913';
    let signature = '0xaef6dd91bdc7c30b61758dda5cd9c13c66d5c8a56b6a1afe1d6fa19378c2ab28aedf30553440b1f475c2c1473e3a95ab922a149cb07d6d1923c3279462b76f8d';
    let publicKey = '0xe0e62727d6dba183b603fedca5fb7052a953e7117bb7b290dbe8225b7a6fa45b';
    let isSignVerified = await verifySign(hash, signature, publicKey);
    console.log('isSignVerified:', isSignVerified);
}

main()

// let keyringTyoe = 'sr25519';
// let json = {
//     "appId": "MASTER",
//     "issuerAppid": "MMUISSID",
//     "newPublicKey": "0x3e464b08d0a8c98c46df1556bbc76e07f3d73734eeea92d2c429b12e4043cd97"
// };
// let mnemonics = '';
// signData(keyringTyoe, json, mnemonics);