const teams = {
    "0": "Whale",
    "1": "Bear",
    "2": "Snek",
    "3": "Bull"
}

const distributions = {
    "0": {
        "winner": 0.48,
        "next_round": 0.25,
        "holders": 0.15,
        "p3d": 0.1
    },
    "1": {
        "winner": 0.48,
        "next_round": 0.25,
        "holders": 0.25,
        "p3d": 0
    },
    "2": {
        "winner": 0.48,
        "next_round": 0.1,
        "holders": 0.2,
        "p3d": 0.2
    },
    "3": {
        "winner": 0.48,
        "next_round": 0.1,
        "holders": 0.3,
        "p3d": 0.1
    }
}

module.exports = {
    teams,
    distributions
}
