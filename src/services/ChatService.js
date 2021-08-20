const ChatModel = require('@models/ChatModel')

class ChatService {
    constructor(gameInstance, io) {
        this._model = new ChatModel()

        this._game = gameInstance
        this._io   = io
    }

    onSendMessage(socket, messageContent) {
        if (typeof messageContent !== 'string') {
            return
        }

        // maximal message length = 200 symbols
        if (messageContent.length > 200) {
            return
        }

        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (playerRoomId) {
            this._model.addMessage(
                socket.id,
                playerRoomId,
                messageContent,
                new Date - this._game.getGameStartTime(playerRoomId),
            )

            this._io.to(playerRoomId).emit('chat:thereIsNewMessage')
        }
    }

    onGetMessages(socket, callback) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        callback(this._model.getMessages(playerRoomId))
    } 
}

module.exports = ChatService
