const uuid = require("uuid")
const GameRoomModel = require('./GameRoomModel.js')

class Viruses {
    _gameRooms = {
        //id: new GameRoomModel()
    }

    _players = {
        //id: roomId
    }

    _playersCount = 0

    connectPlayerToRoom(socket, playerData, gameRoomId) {
        const isConnected = this._gameRooms[gameRoomId].connectPlayer(socket, {
            nickname: playerData.nickname,
            virusIcon: playerData.playersVirus,
            avatar: playerData.playersAvatar,
            color: playerData.color,
            money: 0,
            units: [],
        })

        if (isConnected) {
            this._players[socket.id] = gameRoomId
        }

        return isConnected
    }

    startGame(socket, roomId) {
        const gameStarted = this._gameRooms[roomId]?.startGame(socket.id)

        return gameStarted
    }

    incrementPlayersCount() {
        this._playersCount++
    }

    increasePlayerMoney(playerId, roomId, count) {
        this._gameRooms[roomId]?.increasePlayerMoney(playerId, count)
    }

    createGameRoom(gameRoomData) {
        // generate new room id, then players can connect to it
        const newGameRoomId = uuid.v4()

        this._gameRooms[newGameRoomId] = new GameRoomModel(newGameRoomId, gameRoomData)

        return newGameRoomId
    }

    setNextPlayerTurn(roomId) {
        return this._gameRooms[roomId]?.setNextPlayerTurn()
    }

    isGameStarted(roomId) {
        return this._gameRooms[roomId]?.getGameStarted()
    }

    getPlayersInRoom(roomId) {
        return this._gameRooms[roomId]?.getPlayersInRoom()
    }

    getPlayerUnits(playerId, roomId) {
        return this._gameRooms[roomId]?.getPlayerUnits(playerId)
    }

    getGameRoomInfo(roomId) {
        return this._gameRooms[roomId]?.getGameRoomInfo()
    }

    getPlayerRoomId(playerId) {
        return this._players[playerId]
    }

    getField(roomId) {
        return this._gameRooms[roomId]?.getField()
    }

    getFieldSize(roomId) {
        return this._gameRooms[roomId]?.getFieldSize()
    }

    getPlayerTurn(roomId) {
        return this._gameRooms[roomId]?.getPlayerTurn()
    }

    getGameStartTime(roomId) {
        return this._gameRooms[roomId]?.getStartTime()
    }

    getPlayerMoney(playerId, roomId) {
        return this._gameRooms[roomId]?.getPlayerMoney(playerId)
    }

    getRoomsIds() {
        return Object.keys(this._gameRooms)
    }

    updatePlayerStats(playerId, roomId, key, value, valueRelative = true) {
        return this._gameRooms[roomId]?.updatePlayerStats(playerId, key, value, valueRelative)
    }

    shopTransaction(playerId, roomId, unitId) {
        return this._gameRooms[roomId]?.shopTransaction(playerId, unitId)
    }

    disablePlayer(playerId, roomId) {
        return this._gameRooms[roomId]?.disablePlayer(playerId)
    }

    getRoomStats(roomId) {
        return this._gameRooms[roomId]?.getRoomStats(roomId)
    }

    deletePlayer(playerId) {
        this._gameRooms[this._players[playerId]]?.deletePlayer(playerId)

        delete this._players[playerId]
        this._playersCount--
    }

    endGame(roomId) {
        delete this._gameRooms[roomId]

        for (const playerId in this._players) {
            if (this._players[playerId] === roomId) {
                delete this._players[playerId]
            }
        }
    }
}

module.exports = Viruses
