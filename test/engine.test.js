'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const engineSource = fs.readFileSync(path.join(root, 'js/Tetris.js'), 'utf8')
const fixturesSource = fs.readFileSync(path.join(root, 'js/TestCase.js'), 'utf8')

function loadEngine (randomValues = []) {
  const intervals = new Map()
  const cookies = new Map()
  const canvasContext = {
    beginPath () {},
    clearRect () {},
    closePath () {},
    fill () {},
    fillRect () {},
    fillText () {},
    lineTo () {},
    moveTo () {},
    stroke () {},
    strokeText () {}
  }
  const canvas = {
    getContext () {
      return canvasContext
    }
  }
  const highScores = { innerHTML: '' }
  const document = {
    getElementById (id) {
      if (id === 'game') return canvas
      if (id === 'high-scores') return highScores
      return null
    },
    onkeydown: null
  }
  Object.defineProperty(document, 'cookie', {
    get () {
      return Array.from(cookies, ([name, value]) => name + '=' + value).join('; ')
    },
    set (cookie) {
      const pair = cookie.split(';', 1)[0]
      const separator = pair.indexOf('=')
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1))
    }
  })

  let nextIntervalId = 1
  const math = Object.create(Math)
  const queuedRandomValues = randomValues.slice()
  math.random = function () {
    return queuedRandomValues.length > 0 ? queuedRandomValues.shift() : 0
  }

  const context = vm.createContext({
    clearInterval (id) {
      intervals.delete(id)
    },
    console: { log () {} },
    document,
    Math: math,
    setInterval (callback) {
      const id = nextIntervalId++
      intervals.set(id, callback)
      return id
    },
    window: {}
  })

  vm.runInContext(engineSource, context, { filename: 'js/Tetris.js' })
  vm.runInContext(fixturesSource, context, { filename: 'js/TestCase.js' })

  return {
    Game: context.Game,
    Tet: context.Tet,
    createGame () {
      return new context.Game('game', 'high-scores', false)
    },
    pendingIntervals () {
      return intervals.size
    },
    runIntervalsUntilIdle (limit = 100) {
      let runs = 0
      while (intervals.size > 0) {
        const scheduled = Array.from(intervals)
        for (const [id, callback] of scheduled) {
          if (!intervals.has(id)) continue
          runs++
          if (runs > limit) throw new Error('fake interval limit exceeded')
          callback()
        }
      }
    }
  }
}

function emptyGame (engine) {
  const game = engine.createGame()
  game.allTets = []
  game.currentTet = null
  game.newTet = true
  game.updateLanded = true
  return game
}

function occupiedCells (game) {
  const landed = game.getLanded()
  const cells = []
  for (let row = 0; row < landed.length; row++) {
    for (let col = 0; col < landed[row].length; col++) {
      if (landed[row][col] !== 0) cells.push([row, col])
    }
  }
  return cells
}

test('movement and rotation stop at board boundaries', () => {
  const engine = loadEngine()
  const game = emptyGame(engine)
  const tet = new engine.Tet(game, 0)
  game.currentTet = tet
  game.allTets = [tet]
  game.newTet = false

  tet.topLeft = { row: 0, col: 1 }
  tet.moveLeft()
  assert.equal(tet.topLeft.col, 0)
  tet.moveLeft()
  assert.equal(tet.topLeft.col, 0)

  tet.topLeft = { row: 0, col: 5 }
  tet.moveRight()
  assert.equal(tet.topLeft.col, 6)
  tet.moveRight()
  assert.equal(tet.topLeft.col, 6)
  assert.equal(tet.pivot, 1)

  const rotatable = new engine.Tet(game, 5)
  game.currentTet = rotatable
  game.allTets = [rotatable]
  assert.equal(rotatable.rotate(), true)
  assert.equal(rotatable.rotation, 1)

  const bottomTet = new engine.Tet(game, 0)
  bottomTet.topLeft = { row: 13, col: 4 }
  game.currentTet = bottomTet
  game.allTets = [bottomTet]
  game.updateLanded = true
  assert.equal(bottomTet.rotate(), false)
  assert.equal(bottomTet.rotation, 0)
  assert.deepEqual(bottomTet.topLeft, { row: 13, col: 4 })
  assert.equal(engine.pendingIntervals(), 0)
})

test('manual case 7 prevents an I-piece pivot from rotating through landed cells', () => {
  const engine = loadEngine()
  const game = emptyGame(engine)

  game.testCase(7)
  const falling = game.currentTet

  assert.equal(falling.rotate(), false)
  assert.equal(falling.rotation, 0)
  assert.equal(falling.pivot, 3)
  assert.deepEqual(JSON.parse(JSON.stringify(falling.topLeft)), { row: 9, col: 6 })
  assert.deepEqual(occupiedCells(game), [
    [10, 9],
    [11, 9],
    [12, 9],
    [13, 9]
  ])
  assert.equal(engine.pendingIntervals(), 0)
})

test('landing keeps allTets and the derived landed grid synchronized', () => {
  const engine = loadEngine()
  const game = emptyGame(engine)
  const tet = new engine.Tet(game, 3)
  tet.topLeft = { row: 14, col: 0 }
  game.currentTet = tet
  game.allTets = [tet]
  game.newTet = false

  assert.deepEqual(occupiedCells(game), [])
  tet.moveDown()

  assert.equal(game.currentTet, null)
  assert.equal(game.newTet, true)
  assert.equal(game.allTets.length, 1)
  assert.deepEqual(occupiedCells(game), [
    [14, 0],
    [14, 1],
    [15, 0],
    [15, 1]
  ])
  assert.equal(engine.pendingIntervals(), 0)
})

test('a line clear scores, fragments a piece, and cascades unsupported cells', () => {
  const engine = loadEngine()
  const game = emptyGame(engine)

  const vertical = new engine.Tet(game, 0)
  vertical.rotate()
  vertical.topLeft = { row: 12, col: 0 }

  const leftFill = new engine.Tet(game, 0)
  leftFill.topLeft = { row: 14, col: 1 }
  const rightFill = new engine.Tet(game, 0)
  rightFill.topLeft = { row: 14, col: 5 }
  const finalFill = new engine.Tet(game, -1)
  finalFill.type = 0
  finalFill.topLeft = { row: 14, col: 9 }
  finalFill.setShape([[1]])

  game.allTets = [vertical, leftFill, rightFill, finalFill]
  game.currentTet = null
  game.newTet = true
  game.updateLanded = true

  vertical.collided()

  assert.equal(game.score, 10000)
  assert.equal(game.allTets.length, 2)
  assert.equal(engine.pendingIntervals(), 1)

  engine.runIntervalsUntilIdle()

  assert.equal(engine.pendingIntervals(), 0)
  assert.equal(game.allTets.length, 2)
  assert.deepEqual(occupiedCells(game), [
    [13, 0],
    [14, 0],
    [15, 0]
  ])
  assert.equal(vertical.topLeft.row, 13)
  assert.deepEqual(JSON.parse(JSON.stringify(vertical.shape)), [[1], [1]])
})

test('a blocked spawn ends the game, clears its loop, and records the score', () => {
  const engine = loadEngine()
  const game = emptyGame(engine)
  const blocker = new engine.Tet(game, -1)
  blocker.type = 0
  blocker.topLeft = { row: 0, col: 4 }
  blocker.setShape([[1]])
  game.allTets = [blocker]
  game.nextTet = new engine.Tet(game, 3)
  game.updateLanded = true
  game.score = 12345

  game.tetDownLoop()
  assert.equal(engine.pendingIntervals(), 1)

  game.createTet()

  assert.equal(game.gameOver, true)
  assert.equal(game.newTet, true)
  assert.equal(game.currentTet, game.nextTet)
  assert.equal(game.allTets.length, 1)
  assert.equal(engine.pendingIntervals(), 0)

  game.draw()
  assert.equal(game.updateScore, false)
  assert.equal(game.getHighScores()[0], 12345)
  assert.equal(engine.pendingIntervals(), 0)
})
