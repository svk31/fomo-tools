const api = require("./api");
const moment = require("moment");
const contracts = require("./contracts");
const {getTimeDifference,
    parseCurrentRound,
    getRoundInfo,
    parsePlayer,
    getPlayer,
    getPlayerId,
    fromWei
} = require("./utils");
const config = require("./config");

async function monitorGame(name) {
    console.log("\n*******************************************")
    console.log("\n    Monitoring", contracts[name].name);
    console.log("\n*******************************************\n")

    api.connect();

    let contract = api.getContract(name);
    // console.log("contract", Object.keys(contract.methods));

    let previousTime, previousBlock, currentRoundInfo;
    function printInfo(parsedRound, force) {
        if (!parsedRound && !force) return;
        let now = moment();
        let duration = getTimeDifference(parsedRound.start, now);
        let remaining = getTimeDifference(now, parsedRound.end);

        if (remaining.deltaSeconds !== previousTime) {
            let blockDelta = !!previousBlock ? getTimeDifference(previousBlock.time, now) : null;
            console.log(
                "#" + parsedRound.roundNumber,
                "| Duration:", (duration.days ? duration.days + "days " : "") + duration.hours + "h", duration.minutes, (duration.seconds < 10 ? " " : "") + duration.seconds.toFixed(1) + "s",
                "| Pot:", parsedRound.pot + " ETH",
                "| Counter:", (remaining.hours ? remaining.hours + "h " : "") + remaining.minutes, (remaining.seconds < 10 ? " " : "") + remaining.seconds.toFixed(1) + "s",
                "| Last block", !!blockDelta ? (blockDelta.minutes) : null, !!blockDelta ? ((blockDelta.seconds < 10 ? " " : "") + blockDelta.seconds.toFixed(1) + "s") : null,
                "| Team:", parsedRound.team,
                "| Current winner:", parsedRound.playerName || parsedRound.playerAddress
            )
            previousTime = remaining.deltaSeconds;
        }

        /* Speed up the print intervals when the remaining time is below 1 minute */
        if (remaining.deltaSeconds < (name === "short" ? 30 : 300)) {
            poll(1000);
        } else if (remaining.deltaSeconds < (name === "short" ? 60 : 600)) {
            poll(2000);
        } else {
            poll();
        }
    }

    async function getLatestBlock() {
        let block = await api.getBlock("latest");
        let b = {
            time: moment(parseInt(block.timestamp, 10) * 1000),
            number: block.number,
            received: moment()
        }
        if (!previousBlock || previousBlock && previousBlock.number < b.number) {
            if (previousBlock) console.log("Manually polled a new block we weren't notified about, the subscription probably failed to register. Try restarting the script"); // this shouldn't happen but regularly does...
            previousBlock = b;
            getRoundInfo(contract).then(updateRound)
        }
    }

    async function updateRound(r, print = true) {
        let pid = await getPlayerId(contract, r.playerAddress);
        let player = parsePlayer(await getPlayer(contract, pid));
        r.playerName = player.name;
        r.playerAddress = player.address;
        if (currentRoundInfo && r.roundNumber !== currentRoundInfo.roundNumber) {
            console.log("\n\n*******************************************")
            console.log("\n\n    New Round Starting Now");
            console.log("\n\n*******************************************\n\n")
        }
        currentRoundInfo = r;
        printInfo(r, print);
    }

    /* Manually poll for the latest block every 5s */
    setInterval(getLatestBlock, config.blockPollFrequency);
    await getLatestBlock();

    /* Spit out info every x seconds */
    let interval;
    function poll(timer = 10000) {
        clearInterval(interval);
        interval = setInterval(() => {
            printInfo(currentRoundInfo);
        }, timer);
    }
    poll();



    contract.events.allEvents()
    .on("data", async (e) => {
        switch(e.event) {
            case "onEndTx":
                let pid = await getPlayerId(contract, e.returnValues.playerAddress);
                let player = parsePlayer(await getPlayer(contract, pid));
                let keysBought = parseFloat(fromWei(e.returnValues.keysBought));
                let ethIn = parseFloat(fromWei(e.returnValues.ethIn));
                // console.log("keysBought:", keysBought, "ethIn", ethIn, "currentRoundInfo", currentRoundInfo);
                let timeAdded = parseInt(keysBought) * 30;
                if (parseInt(keysBought, 10) === 0) {
                    // micro key
                    console.log(`-${(currentRoundInfo.roundNumber).replace(/./,"-")}-- Micro key | ${ethIn.toFixed(4)} ETH | ${keysBought.toFixed(3)} keys | +${parseInt(keysBought, 10) * 30}s | ${player.name || player.address}`);
                } else {
                    console.log(`+${(currentRoundInfo.roundNumber).replace(/./,"+")}++  Full key | ${ethIn.toFixed(4)} ETH | ${keysBought.toFixed(3)} keys | +${parseInt(keysBought, 10) * 30}s | ${player.name || player.address}`);
                }
                break;

            default:
                break;
        }
        getRoundInfo(contract).then(r => updateRound(r, false)).catch(err => {});
    }).on("error", (error) => {
        console.log("onEndTx error:", error);
    });

    function onData(data) {
        let blockTime = moment(parseInt(data.timestamp, 10) * 1000);
        let now = moment();
        // console.log("*** New block:", data.number, blockTime, "Received", ((now.valueOf() - blockTime.valueOf()) / 1000).toFixed(2) + "s after block timestamp ***");
        let b = {
            time: blockTime,
            number: data.number,
            received: moment()
        }
        if (!previousBlock || previousBlock && previousBlock.number < b.number) {
            previousBlock = b;
        } else {
            // console.log("Notified of a new block which is older than or the same as the current head block", b, "\n", previousBlock);  // this shouldn't happen but regularly does...
        }
        getRoundInfo(contract).then(updateRound).catch(err => {});
    }

    function onError(err) {
        console.log("onError:", err);
    }
    api.sub("newBlockHeaders", onData, onError);
}
module.exports = monitorGame;
