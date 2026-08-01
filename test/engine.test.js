'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const engineSource = fs.readFileSync(path.join(root, 'js/Tetris.js'), 'utf8')
const fixturesSource = fs.readFileSync(path.join(root, 'js/TestCase.js'), 'utf8')

function loadEngine (randomValues = [], options = {}) {
  const intervals = new Map()
  const cookies = new Map(Object.entries(options.cookies || {}))
  const canvasText = []
  let cookieWrites = 0
  const canvasContext = {
    beginPath () {},
    clearRect () {},
    closePath () {},
    fill () {},
    fillRect () {},
    fillText (text) {
      canvasText.push(String(text))
    },
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
      if (options.cookieReadError) throw new Error('cookie read unavailable')
      return Array.from(cookies, ([name, value]) => name + '=' + value).join('; ')
    },
    set (cookie) {
      if (options.cookieWriteError) throw new Error('cookie write unavailable')
      cookieWrites++
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
    canvasText,
    cookieValue (name) {
      const value = cookies.get(name)
      if (value === undefined) return undefined
      return vm.runInContext('unescape(' + JSON.stringify(value) + ')', context)
    },
    cookieWrites () {
      return cookieWrites
    },
    createGame (devMode = false) {
      return new context.Game('game', 'high-scores', devMode)
    },
    dispatchKey (keyCode) {
      document.onkeydown({ keyCode })
    },
    document,
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

function plainScores (game) {
  return JSON.parse(JSON.stringify(game.getHighScores()))
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

test('Backquote toggles the default developer mode and its visible DEV state', () => {
  const engine = loadEngine()
  const game = engine.createGame()

  assert.equal(game.devModeOn, false)
  engine.canvasText.length = 0
  engine.dispatchKey(192)
  assert.equal(game.devModeOn, true)
  assert.equal(engine.canvasText.includes('DEV'), true)

  engine.canvasText.length = 0
  engine.dispatchKey(192)
  assert.equal(game.devModeOn, false)
  assert.equal(engine.canvasText.includes('DEV'), false)
})

test('developer fixture commands stay gated until developer mode is enabled', () => {
  const engine = loadEngine()
  const game = engine.createGame()
  const fixtureCalls = []
  game.testCase = function (fixture) {
    fixtureCalls.push(fixture)
  }
  game.createTet = function () {}
  game.tetDownLoop = function () {}

  engine.dispatchKey(55)
  assert.deepEqual(fixtureCalls, [])

  engine.dispatchKey(192)
  engine.dispatchKey(55)
  assert.deepEqual(fixtureCalls, [7])

  engine.dispatchKey(192)
  engine.dispatchKey(55)
  assert.deepEqual(fixtureCalls, [7])
})

test('constructor-enabled developer mode still permits gated fixtures', () => {
  const engine = loadEngine()
  const game = engine.createGame(true)
  const fixtureCalls = []
  game.testCase = function (fixture) {
    fixtureCalls.push(fixture)
  }
  game.createTet = function () {}
  game.tetDownLoop = function () {}

  engine.dispatchKey(55)

  assert.equal(game.devModeOn, true)
  assert.deepEqual(fixtureCalls, [7])
})

test('high-score cookies are normalized and repaired across invalid shapes', () => {
  const cases = [
    {
      name: 'missing',
      cookies: {},
      expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'malformed',
      cookies: { highScores: 'not-json' },
      expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'non-array',
      cookies: { highScores: '{"score":10}' },
      expected: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'short, unsorted, and fractional',
      cookies: { highScores: '[4.5,9,2]' },
      expected: [9, 4.5, 2, 0, 0, 0, 0, 0, 0, 0]
    },
    {
      name: 'long',
      cookies: { highScores: '[12,11,10,9,8,7,6,5,4,3,2,1]' },
      expected: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3]
    },
    {
      name: 'nonnumeric, negative, and non-finite',
      cookies: { highScores: '[3,"9",-1,1e400,null,true,2.5]' },
      expected: [3, 2.5, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  ]

  for (const fixture of cases) {
    const engine = loadEngine([], { cookies: fixture.cookies })
    let game
    assert.doesNotThrow(() => {
      game = engine.createGame()
    }, fixture.name)
    assert.deepEqual(plainScores(game), fixture.expected, fixture.name)
    assert.deepEqual(JSON.parse(engine.cookieValue('highScores')), fixture.expected, fixture.name)
    assert.equal(game.currentTet !== null, true, fixture.name)
    assert.equal(typeof engine.document.onkeydown, 'function', fixture.name)

    game.score = 6.25
    assert.doesNotThrow(() => game.checkHighScore(), fixture.name)
    const checked = plainScores(game)
    assert.equal(checked.length, 10, fixture.name)
    assert.equal(checked.every(score => Number.isFinite(score) && score >= 0), true, fixture.name)
    assert.deepEqual(checked.slice().sort((a, b) => b - a), checked, fixture.name)
  }
})

test('a valid descending top ten, including fractional scores, is preserved', () => {
  const scores = [99.5, 80, 70.25, 60, 50, 40, 30, 20, 10, 0]
  const engine = loadEngine([], { cookies: { highScores: JSON.stringify(scores) } })
  const game = engine.createGame()

  assert.deepEqual(plainScores(game), scores)
  assert.deepEqual(JSON.parse(engine.cookieValue('highScores')), scores)
  assert.equal(engine.cookieWrites(), 0)
})

test('cookie read failure keeps startup and in-memory score checking available', () => {
  const engine = loadEngine([], { cookieReadError: true })
  let game

  assert.doesNotThrow(() => {
    game = engine.createGame()
  })
  assert.equal(game.currentTet !== null, true)
  assert.equal(typeof engine.document.onkeydown, 'function')
  assert.deepEqual(plainScores(game), [0, 0, 0, 0, 0, 0, 0, 0, 0, 0])

  game.score = 42.5
  assert.doesNotThrow(() => game.checkHighScore())
  assert.deepEqual(plainScores(game), [42.5, 0, 0, 0, 0, 0, 0, 0, 0, 0])
})

test('cookie write failure keeps startup and in-memory score checking available', () => {
  const engine = loadEngine([], { cookieWriteError: true })
  let game

  assert.doesNotThrow(() => {
    game = engine.createGame()
  })
  assert.equal(game.currentTet !== null, true)
  assert.equal(typeof engine.document.onkeydown, 'function')

  game.score = 17.75
  assert.doesNotThrow(() => game.checkHighScore())
  assert.deepEqual(plainScores(game), [17.75, 0, 0, 0, 0, 0, 0, 0, 0, 0])
})

test('non-finite current scores cannot contaminate a repaired score list', () => {
  const engine = loadEngine([], { cookies: { highScores: '[10,5]' } })
  const game = engine.createGame()

  game.score = Infinity
  assert.doesNotThrow(() => game.checkHighScore())
  assert.deepEqual(plainScores(game), [10, 5, 0, 0, 0, 0, 0, 0, 0, 0])
})
