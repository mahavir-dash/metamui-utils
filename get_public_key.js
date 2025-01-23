const { u8aToHex } = require("@polkadot/util");
const { config } = require("mui-metablockchain-sdk");

const MNEMONIC = "";

async function main() {
    const keyring = await config.initKeyring();
    const keypair = await keyring.addFromUri(MNEMONIC);
    return { address: keypair.address, publicKey: u8aToHex(keypair.publicKey) };
}

main()
    .then(console.log)
    .catch(console.error);