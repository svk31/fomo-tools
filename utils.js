const moment = require("moment");
const utils = require("web3-utils");
const {teams} = require("./constants");

function parseCurrentRound(round) {
    let end =  moment(parseInt(round[3], 10) * 1000);
    let start = moment(parseInt(round[4], 10) * 1000);
    return {
        ico: parseFloat(utils.fromWei(round[0])).toFixed(4),
        roundNumber: round[1],
        keyCount: parseFloat(utils.fromWei(round[2])).toFixed(2),
        end,
        start,
        pot: parseFloat(utils.fromWei(round[5])).toFixed(4),
        team: teams[round[6][0]],
        playerAddress: round[7],
        duration: getTimeDifference(start, end)
    }
}

let playerCache = {};
function getPlayer(contract, pid) {
    if (playerCache[pid]) return Promise.resolve(playerCache[pid]);
    return contract.methods.plyr_(pid).call().then(player => {
        playerCache[pid] = player;
        return player;
    })
}

let pidCache = {};
function getPlayerId(contract, address) {
    if (pidCache[address]) return Promise.resolve(pidCache[address]);
    return contract.methods.pIDxAddr_(address).call().then(pid => {
        pidCache[address] = pid;
        return pid;
    });
}

function parsePlayer(player) {
    return {
        address: player["0"],
        name: utils.hexToAscii(player["1"]).replace(/\u0000/g, "")
    }
}

/*
plyr   uint256 :  19143     : 0
team   uint256 :  2         : 1
end   uint256 :  1532751525 : 2
ended   bool :  true        : 3
strt   uint256 :  1532739545 : 4
keys   uint256 :  17464940369818744355168 : 5
eth   uint256 :  15252080353084715879348  : 6
pot   uint256 :  3416879990985622774372   : 7
mask   uint256 :  770602620728566030      : 8
ico   uint256 :  3061516006070000000000   : 9
icoGen   uint256 :  1633717663399200000000 : 10
icoAvg   uint256 :  391274026744476388    : 11
*/
function parseRound_(round, number) {
    let end = moment(parseInt(round[2], 10) * 1000);
    let start = moment(parseInt(round[4], 10) * 1000)
    return {
        ico: parseFloat(utils.fromWei(round[9])).toFixed(4),
        roundNumber: number,
        keyCount: parseFloat(utils.fromWei(round[5])).toFixed(2),
        end,
        start,
        pot: parseFloat(utils.fromWei(round[7])).toFixed(4),
        team: teams[round[1]],
        playerAddress: round[0],
        duration: getTimeDifference(start, end)
    }
}

function getTimeDifference(t1, t2) {
    let deltaSeconds = (t2.valueOf() - t1.valueOf()) / 1000;
    let days = deltaSeconds / (60 * 60 * 24);
    let hours = (days % 1) * 24;
    let minutes = (hours % 1) * 60;
    let seconds = (minutes % 1) * 60;
    return {
        deltaSeconds,
        days: Math.floor(days),
        hours: Math.floor(hours) + "h",
        minutes: Math.floor(minutes) + "min",
        seconds: seconds.toFixed(1) + "s"
    }
}

let gettingRoundInfo = false;
function getRoundInfo(contract) {
    if (gettingRoundInfo) return Promise.reject();
    gettingRoundInfo = true;

    return contract.methods.getCurrentRoundInfo().call().then(newRoundData => {
        gettingRoundInfo = false;
        return parseCurrentRound(newRoundData)
    });
}

module.exports = {
    parseCurrentRound,
    parseRound_,
    getTimeDifference,
    getPlayer,
    parsePlayer,
    getRoundInfo,
    getPlayerId
};
