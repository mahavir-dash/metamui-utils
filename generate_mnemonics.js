const { u8aToHex } = require("@polkadot/util");
const { mnemonicGenerate } = require("@polkadot/util-crypto");
const { config } = require("mui-metablockchain-sdk");


async function main() {
    const keyring = await config.initKeyring();
    const mnemonic = mnemonicGenerate();
    const keypair = await keyring.addFromUri(mnemonic);
    return { mnemonic, address: keypair.address, publicKey: u8aToHex(keypair.publicKey) };
}

main()
    .then(console.log)
    .catch(console.error);