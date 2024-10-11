const { did: didModule, utils, config, connection } = require('mui-metablockchain-sdk'); 

async function addNewPublicKey(userDid, currentMnemonics, newMnemonics) {

    const keyring = await config.initKeyring();
    const provider = await connection.buildConnection('mainnet');
    const currentMnemonicsKp = await keyring.addFromUri(currentMnemonics);
    const newMnemonicsKp = await keyring.addFromUri(newMnemonics);
    const addKey = {
        appId: 'MASTER',
        issuerAppid: 'MMUISSID',
        newPublicKey: newMnemonicsKp.publicKey,
    };
    const vcHex = didModule.generateAddKeyVC(addKey, userDid, currentMnemonicsKp);
    // const vcObject = utils.decodeHex(vcHex, 'AddPubKeyVC');
    // const vcProperty = utils.decodeHex(vcObject.vc_property, 'AddPubKeyVCProperties');
    await didModule.addPublicKey(vcHex, newMnemonicsKp, provider);
    if (provider) {
        provider.disconnect();
    }
} 
let userDid = 'did:ssid:fenn';
let currentMnemonics = 'salon stadium reflect appear taxi entry talk aunt century double hint price conduct broken satisfy hover rookie slim vintage clip winner range cost clay';
let newMnemonics = 'kidney thumb camera lyrics present angry poet above unveil inch latin beauty';
addNewPublicKey(userDid, );