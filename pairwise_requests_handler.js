const { decodeAddress, blake2AsHex } = require('@polkadot/util-crypto');
const { utils, config, did } = require('mui-metablockchain-sdk');
const { u8aToHex } = require('@polkadot/util');
const { setImmediate } = require('timers');
const { sha256 } = require('js-sha256');
const process = require('process');
const WebSocket = require('ws');
const axios = require('axios');

const { DID_COMM_SERVER_URL, AUTH_SERVER_URL, WHITELISTED_DIDS } = require('./config');


const axiosInstance = axios.create({
    baseURL: AUTH_SERVER_URL + "/v1/api",
    timeout: 20000,
});

let webSocketRef = {};
const WEBSOCKET_TIMEOUT = 10000; // 10 Seconds
const ISSUER_APP_ID = "MASTER";

async function get_dids() {
    return WHITELISTED_DIDS;
}

async function login(user_did, mnemonics, app_id = "MMUISSID") {
    let keyring = await config.initKeyring();
    let keypair = await keyring.addFromUri(mnemonics);
    const trustRequest = {
        my_did: did.sanitiseDid(user_did),
        my_public_key: u8aToHex(keypair.publicKey),
        pair_did: "0x6469643a737369643a6d6574616d75695f6261636b656e640000000000000000",
        timestamp: `${Math.floor(Date.now() / 1000)}`,
    };
    const newHash = "0x" + sha256(JSON.stringify(trustRequest));
    const newSignature = utils.bytesToHex(keypair.sign(newHash));
    const {
        data: { data },
    } = await axiosInstance.post("/trust/?app_id=" + app_id, {
        ...trustRequest,
        hash: newHash,
        signature: newSignature,
    });

    const signinTimestamp = `${Math.floor(Date.now() / 1000)}`;
    const signinRequest = {
        public_key: u8aToHex(keypair.publicKey),
        server_vc: data,
        timestamp: signinTimestamp,
    };

    const signinHash = "0x" + sha256(JSON.stringify(signinRequest));
    const signinSignature = utils.bytesToHex(keypair.sign(signinHash));
    const {
        data: { data: loginData },
    } = await axiosInstance.post("/login/?app_id=" + app_id, {
        ...signinRequest,
        hash: signinHash,
        signature: signinSignature,
    });
    return loginData?.token;
}

const authenticate = (user_did, token) => {
    return new Promise((resolve, reject) => {
        if (!webSocketRef[user_did] || webSocketRef[user_did].readyState !== WebSocket.OPEN) {
            return reject(new Error("WebSocket is not open" + user_did));
        }

        const timeout = setTimeout(() => {
            webSocketRef[user_did].removeEventListener("message", handleResponse);
            reject(new Error("Authentication timed out"));
        }, WEBSOCKET_TIMEOUT);

        const handleResponse = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            if (message.event === "AuthenticationAck") {
                clearTimeout(timeout);
                webSocketRef[user_did].removeEventListener("message", handleResponse);
                resolve(message.data);
            }
        };

        webSocketRef[user_did].addEventListener("message", handleResponse);

        sendMessage(user_did, {
            event: "Authentication",
            data: {
                token,
            }
        });
    });
}

const fetchDIDCache = (user_did) => {
    return new Promise((resolve, reject) => {
        if (!webSocketRef[user_did] || webSocketRef[user_did].readyState !== WebSocket.OPEN) {
            return reject(new Error("WebSocket is not open" + user_did));
        }

        const timeout = setTimeout(() => {
            webSocketRef[user_did].removeEventListener("message", handleResponse);
            reject(new Error("Fetch DID Cache timed out"));
        }, WEBSOCKET_TIMEOUT);

        const handleResponse = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            if (message.event === "FetchDIDCacheResponse") {
                clearTimeout(timeout);
                webSocketRef[user_did].removeEventListener("message", handleResponse);
                resolve(message.data);
            }
        };

        webSocketRef[user_did].addEventListener("message", handleResponse);

        sendMessage(user_did, {
            event: "FetchDIDCache",
            data: { timestamp: Date.now() },
        });
    });
}

const sendPairwiseVerificationConfirmation = (user_did, data) => {
    return new Promise((resolve, reject) => {
        if (!webSocketRef[user_did] || webSocketRef[user_did].readyState !== WebSocket.OPEN) {
            return reject(new Error("WebSocket is not open" + user_did));
        }

        const timeout = setTimeout(() => {
            webSocketRef[user_did].removeEventListener("message", handleResponse);
            reject(new Error("Pairwise Verification Confirmation timed out"));
        }, WEBSOCKET_TIMEOUT);

        const handleResponse = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            if (message.event === "PairwiseVerificationConfirmationAck") {
                clearTimeout(timeout);
                webSocketRef[user_did].removeEventListener("message", handleResponse);
                resolve(message.data);
            }
        };

        webSocketRef[user_did].addEventListener("message", handleResponse);

        sendMessage(user_did, {
            event: "PairwiseVerificationConfirmation",
            data,
        });
    });
}

async function connectDidComm(user_did, url) {
    console.log("Connecting to WebSocket:", url);
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("WebSocket connected for " + user_did);
            webSocketRef[user_did] = ws;
            resolve();
        };

        ws.onerror = (error) => {
            console.error("WebSocket error:", error);
            reject(new Error("WebSocket Error"));
        };

        ws.onclose = () => {
            console.log("WebSocket closed for" + user_did);
            reject(new Error("WebSocket closed"));
        };
    });
}

const sendMessage = (user_did, data) => {
    console.log("Sending message:", data);
    if (webSocketRef[user_did]?.readyState === WebSocket.OPEN) {
        webSocketRef[user_did].send(JSON.stringify(data));
    } else {
        console.error("WebSocket is not open" + user_did);
    }
};

function generatePairwiseConfirmationVc(
    { appId, newPublicKey },
    owner,
    sigKeypair
) {
    let encodedPublicKey;
    if (newPublicKey?.length == 64 && !newPublicKey?.startsWith("0x")) {
        const hexPublicKey = "0x" + newPublicKey;
        encodedPublicKey = hexPublicKey;
    } else if (newPublicKey?.length == 48) {
        const decodedAddress = u8aToHex(decodeAddress(newPublicKey));
        encodedPublicKey = decodedAddress;
    } else if (newPublicKey?.length == 66) {
        encodedPublicKey = newPublicKey;
    } else {
        throw new Error("PUBLIC_KEY_ERROR");
    }
    let encodedVCProperty, encodedData, hash;
    let vcProperty = {
        app_id: utils.encodeData(
            appId.padEnd(utils.APP_ID_BYTES, "\0"),
            "app_id_bytes"
        ),
        issuer_app_id: utils.encodeData(
            ISSUER_APP_ID.padEnd(utils.APP_ID_BYTES, "\0"),
            "app_id_bytes"
        ),
        new_public_key: utils.encodeData(encodedPublicKey, "PublicKey"),
    };
    encodedVCProperty = utils
        .encodeData(vcProperty, "AddPubKeyVCProperties")
        .padEnd(utils.VC_PROPERTY_BYTES * 2 + 2, "0");

    owner = did.sanitiseDid(owner);

    encodedData = utils.encodeData(
        {
            vc_property: encodedVCProperty,
            owner,
        },
        "ADD_KEY_VC_HEX"
    );
    hash = blake2AsHex(encodedData);

    const sign = utils.bytesToHex(sigKeypair.sign(hash));
    let vcObject = {
        hash,
        owner,
        signature: sign,
        vc_property: {
            app_id: appId,
            issuer_app_id: ISSUER_APP_ID,
            new_public_key: newPublicKey,
        },
    };
    return vcObject;
}

async function approvePairwise(user_did, request, mnemonics) {
    try {
        console.log("Approving request from:", request.value?.data?.app_id);
        const key_ring = await config.initKeyring();
        const key_pair = key_ring.addFromMnemonic(mnemonics);
        const owner = request.value?.owner;
        const app_id = request.value?.data?.app_id;
        const newPublicKey =
            request.value?.data?.peer_public_key?.startsWith("0x")
                ? request.value?.data?.peer_public_key?.slice(2)
                : request.value?.data?.peer_public_key;
        const pairwiseConfirmation = {
            confirmation: true,
            request_id: request.value?.request_id, // received in FetchDID Request cache KEY
            did_comm_id: request.value?.did_comm_id, // received in FetchDID Request cache KEY
            add_pub_key_vc: generatePairwiseConfirmationVc(
                {
                    newPublicKey: newPublicKey,
                    appId: app_id,
                },
                owner,
                key_pair
            ),
            peer_socket_id: Number(request.value?.peer_socket_id), // received in FetchDID Request cache KEY
            timestamp: Date.now(),
        };
        await sendPairwiseVerificationConfirmation(user_did, pairwiseConfirmation);
    } catch (err) {
        console.log(err);
    }
}

function eliminateDuplicateRequests(requests) {
    const uniqueRequestsMap = new Map();
    requests.sort((a, b) => {
        return (
            JSON.parse(b?.value)?.data?.timestamp -
            JSON.parse(a?.value)?.data?.timestamp
        );
    });
    requests.forEach((request) => {
        let parsedData = JSON.parse(request?.value);
        const uniqueKey = `${parsedData?.event}-${parsedData?.data?.app_id}`;
        if (!uniqueRequestsMap.has(uniqueKey)) {
            parsedData.owner = request?.key?.split("_")?.at(1);
            parsedData.request_id = request?.key?.split("_")?.at(-1);
            parsedData.did_comm_id = request?.key?.split("_")?.at(2);
            parsedData.peer_socket_id = request?.key?.split("_")?.at(3);
            uniqueRequestsMap.set(uniqueKey, { ...request, value: parsedData });
        }
    });
    // Convert the map back to an array and sort by value.timestamp in descending order
    const uniqueRequests = Array.from(uniqueRequestsMap.values());
    return uniqueRequests;
}

function closeWebSocket(user_did) {
    return new Promise((resolve) => {
        if (webSocketRef[user_did] && webSocketRef[user_did].readyState === WebSocket.OPEN) {
            webSocketRef[user_did].onclose = () => {
                console.log("WebSocket closed for " + user_did);
                resolve();
            };
            webSocketRef[user_did].close();
        } else {
            resolve();
        }
    });
}

async function handle_request(whitelistedDid) {
    try {
        const user_did = whitelistedDid.did;
        console.log('Processing DID:', user_did);
        const mnemonics = whitelistedDid.mnemonics;
        console.log('Processing Mnemonics First Word:', mnemonics.split(' ')[0]);
        let token = await login(whitelistedDid.did, whitelistedDid.mnemonics, whitelistedDid.app_id);

        const websocketUrl = DID_COMM_SERVER_URL + "/ws/connect/";
        await connectDidComm(user_did, websocketUrl);

        console.log(`Token for ${user_did}: ${token}`);
        let authResponse = await authenticate(user_did, token);
        console.log(`Auth response for ${user_did}: ${JSON.stringify(authResponse)}`);

        let pendingRequests = await fetchDIDCache(user_did);
        console.log("Pending requests:", pendingRequests);
        if (pendingRequests.length == 0) {
            console.log("No pending requests");
            return;
        }
        pendingRequests = eliminateDuplicateRequests(pendingRequests);
        console.log("Pending requests after elimination:", pendingRequests);
        let requests = pendingRequests.map(async (request) => {
            console.log("Request:", request);
            return approvePairwise(user_did, request, mnemonics);
        });
        await Promise.all(requests);
    } catch (err) {
        console.log("Handle Request Failed: ", err);
    }
}

async function handle_job() {
    console.time("pairwise_requests_handler");
    try {
        let whitelistedDids = await get_dids();
        let processing_requests = [];
        for (let i = 0; i < whitelistedDids.length; i++) {
            processing_requests.push(handle_request(whitelistedDids[i]));
        }
        await Promise.all(processing_requests);
    } catch (err) {
        console.log("Handle Job Failed: ", err);
    }
    await closeWebSocket();
    console.timeEnd("pairwise_requests_handler");
    setImmediate(() => {
        process.exit(0);
    });
}

handle_job();