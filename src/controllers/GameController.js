const GameService = require("@services/GameService")

class GameController {
    constructor(gameInstance, io) {
        this._service = new GameService(gameInstance, io)
    }
    
    onGameStart(socket, callback) {
        this._service.onGameStart(socket, callback)
    }

    onStep(socket, data) {
        this._service.onStep(socket, data)
    }

    onPlayerStopsPlaying(socket, data) {
        this._service.onPlayerStopsPlaying(socket, data)
    }

    onGetCellActions(socket, data, callback) {
        this._service.onGetCellActions(socket, data, callback)
    }

    onGetGameAmbience(socket, callback) {
        this._service.onGetGameAmbience(socket, callback)
    }

    onGetShopProducts(socket, callback) {
        this._service.onGetShopProducts(socket, callback)
    }

    onShopTransaction(socket, data, callback) {
        this._service.onShopTransaction(socket, data, callback)
    }
}

module.exports = GameController
