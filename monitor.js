const api = require("./api");
const moment = require("moment");
const contracts = require("./contracts");
const {getTimeDifference,
    parseCurrentRound,
    getRoundInfo,
    parsePlayer,
    getPlayer,
    getPlayerId
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
                "| Round duration:", (duration.days ? duration.days + "days " : "") + duration.hours + "h", duration.minutes, (duration.seconds < 10 ? " " : "") + duration.seconds.toFixed(1) + "s",
                "| Pot value:", parsedRound.pot + " ETH",
                "| Counter:", (remaining.hours ? remaining.hours + "h " : "") + remaining.minutes, (remaining.seconds < 10 ? " " : "") + remaining.seconds.toFixed(1) + "s",
                "| Time since last block", !!blockDelta ? (blockDelta.minutes) : null, !!blockDelta ? ((blockDelta.seconds < 10 ? " " : "") + blockDelta.seconds.toFixed(1) + "s") : null,
                "| Current winner:", parsedRound.playerName || parsedRound.playerAddress
            )
            previousTime = remaining.deltaSeconds;
        }

        /* Speed up the print intervals when the remaining time is below 1 minute */
        if (remaining.deltaSeconds < 30) {
            poll(1000);
        } else if (remaining.deltaSeconds < 60) {
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
        if (currentRoundInfo && r.round !== currentRoundInfo.round) {
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
    .on("data", (event) => {
        // console.log("onEndTx event: \n", event);
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
