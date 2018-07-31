const monitorGame = require("./monitor");
const getRoundStats = require("./getRoundStats");

const type = process.argv[2];
const contract = process.argv[3] || "quick";

if (type === "stats") {
    getRoundStats(contract);
} else if (type === "monitor") {
    monitorGame(contract);
}
