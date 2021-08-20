const gameUnitsObject = require("@root/src/game-units.json")

class GameRoomModel {
    _players = {
        /*id: {
            nickname: 'xareyli',
            avatar: 'afgdsgt0ww304-235.png',
        }, 
        id: {

        },
        id: {

        }*/
    };

    _playersPrivateData = {};

    _gameStarted = false;

    /*_fieldViruses = {
        '0': {
            '0': {
                belongsTo: 4325354,
                destroyed: false,
                virus: 'tesla:wing',
            },
            '1': {
                belongsTo: -1,
                destroyed: false,
                virus: 'none',
            },
            '2': {
                belongsTo: 4325354,
                destroyed: false,
                virus: 'tesla:wing',
            }
        },

        '1': {
            '0': {
                belongsTo: -1,
                destroyed: false,
                virus: 'none',
            },
            '1': {
                belongsTo: 4325354,
                destroyed: false,
                virus: 'tesla:heart',
            },
            '2': {
                belongsTo: -1,
                destroyed: false,
                virus: 'none',
            }
        },

        '2': {
            '0': {
                belongsTo: 4325354,
                destroyed: false,
                virus: 'tesla:wing',
            },
            '1': {
                belongsTo: -1,
                destroyed: false,
                virus: 'none',
            },
            '2': {
                belongsTo: 4325354,
                destroyed: false,
                virus: 'tesla:wing',
            }
        }
    };
*/

    constructor(gameRoomId, gameRoomData) {
        this._roomId      = gameRoomId
        this._fieldSizeW  = gameRoomData.fieldW
        this._fieldSizeH  = gameRoomData.fieldH
        this._maxPlayers  = gameRoomData.playersCount
        this._roomName    = gameRoomData.name
        this._gameStarted = false

        this._stats = {}
    }

    connectPlayer(socket, playerData) {
        const isRoomFull = Object.keys(this._players).length === this._maxPlayers

        if (!isRoomFull) {
            // if the player is the first player than he is a master
            let isPlayerMaster = Object.keys(this._players).length === 0

            this._players[socket.id] = {
                nickname: playerData.nickname,
                playersVirus: playerData.virusIcon,
                avatar: playerData.avatar,
                master: isPlayerMaster,
                color: playerData.color,
                disabled: false,
            }

            this._playersPrivateData[socket.id] = {
                nickname: playerData.nickname,
                avatar: playerData.avatar,
                units: {},
                money: 300,
            }

            this._stats[socket.id] = {
                stdVirusesBuilt: 0,
                wallsBuilt: 0,
                hardWallsBuilt: 0,
                teslasBuilt: 0,
                catapultsBuilt: 0,
                cellsDestroyed: 0,
                killedByPlayer: 0,
                playersUnitsKilled: 0,
            }
        }

        return !isRoomFull
    }

    startGame(initiatorId) {
        const masterId = Object.keys(this._players).find((playerId) => this._players[playerId].master)

        // only game's master can start game
        /* if (masterId !== initiatorId) {
            return false
        }*/

        if (Object.keys(this._players).length === this._maxPlayers) {
            this._gameStarted = true
            this.initField()

            this._playerTurn = {
                player: initiatorId,
                moves: 0,
            }
        }

        this._startTime = new Date

        return this._gameStarted
    }

    getGameStarted() {
        return this._gameStarted
    }

    initField() {
        this._fieldViruses = {}

        const maxRow = Math.floor(this._fieldSizeH / 20)
        const maxCol = Math.floor(this._fieldSizeW / 20)

        for (let row = 0; row < maxRow; row++) {
            this._fieldViruses[row] = {}

            for (let col = 0; col < maxCol; col++) {
                this._fieldViruses[row][col] = {
                    belongsTo: -1,
                    destroyed: false,
                    virus: 'empty',
                }
            }
        }

        const playersIds = Object.keys(this._players)

        const rows = [0, maxRow - 1]
        const cols = [maxCol - 1, 0]

        let player = 0

        setPlayersToCorners:
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 2; j++) {
                if (!playersIds[player]) {
                    break setPlayersToCorners
                }

                this._fieldViruses[rows[j]][cols[i]] = {
                    belongsTo: playersIds[player],
                    destroyed: false,
                    virus: 'std',
                }

                player++
            }
        }
    }

    setNextPlayerTurn() {
        const playerIds = Object.keys(this._players)

        const currentPlayerIndex = playerIds.indexOf(this._playerTurn.player)

        let nextPlayerId = null

        for (let i = currentPlayerIndex + 1, j = 0; j < playerIds.length; i++, j++) {
            if (!playerIds[i]) {
                i = 0
            }

            if (!this._players[playerIds[i]].disabled) {
                nextPlayerId = playerIds[i]
                break
            }
        }

        this._playerTurn = {
            player: nextPlayerId,
            moves: 0,
        }
    }

    getField() {
        return this._fieldViruses
    }

    getFieldSize() {
        return {
            width: this._fieldSizeW,
            height: this._fieldSizeH,
        }
    }

    getStartTime() {
        return this._startTime
    }

    getPlayerUnits(playerId) {
        return this._playersPrivateData[playerId].units
    }

    getPlayerTurn() {
        return this._playerTurn
    }

    getPlayersInRoom() {
        return this._players
    }

    getPlayerMoney(playerId) {
        return  this._playersPrivateData[playerId].money
    }

    getGameRoomInfo() {
        const masterId = Object.keys(this._players).find((playerId) => this._players[playerId].master)

        return {
            name: this._roomName,
            fieldW: this._fieldSizeW,
            fieldH: this._fieldSizeH,
            roomId: this._roomId,
            maxPlayers: this._maxPlayers,
            connectedPlayers: this._players,
            master: this._players[masterId]
        }
    }

    getRoomStats() {
        return this._stats
    }

    updatePlayerStats(playerId, key, value, valueRelative = true) {
        if (key in this._stats[playerId]) {
            if (valueRelative) {
                this._stats[playerId][key] += value
            } else {
                this._stats[playerId][key] = value
            }
        }
    }

    increasePlayerMoney(playerId, count) {
        this._playersPrivateData[playerId].money += count
    }

    shopTransaction(playerId, unitId) {
        if (!gameUnitsObject[unitId]) {
            return false
        }

        if (this._playersPrivateData[playerId].money >= gameUnitsObject[unitId].price) {
            if (!this._playersPrivateData[playerId].units[unitId]) {
                this._playersPrivateData[playerId].units[unitId] = 1
            } else {
                this._playersPrivateData[playerId].units[unitId]++
            }

            this._playersPrivateData[playerId].money -= gameUnitsObject[unitId].price

            return true
        }

        return false
    }

    disablePlayer(playerId) {
        this._players[playerId].disabled = true

        if (this._playerTurn.player === playerId) {
            this.setNextPlayerTurn()
        }
    }

    deletePlayer(playerId) {
        delete this._players[playerId]
        delete this._playersPrivateData[playerId]
        delete this._stats[playerId]
    }
}

module.exports = GameRoomModel
