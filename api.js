const Eth = require("web3-eth");
const config = require("./config");
const contracts = require("./contracts");
let eth;

function connect() {
    // eth = new Eth(Eth.givenProvider || config.local_http_provider);
    ethWs = new Eth(Eth.givenProvider || config.ws_infura);
}

function getBlock(block_num) {
    return new Promise((res, rej) => {
        ethWs.getBlock(block_num, true, ((err, result) => {
            if (err) {
                rej(err);
            } else {
                res(result);
            }
        }))
    })
}

function getContract(name) {
    if (!contracts[name]) return console.warn("The contract", name, "is not defined in your contracts file");
    return new ethWs.Contract(contracts[name].abi, contracts[name].address);
}

function sub(subscription, onData, onError) {
    ethWs.subscribe(subscription).on("data", onData).on("error", onError);
}

function clearSubs() {
    ethWs.clearSubscriptions();
}

module.exports = {
    connect,
    getBlock,
    sub,
    clearSubs,
    getContract
};
