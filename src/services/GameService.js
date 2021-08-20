const gameUnitsObject = require("@root/src/game-units.json")

class GameService {
    constructor(gameInstance, io) {
        this._game = gameInstance
        this._io = io
    }

    onGameStart(socket, callback) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            callback(false)
            return
        }

        const gameStarted = this._game.startGame(socket, playerRoomId)

        if (gameStarted) {
            this._io.to(playerRoomId).emit('game:starts')
        } else {
            callback(false)
        }
    }

    onGetGameAmbience(socket, callback) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            callback(false)
            return
        }

        callback({
            field: this._game.getField(playerRoomId),
            fieldW: this._game.getFieldSize(playerRoomId).width,
            fieldH: this._game.getFieldSize(playerRoomId).height,
            players: this._game.getPlayersInRoom(playerRoomId),
        })
    }

    onGetShopProducts(socket, callback) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            return
        }

        const shopProducts = JSON.parse(JSON.stringify(gameUnitsObject))
        const playerUnits  = this._game.getPlayerUnits(socket.id, playerRoomId)

        for (const unitId in shopProducts) {
            shopProducts[unitId].obtained = playerUnits[unitId] ?? 0
        }

        callback(shopProducts)
    }

    onShopTransaction(socket, data, callback) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)
        const { unitId } = data

        if (!playerRoomId) {
            return
        }

        const success = this._game.shopTransaction(socket.id, playerRoomId, unitId)

        this._io.to(socket.id).emit(
            'player:moneyUpdate',
            this._game.getPlayerMoney(socket.id, playerRoomId)
        )

        callback(success)
    }

    onGetCellActions(socket, cell, callback) {
        const {row, col} = cell

        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            return
        }

        const unitsMap = this._game.getField(playerRoomId)

        try {
            if (unitsMap[row][col].belongsTo === -1) {
                callback(false)
                return
            }

            const actions = []

            if (this._doesTeslaCanHit(socket.id, playerRoomId, row, col)) {
                actions.push({
                    type: 'destroy'
                })
            }

            callback(actions)
        } catch (e) {
            callback(false)
        }
    }

    onStep(socket, stepDetails) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            return
        }

        const currentPlayerTurn = this._game.getPlayerTurn(playerRoomId)

        try {
            if (currentPlayerTurn.player !== socket.id) {
                return
            }
        } catch (e) {
            return
        }

        const unitsMap = this._game.getField(playerRoomId)

        // virus type: std, tesla, catapult, hardWall
        const { action } = stepDetails

        let stepHappened = false

        if (action === 'placeUnit') {
            const { unitId } = stepDetails

            if (unitId === 'std') {
                const { row, col } = stepDetails

                if (!unitsMap[row] || !unitsMap[row][col]) {
                    return
                }

                const prevVirus = unitsMap[row][col].virus

                if (prevVirus === 'hardWall' && currentPlayerTurn.moves > 1) {
                    return
                }

                stepHappened = this._placeStdVirus(socket.id, playerRoomId, row, col)

                if (stepHappened && prevVirus === 'hardWall') {
                    currentPlayerTurn.moves++
                }
            } else if (unitId === 'tesla') {
                const { toCells } = stepDetails

                const playerUnits  = this._game.getPlayerUnits(socket.id, playerRoomId)

                if (playerUnits['tesla'] < 1) return

                stepHappened = this._placeTesla(socket.id, playerRoomId, toCells)

                if (stepHappened) {
                    playerUnits['tesla']--
                }
            } else if (unitId === 'hardWall') {
                const { toCells } = stepDetails

                const playerUnits  = this._game.getPlayerUnits(socket.id, playerRoomId)

                if (playerUnits['hardWall'] < 1) return

                stepHappened = this._placeHardWall(socket.id, playerRoomId, toCells)

                if (stepHappened) {
                    playerUnits['hardWall']--
                }
            }
        } else if (action === 'destroy') {
            const { row, col } = stepDetails

            stepHappened = this._destroyCell(socket.id, playerRoomId, row, col)
        }

        if (stepHappened) {
            this._io.to(playerRoomId).emit('game:step', unitsMap)
            currentPlayerTurn.moves++
        }

        if (currentPlayerTurn.moves >= 3) {
            this._game.setNextPlayerTurn(playerRoomId)
            this._io.to(playerRoomId).emit('game:turnSwitches', this._game.getPlayerTurn(playerRoomId).player)
        }
    }

    onPlayerStopsPlaying(socket, leaveBattle) {
        const playerRoomId = this._game.getPlayerRoomId(socket.id)

        if (!playerRoomId) {
            // game doesn't exist
            socket.leave(playerRoomId)
            return
        }

        if (!this._game.isGameStarted(playerRoomId)) {
            this._endGame(playerRoomId)

            return
        }

        this._game.disablePlayer(socket.id, playerRoomId)

        const playersInRoom = this._game.getPlayersInRoom(playerRoomId)

        let countOfPlayers  = 0
        let disabledPlayers = 0

        for (const playerId in playersInRoom) {
            countOfPlayers++

            if (playersInRoom[playerId].disabled) {
                disabledPlayers++
            }
        }

        if (countOfPlayers - disabledPlayers > 1) {
            if (leaveBattle) {
                socket.leave(playerRoomId)
            }

            return
        } else {
            this._endGame(playerRoomId)
        }
    }

    _placeStdVirus(playerId, roomId, row, col) {
        const unitsMap = this._game.getField(roomId)

        if (
            (unitsMap[row][col].belongsTo === playerId)
            ||
            (unitsMap[row][col].virus === 'wall')
            ||
            (unitsMap[row][col].destroyed)
        ) {
            return false
        }

        if (this._virusHasAdjacents(playerId, roomId, row, col)) {
            if (unitsMap[row][col].belongsTo !== -1) {
                if (unitsMap[row][col].virus === 'tesla:heart') {
                    this.breakTesla(unitsMap[row][col].belongsTo, roomId, row, col)
                }

                unitsMap[row][col].virus = 'wall'

                this._game.increasePlayerMoney(playerId, roomId, 1)
                this._game.updatePlayerStats(playerId, roomId, 'wallsBuilt', 1)
                this._game.updatePlayerStats(playerId, roomId, 'killedByPlayer', 1)
                this._game.updatePlayerStats(unitsMap[row][col].belongsTo, roomId, 'playersUnitsKilled', 1)

                this._io.to(playerId).emit(
                    'player:moneyUpdate',
                    this._game.getPlayerMoney(playerId, roomId)
                )
            } else {
                unitsMap[row][col].virus = 'std'
                this._game.updatePlayerStats(playerId, roomId, 'stdVirusesBuilt', 1)
            }

            unitsMap[row][col].belongsTo = playerId

            return true
        }

        return false
    }

    _placeTesla(playerId, roomId, toCells) {
        if (!this._isTeslaValid(playerId, roomId, toCells)) {
            return false
        }

        const unitsMap = this._game.getField(roomId)

        const teslaHeart = this._getTeslaHeart(toCells)

        if (!teslaHeart) {
            return false
        }

        for (let teslaPart of toCells) {
            unitsMap[teslaPart[1]][teslaPart[0]] = {
                belongsTo: playerId,
                destroyed: false,
                heartRow: teslaHeart[1],
                heartCol: teslaHeart[0],
                virus: 'tesla:wing',
            }
        }

        unitsMap[teslaHeart[1]][teslaHeart[0]] = {
            belongsTo: playerId,
            destroyed: false,
            virus: 'tesla:heart',
        }

        this._game.updatePlayerStats(playerId, roomId, 'teslasBuilt', 1)

        return true
    }

    _placeHardWall(playerId, roomId, toCells) {
        if (toCells.length !== 4) {
            return false
        }

        const unitsMap = this._game.getField(roomId)

        const unifiedCells = this._unifyCells(toCells)

        const availableVariants = [
            [ [0, 0], [1, 0], [2, 0], [3, 0] ],
            [ [0, 0], [1, 1], [2, 2], [3, 3] ],
            [ [0, 0], [0, 1], [0, 2], [0, 3] ],
            [ [1, 0], [2, 1], [1, 2], [0, 3] ],
        ]

        let isWallCorrect = false

        checkWallCycle:
        for (const variant of availableVariants) {
            isWallCorrect = true

            for (let i = 0; i < 4; i++) {
                if (
                    (variant[i][0] !== unifiedCells[i][0])
                    ||
                    (variant[i][1] !== unifiedCells[i][1])
                ) {
                    isWallCorrect = false
                    continue checkWallCycle
                }
            }

            if (isWallCorrect) {
                break checkWallCycle
            }
        }

        if (!isWallCorrect) {
            return false
        }

        try {
            for (const cell of toCells) {
                if (
                    (unitsMap[cell[1]][cell[0]].belongsTo !== playerId)
                    ||
                    (unitsMap[cell[1]][cell[0]].virus !== 'std')
                ) {
                    return false
                }
            }
        } catch (e) {
            return false
        }

        for (const cell of toCells) {
            unitsMap[cell[1]][cell[0]] = {
                belongsTo: playerId,
                destroyed: false,
                virus: 'hardWall',
            }
        }

        this._game.updatePlayerStats(playerId, roomId, 'hardWallsBuilt', 1)

        return true
    }

    _destroyCell(playerId, roomId, row, col) {
        if (this._doesTeslaCanHit(playerId, roomId, row, col)) {
            const unitsMap = this._game.getField(roomId)

            if (unitsMap[row][col].virus === 'tesla:heart') {
                this.breakTesla(unitsMap[row][col].belongsTo, roomId, row, col)
            }

            unitsMap[row][col] = {
                belongsTo: -1,
                destroyed: true,
            }

            return true
        }

        this._game.updatePlayerStats(playerId, roomId, 'cellsDestroyed', 1)

        return false
    }

    _getTeslaHeart(cells) {
        const sortedCells = cells.sort((a, b) => a[0] - b[0] || a[1] - b[1])

        let row1 = []
        let row2 = []
        let row3 = []

        for (let cell of cells) {
            if (cell[1] === sortedCells[0][1])     row1.push(cell)
            if (cell[1] === sortedCells[0][1] + 1) row2.push(cell)
            if (cell[1] === sortedCells[0][1] + 2) row3.push(cell)
        }

        return [
            row2[0][0],
            row2[0][1],
        ]
    }

    _isTeslaValid(playerId, roomId, cells) {
        if (cells.length !== 5) {
            return false
        }

        const unifiedCells = this._unifyCells(cells)

        let row1 = []
        let row2 = []
        let row3 = []

        for (let cell of unifiedCells) {
            if (cell[1] === 0) row1.push(cell)
            if (cell[1] === 1) row2.push(cell)
            if (cell[1] === 2) row3.push(cell)
        }

        try {
            if (Math.abs(row1[0][0] - row1[1][0]) !== 2) return false
            if (row2[0][0] !== 1) return false
            if (Math.abs(row3[0][0] - row3[1][0]) !== 2) return false
        } catch (e) {
            return false
        }

        const unitsMap = this._game.getField(roomId)

        try {
            for (const cell of cells) {
                if (
                    (unitsMap[cell[1]][cell[0]].belongsTo !== playerId)
                    ||
                    (unitsMap[cell[1]][cell[0]].virus !== 'std')
                ) {
                    return false
                }
            }
        } catch (e) {
            return false
        }

        return true
    }

    _virusHasAdjacents(playerId, roomId, row, col, options = {}) {
        const unitsMap = this._game.getField(roomId)

        const checkedCells = options.checkedCells ?? []

        if (
            (row > options.maxRowLimit && options.maxRowLimit)
            ||
            (col > options.maxColLimit && options.maxColLimit)
            ||
            (row < options.minRowLimit && options.minRowLimit)
            ||
            (col < options.minColLimit && options.minColLimit)
        ) {
            return
        }

        for (let i = -1; i < 2; i++) {
            for (let j = -1; j < 2; j++) {
                if (!unitsMap[row + i]) continue
                if (!unitsMap[row + i][col + j]) continue

                if (checkedCells.indexOf(`${row + i}:${col + j}`) !== -1) continue

                if (unitsMap[row + i][col + j].destroyed) continue
                
                if (
                    unitsMap[row + i][col + j].virus === 'tesla:wing'
                    ||
                    unitsMap[row + i][col + j].virus === 'tesla:heart'
                ) continue

                // here we can recursively go through all walls to the active virus
                if (unitsMap[row + i][col + j].belongsTo === playerId) {
                    checkedCells.push(`${row + i}:${col + j}`)

                    if (unitsMap[row + i][col + j].virus !== 'wall') {
                        return true
                    } else {
                        const connectedToVirus = this._virusHasAdjacents(playerId, roomId, row + i, col + j, {checkedCells})

                        if (connectedToVirus) return true
                    }
                }
            }
        }

        return false
    }

    _doesTeslaCanHit(playerId, roomId, row, col) {
        const unitsMap = this._game.getField(roomId)

        for (let i = -2; i <= 2; i++) {
            for (let j = -2; j <= 2; j++) {

                if (
                    (Math.abs(i) === Math.abs(j))
                    &&
                    (Math.abs(i) !== 2)
                    &&
                    (Math.abs(j) !== 2)
                ) continue

                if (!unitsMap[row + i]) continue
                if (!unitsMap[row + i][col + j]) continue

                if (
                    (unitsMap[row + i][col + j].belongsTo === playerId)
                    &&
                    (unitsMap[row + i][col + j].virus === 'tesla:wing')
                    ) {
                    return true
                }
            }
        }
    }

    breakTesla(playerWhoOwnsTeslaId, roomId, heartRow, heartCol) {
        const unitsMap = this._game.getField(roomId)

        heartRow = +heartRow
        heartCol = +heartCol

        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (
                    (unitsMap[heartRow + i][heartCol + j].belongsTo === playerWhoOwnsTeslaId)
                    &&
                    (unitsMap[heartRow + i][heartCol + j].virus === 'tesla:wing')
                ) {
                    unitsMap[heartRow + i][heartCol + j] = {
                        belongsTo: playerWhoOwnsTeslaId,
                        destroyed: false,
                        virus: 'wall',
                    }
                }
            }
        }
    }

    _unifyCells(cells) {
        const unifiedCells = []
        const sortedCells  = cells.sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]))

        const xModifier = sortedCells[0][0]
        const yModifier = sortedCells[0][1]

        for (let cell of cells) {
            unifiedCells.push([
                Math.abs(cell[0] - xModifier),
                Math.abs(cell[1] - yModifier),
            ])
        }

        return unifiedCells
    }

    _endGame(roomId) {
        const stats  = this._game.getRoomStats(roomId)
        const players = this._game.getPlayersInRoom(roomId)

        let winnerId = null

        for (const playerId in players) {
            if (!players[playerId].disabled) {
                winnerId = playerId
            }
        }

        this._game.endGame(roomId)

        this._io.to(roomId).emit('game:over', {
            winnerId,
            stats
        })

        this._io.of('/').in(roomId).socketsLeave(roomId)
    }
}

module.exports = GameService
