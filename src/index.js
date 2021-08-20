require('dotenv').config()

require('module-alias/register')

const express = require('express');
const app = express();
var server = require('http').createServer(app);  
var io = require('socket.io')(server, {
    cors: {
      origin: '*'
    }
})

const Viruses = require("@models/Viruses.js")
const PlayerController = require("@controllers/PlayerController.js")
const GameController = require("@controllers/GameController.js")
const ChatController = require("@controllers/ChatController.js")

const virusesGame = new Viruses()

const playerController = new PlayerController(virusesGame, io)
const gameController   = new GameController(virusesGame, io)
const chatController   = new ChatController(virusesGame, io)

io.on('connection', (socket) => {
    playerController.onConnection()

    socket.on('game:getRooms', (callback) => {
        playerController.onGetRooms(callback)
    })

    socket.on('game:createGame', (data, callback) => {
        playerController.onCreateGame(socket, data, callback)
    })

    socket.on('game:connectToRoom', (data, callback) => {
        playerController.onConnectToRoom(socket, data, callback)
    })

    socket.on('game:start', (callback) => {
        gameController.onGameStart(socket, callback)
    })

    socket.on('game:getGameAmbience', (callback) => {
        gameController.onGetGameAmbience(socket, callback)
    })

    socket.on('game:step', (data) => {
        gameController.onStep(socket, data)
    })

    socket.on('game:stopPlaying', (data) => {
        gameController.onPlayerStopsPlaying(socket, data)
    })

    socket.on('game:getCellActions', (data, callback) => {
        gameController.onGetCellActions(socket, data, callback)
    })

    socket.on('game:getShopProducts', (callback) => {
        gameController.onGetShopProducts(socket, callback)
    })

    socket.on('game:shopTransaction', (data, callback) => {
        gameController.onShopTransaction(socket, data, callback)
    })

    socket.on('chat:sendMessage', (data) => {
        chatController.onSendMessage(socket, data)
    })

    socket.on('chat:getMessages', (callback) => {
        chatController.onGetMessages(socket, callback)
    })

    socket.on('disconnect', () => {
        gameController.onPlayerStopsPlaying(socket, true)
    })
})

server.listen(process.env.PORT || 5001)
