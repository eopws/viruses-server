const PlayerService = require("@services/PlayerService")

class PlayerController {
    constructor(gameInstance, io) {
        this._service = new PlayerService(gameInstance, io)
    }

    onConnection(socket, data, callback) {
        this._service.onConnection(socket, data, callback)
    }
    
    onCreateGame(socket, data, callback) {
        this._service.onCreateGame(socket, data, callback)
    }

    onConnectToRoom(socket, data, callback) {
        this._service.onConnectToRoom(socket, data, callback)
    }

    onGetRooms(callback) {
        this._service.onGetRooms(callback)
    }

    onDisconnection(socket) {}
}

module.exports = PlayerController
