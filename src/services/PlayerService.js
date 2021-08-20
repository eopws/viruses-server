class PlayerService {
    constructor(gameInstance, io) {
        this._game = gameInstance
        this._io   = io
    }

    onConnection() {
        this._game.incrementPlayersCount()
    }

    onCreateGame(socket, gameDetails, callback) {
        const { playerData, gameRoomData } = gameDetails

        const newRoomId = this._game.createGameRoom(gameRoomData)

        // if room has been created successfully
        if (newRoomId) {
            socket.join(newRoomId)
            this._game.connectPlayerToRoom(socket, playerData, newRoomId)

            socket.to(newRoomId).emit(
                'game:playerConnectedToRoom',
                {
                    id: socket.id,
                    object: this._game.getPlayersInRoom(newRoomId)[socket.id]
                }
            )

            callback(Object.assign(this._game.getGameRoomInfo(newRoomId), {myId: socket.id}))
        } else {
            callback(false)
        }
    }

    onConnectToRoom(socket, roomDetails, callback) {
        const { playerData, roomId } = roomDetails

        const connected = this._game.connectPlayerToRoom(socket, playerData, roomId)

        if (connected) {
            socket.join(roomId)
            socket.to(roomId).emit(
                'game:playerConnectedToRoom',
                {
                    id: socket.id,
                    object: this._game.getPlayersInRoom(roomId)[socket.id]
                }
            )

            callback(Object.assign(this._game.getGameRoomInfo(roomId), {myId: socket.id}))
        } else {
            callback(false)
        }
    }

    onGetRooms(callback) {
        const gameRooms = {}

        for (const gameRoomId of this._game.getRoomsIds()) {
            gameRooms[gameRoomId] = this._game.getGameRoomInfo(gameRoomId)
        }

        callback(gameRooms)
    }
}

module.exports = PlayerService
