const { vc, connection, config, utils } = require("mui-metablockchain-sdk");

const TOKEN_OWNER = "did:yidindji:master";
const TOKEN_NAME = "Yidindji Dollar";
const CURRENCY_CODE = "SYD";
const DECIMALS = 2;
const RESERVABLE_BALANCE = 1;

const ISSUER_DID = "did:ssid:swn";
const ISSUER_MNEMONICS = "";
const SUDO_MNEMONICS = "";

async function main() {
    let tokenVC = {
        tokenName: TOKEN_NAME,
        reservableBalance: RESERVABLE_BALANCE,
        decimal: DECIMALS,
        currencyCode: CURRENCY_CODE,
    };
    let owner = TOKEN_OWNER;
    let issuers = [
        ISSUER_DID,
    ];
    const keyring = await config.initKeyring();
    const provider = await connection.buildConnection("testnet");
    const sudoKeypair = await keyring.addFromUri(SUDO_MNEMONICS);
    const issuerKeypair = await keyring.addFromUri(ISSUER_MNEMONICS);
    let vcHex = await vc.generateVC(tokenVC, owner, issuers, "TokenVC", issuerKeypair);
    let vcData = utils.decodeHex(vcHex, "VC");
    console.log(vcData);
    let vcProperty = utils.decodeHex(vcData.vc_property, "TokenVC");
    console.log(vcProperty);
    const transaction = await storeVC(vcHex, sudoKeypair, provider);
    console.log(transaction);
    return transaction;
}


/**
 * Store VC with council
 * @param  {Hex} vcHex
 * @param  {KeyPair} sigKeypairOwner
 * @param  {KeyPair} sigKeypairRoot
 * @param  {KeyPair} sigKeypairCouncil
 * @param  {Api} provider
 */
async function storeVC(vcHex, sudoKeyPair, provider) {
    return new Promise(async (resolve, reject) => {
        const tx = provider.tx.sudo.sudo(provider.tx.vc.store(vcHex));
        await tx.signAndSend(sudoKeyPair, { nonce: -1 }, ({ events, status, dispatchError }) => {
            if (dispatchError) {
                if (dispatchError.isModule) {
                    const decoded = provider.registry.findMetaError(dispatchError.asModule);
                    const { documentation, name, section } = decoded;
                    reject(new Error(`${section}.${name}`));
                } else {
                    reject(new Error(dispatchError.toString()));
                }
            } else if (status.isFinalized) {
                console.log('Finalized at blockHash:', status.asFinalized.toHex());
                events.forEach(({ event: { method, section, data }, phase }) => {
                    console.log(`Event: ${section}.${method} ${data.toString()}`);
                });
                resolve('Success');
            }
        });
    });
}

main()
    .then(console.log)
    .catch(console.error);