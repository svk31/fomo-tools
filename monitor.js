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

async function monitorGame(name) {
    console.log("\n*******************************************")
    console.log("\n    Monitoring", contracts[name].name);
    console.log("\n*******************************************\n")

    let _round = 0;
    api.connect();

    let contract = api.getContract(name);
    // console.log("contract", Object.keys(contract.methods));

    let previousTime, previousBlockTime, currentRoundInfo;
    function printInfo(parsedRound, force) {
        if (!parsedRound && !force) return;
        let now = moment();
        let duration = getTimeDifference(parsedRound.start, now);
        let remaining = getTimeDifference(now, parsedRound.end);

        if (remaining.deltaSeconds !== previousTime) {
            let blockDelta = !!previousBlockTime ? getTimeDifference(previousBlockTime, now) : null;
            console.log(
                "#" + parsedRound.roundNumber,
                "| Round duration:", duration.days ? duration.days + "days" : "", duration.hours, duration.minutes, duration.seconds,
                "| Pot value:", parsedRound.pot + " ETH",
                "| Counter:", remaining.minutes, remaining.seconds,
                "| Time since last block", !!blockDelta ? (blockDelta.minutes) : null, !!blockDelta ? blockDelta.seconds : null,
                "| Current winner:", parsedRound.playerName || parsedRound.playerAddress
            )
            previousTime = remaining.deltaSeconds;
        }

        /* Speed up the print intervals when the remaining time is below 1 minute */
        if (remaining.deltaSeconds < 30) {
            poll(1000);
        } else if (remaining.deltaSeconds < 60) {
            poll(5000);
        } else {
            poll();
        }
    }

    getRoundInfo(contract).then(updateRound);

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
    api.sub("newBlockHeaders", (err, data) => {
        if (err) return;
        let blockTime = moment(parseInt(data.timestamp, 10) * 1000);
        let now = moment();
        // console.log("*** New block:", data.number, blockTime, "Received", ((now.valueOf() - blockTime.valueOf()) / 1000).toFixed(2) + "s after block timestamp ***");
        getRoundInfo(contract).then((r) => {
            previousBlockTime = blockTime;
            updateRound(r);
        }).catch(err => {});
    })
}
module.exports = monitorGame;
