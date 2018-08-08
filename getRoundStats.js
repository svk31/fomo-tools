const api = require("./api");
const moment = require("moment");
const utils = require("./utils");
const fs = require('fs');
const contracts = require("./contracts");

async function getRoundStats(name) {
    console.log("\n\n******************************************************")
    console.log("\n  Producing statistics for", contracts[name].name);
    console.log("\n******************************************************")
    let rounds = [];
    api.connect();

    let contract = api.getContract(name);
    let currentRound = utils.parseCurrentRound(await contract.methods.getCurrentRoundInfo().call());

    let totalPot = 0;
    let totalDuration = 0;
    for (var i = 1; i < currentRound.roundNumber; i++) {
        let round = utils.parseRound_(await contract.methods.round_(i).call(), i);
        let player = utils.parsePlayer(await utils.getPlayer(contract, round.playerAddress));
        round.playerAddress = player.address;
        round.playerName = player.name;

        totalDuration += round.duration.deltaSeconds / 60;
        totalPot += parseFloat(round.pot);

        round.averagePot = totalPot / i;
        round.averageDuration = totalDuration / i;
        rounds.push(round);
    }

    /* Should probably close the connection here once you find a way to do so.... */

    if (!rounds.length) {
        console.log("\nFirst round still running, here's the current status:\n");
        console.log(currentRound);
    }

    if (rounds.length)
        fs.open(`stats/roundStats_${name}.csv`, 'w', (err, fd) => {
                    if (err) throw err;
                    let contents = "Round,Start,End, Duration (minutes), ICO, Key Count, Pot (ETH), Team, Player, Average Duration, Average Pot, P3D Payout\n";

                    rounds.forEach(round => {
                        let line = [
                            round.roundNumber,
                            round.start,
                            round.end,
                            (round.duration.deltaSeconds / 60).toFixed(2),
                            round.ico,
                            round.keyCount,
                            round.pot,
                            round.team,
                            round.playerName,
                            round.playerAddress,
                            round.averageDuration.toFixed(2),
                            round.averagePot.toFixed(2),
                            round.p3d                            
                        ]
                        contents += line.join(',') + "\n";
                    });
                    fs.write(fd, contents, () => {
                        console.log(`\nWrote stats to roundStats_${name}.csv!\n`);
                    });
                });

};

module.exports = getRoundStats;
