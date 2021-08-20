const ChatService = require("@services/ChatService")

class ChatController {
    constructor(gameInstance, io) {
        this._service = new ChatService(gameInstance, io)
    }

    onSendMessage(socket, data) {
        this._service.onSendMessage(socket, data)
    }

    onGetMessages(socket, callback) {
        this._service.onGetMessages(socket, callback)
    }
}

module.exports = ChatController
