class ChatModel {
    constructor() {
        this.messages = {}
    }

    addMessage(senderId, roomId, messageContent, createTime) {
        if (!this.messages[roomId]) {
            this.messages[roomId] = []
        }

        this.messages[roomId].push({
                senderId,
                createTime,
                text: messageContent
        })
    }

    getMessages(roomId) {
        return this.messages[roomId]
    }
}

module.exports = ChatModel
