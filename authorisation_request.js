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
    baseURL: AUTH_SERVER_URL,
    timeout: 10000,
});

let webSocketRef = {};
const WEBSOCKET_TIMEOUT = 5000;

async function get_dids() {
    return WHITELISTED_DIDS;
}

async function verify_token(token) {
    return new Promise((resolve, reject) => {
        axiosInstance.post("/v1/api/token/verify/", {
            token,
        }).then((response) => {
            if (response?.data?.data?.is_verified === true) {
                resolve(response.data);
            } else {
                reject(new Error("Token verification failed"));
            }
        }).catch((err) => {
            reject(err);
        });
    });
}

async function login(user_did, mnemonics, domain_id = "metamui") {
    let keyring = await config.initKeyring();
    let keypair = await keyring.addFromUri(mnemonics);
    const trustRequest = {
        domain_id,
        my_did: did.sanitiseDid(user_did),
        my_public_key: u8aToHex(keypair.publicKey),
        pair_did: "0x6469643a737369643a6d6574616d75695f6261636b656e640000000000000000",
        timestamp: `${Math.floor(Date.now() / 1000)}`,
    };
    const newHash = "0x" + sha256(JSON.stringify(trustRequest));
    const newSignature = utils.bytesToHex(keypair.sign(newHash));
    const {
        data: { data },
    } = await axiosInstance.post("/v2/api/trust", {
        ...trustRequest,
        hash: newHash,
        signature: newSignature,
    });

    const signinTimestamp = `${Math.floor(Date.now() / 1000)}`;
    const signinRequest = {
        domain_id,
        public_key: u8aToHex(keypair.publicKey),
        server_vc: data,
        timestamp: signinTimestamp,
    };

    const signinHash = "0x" + sha256(JSON.stringify(signinRequest));
    const signinSignature = utils.bytesToHex(keypair.sign(signinHash));
    const {
        data: { data: loginData },
    } = await axiosInstance.post("/v2/api/login", {
        ...signinRequest,
        hash: signinHash,
        signature: signinSignature,
    });
    return loginData?.token;
}

const authenticate = (user_did, token) => {
    return new Promise((resolve, reject) => {
        console.time("authenticate-" + user_did);
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
                console.timeEnd("authenticate-" + user_did);
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
        console.time("fetch-requests-" + user_did);
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
                console.timeEnd("fetch-requests-" + user_did);
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

const sendRequestConfirmation = (user_did, data, mnemonics) => {
    return new Promise(async (resolve, reject) => {
        console.time("request-confirmation-" + user_did);
        if (!webSocketRef[user_did] || webSocketRef[user_did].readyState !== WebSocket.OPEN) {
            return reject(new Error("WebSocket is not open" + user_did));
        }

        const timeout = setTimeout(() => {
            webSocketRef[user_did].removeEventListener("message", handleResponse);
            reject(new Error("Request Confirmation timed out"));
        }, WEBSOCKET_TIMEOUT);

        const handleResponse = (event) => {
            const message = JSON.parse(event.data);
            console.log("Received message:", message);
            if (message.event === "RequestSignConfirmationAck") {
                clearTimeout(timeout);
                console.timeEnd("request-confirmation-" + user_did);
                webSocketRef[user_did].removeEventListener("message", handleResponse);
                resolve(message.data);
            }
        };

        webSocketRef[user_did].addEventListener("message", handleResponse);
        sendMessage(user_did, {
            event: "RequestSignConfirmation",
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


async function approve(user_did, request, mnemonics, token) {
    try {
        console.log("Approving request from:", request.value?.data?.app_id);

        const key_ring = await config.initKeyring();
        const key_pair = key_ring.addFromMnemonic(mnemonics);
        let dataToHash = request.value?.data?.hash;
        let hash = "0x" + sha256(dataToHash);
        console.log('hash:', hash);
        const signature = utils.bytesToHex(key_pair.sign(hash));

        const requestData = {
            app_name: request.value?.data?.app_name,
            confirmation: true,
            did: request.value?.data?.did,
            did_comm_id: request.value?.did_comm_id,  // received in FetchDID Request cache KEY
            hash,
            peer_socket_id: +(request.value?.peer_socket_id),  // received in FetchDID Request cache KEY
            reason: request.value?.data?.reason,
            request_id: request.value?.request_id, // received in FetchDID Request cache KEY
            signature,
        };
        await sendRequestConfirmation(user_did, requestData, mnemonics);
    } catch (err) {
        console.log(err);
    }
}

function eliminateDuplicateRequests(requests) {
    const uniqueRequestsMap = new Map();

    // Sort requests in descending order based on timestamp
    requests.sort((a, b) => 
        JSON.parse(b?.value)?.data?.timestamp - JSON.parse(a?.value)?.data?.timestamp
    );

    requests.forEach((request) => {
        if (!request?.value || !request?.key) return; // Skip invalid entries

        let parsedData = JSON.parse(request.value);
        const uniqueKey = `${parsedData?.event}-${parsedData?.data?.app_id}`;

        // If this uniqueKey is not in the map, add it (since requests are sorted, first occurrence is the latest one)
        if (!uniqueRequestsMap.has(uniqueKey)) {
            const parts = request.key.split("_");  // Split once for efficiency
            parsedData.owner = parts.length > 1 ? parts[1] : null;
            parsedData.did_comm_id = parts.length > 2 ? parts[2] : null;
            parsedData.peer_socket_id = parts.length > 3 ? parts[3] : null;
            parsedData.request_id = parts.length > 0 ? parts.slice(-1)[0] : null;

            uniqueRequestsMap.set(uniqueKey, { ...request, value: parsedData });
        }
    });

    // Convert the map back to an array and return sorted by timestamp
    return Array.from(uniqueRequestsMap.values());
}


function filterRequests(requests) {
    return requests.filter(request => request?.value?.event === "RequestSign");
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
    const user_did = whitelistedDid.did;
    try {
        console.log('Processing DID:', user_did);
        const mnemonics = whitelistedDid.mnemonics;
        console.log('Processing Mnemonics First Word:', mnemonics.split(' ')[0]);
        let token = whitelistedDid.token;
        try {
            if (!token) {
                throw new Error("Token not found");
            }
            await verify_token(whitelistedDid.token);
        } catch (error) {
            token = await login(whitelistedDid.did, whitelistedDid.mnemonics, whitelistedDid.domain_id);
            console.log('Error:', error);
        }

        const websocketUrl = DID_COMM_SERVER_URL + "/ws/connect/";
        await connectDidComm(user_did, websocketUrl);

        console.log(`Token for ${user_did}: ${token}`);
        let authResponse = await authenticate(user_did, token);
        console.log(`Auth response for ${user_did}: ${JSON.stringify(authResponse)}`);

        let pendingRequests = await fetchDIDCache(user_did);
        console.log("Pending requests:", pendingRequests);
        if (pendingRequests.length == 0) {
            console.log("No pending requests");
            await closeWebSocket(user_did);
            return;
        }
        pendingRequests = eliminateDuplicateRequests(pendingRequests);
        pendingRequests = filterRequests(pendingRequests);
        console.log("Pending requests after elimination:", pendingRequests);
        let requests = pendingRequests.map(async (request) => {
            console.log("Request:", request);
            return approve(user_did, request, mnemonics, token);
        });
        await Promise.all(requests);
        await closeWebSocket(user_did);
    } catch (err) {
        console.log("Handle Request Failed: ", err);
        await closeWebSocket(user_did);
    }
}

async function handle_job() {
    console.time("weblogin_requests_handler");
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
    console.timeEnd("weblogin_requests_handler");
    setImmediate(() => {
        process.exit(0);
    });
}

handle_job();


function flattenJson(json) {
    let map = new Map();

    function flatten(obj) {
        if (typeof obj === 'object' && !Array.isArray(obj) && obj !== null) {
            for (const [key, value] of Object.entries(obj)) {
                if (typeof value === 'object' && !Array.isArray(value) && value !== null) {
                    // If value is an object, recursively flatten it
                    flatten(value);
                } else if (Array.isArray(value)) {
                    // If value is an array, concatenate its elements into a single string
                    const concatenatedArray = value.map((item) => String(item)).join('');
                    map.set(key, concatenatedArray);
                } else {
                    // If it's a primitive value, add it to the map
                    map.set(key, String(value));
                }
            }
        }
    }

    flatten(json);

    // Sort the map entries by key
    return new Map([...map.entries()].sort((a, b) => a[0].localeCompare(b[0])));
}

function generateHashFromJson(json) {
    const sortedMap = flattenJson(json);
    console.log('sortedMap', sortedMap);

    const sortedValues = [...sortedMap.values()];
    console.log('sortedValues', sortedValues);

    const inputForHash = sortedValues.join('');
    console.log('inputForHash', inputForHash);

    const hash = '0x' + sha256(inputForHash);
    return hash;
}
