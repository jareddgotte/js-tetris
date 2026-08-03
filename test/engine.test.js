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

  function createEventTarget () {
    const listeners = new Map()
    return {
      addEventListener (type, listener) {
        if (!listeners.has(type)) listeners.set(type, [])
        listeners.get(type).push(listener)
      },
      removeEventListener (type, listener) {
        if (!listeners.has(type)) return
        const remaining = listeners.get(type).filter(entry => entry !== listener)
        if (remaining.length > 0) {
          listeners.set(type, remaining)
        } else {
          listeners.delete(type)
        }
      },
      dispatchEvent (event) {
        const handlers = listeners.get(event.type) || []
        for (const handler of handlers.slice()) {
          handler(event)
        }
      },
      listenerCount (type) {
        return (listeners.get(type) || []).length
      }
    }
  }

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
  const canvas = createEventTarget()
  canvas.tagName = 'CANVAS'
  canvas.getContext = function () {
    return canvasContext
  }
  canvas.focus = function () {}

  const highScores = { innerHTML: '' }
  const document = createEventTarget()
  document.body = { tagName: 'BODY' }
  document.documentElement = { tagName: 'HTML' }
  document.getElementById = function (id) {
    if (id === 'game') return canvas
    if (id === 'high-scores') return highScores
    return null
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

  const windowTarget = createEventTarget()
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
    window: windowTarget
  })

  vm.runInContext(engineSource, context, { filename: 'js/Tetris.js' })
  vm.runInContext(fixturesSource, context, { filename: 'js/TestCase.js' })

  function translateKeyInput (input) {
    if (typeof input === 'number') {
      if (input >= 48 && input <= 57) {
        return { key: String(input - 48), code: 'Digit' + String(input - 48), keyCode: input }
      }
      const mapping = {
        32: { key: ' ', code: 'Space' },
        35: { key: 'End', code: 'End' },
        37: { key: 'ArrowLeft', code: 'ArrowLeft' },
        38: { key: 'ArrowUp', code: 'ArrowUp' },
        39: { key: 'ArrowRight', code: 'ArrowRight' },
        40: { key: 'ArrowDown', code: 'ArrowDown' },
        71: { key: 'g', code: 'KeyG' },
        72: { key: 'h', code: 'KeyH' },
        80: { key: 'p', code: 'KeyP' },
        82: { key: 'r', code: 'KeyR' },
        83: { key: 's', code: 'KeyS' },
        192: { key: '`', code: 'Backquote' }
      }
      return Object.assign({ keyCode: input }, mapping[input] || {})
    }
    if (typeof input === 'string') {
      return { key: input, code: input, keyCode: input.charCodeAt(0) }
    }
    return Object.assign({}, input)
  }

  function dispatchEvent (target, type, init) {
    const event = Object.assign({
      type,
      defaultPrevented: false,
      preventDefault () {
        this.defaultPrevented = true
      }
    }, init)
    target.dispatchEvent(event)
    return event
  }

  return {
    Game: context.Game,
    Tet: context.Tet,
    canvas,
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
    dispatchKey (input, overrides = {}) {
      return dispatchEvent(document, 'keydown', Object.assign({ target: document.body }, translateKeyInput(input), overrides))
    },
    dispatchWindowEvent (type, overrides = {}) {
      return dispatchEvent(windowTarget, type, overrides)
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

function activeTetGame (engine, tetType = 3) {
  const game = emptyGame(engine)
  const tet = new engine.Tet(game, tetType)
  tet.topLeft = { row: 5, col: 4 }
  game.currentTet = tet
  game.allTets = [tet]
  game.newTet = false
  game.paused = false
  game.gameOver = false
  return { game, tet }
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

test('keyboard actions are mapped by name and prevent default only when handled', () => {
  const engine = loadEngine()
  const { game, tet } = activeTetGame(engine)

  const left = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft' })
  assert.equal(left.defaultPrevented, true)
  assert.equal(tet.topLeft.col, 3)

  game.paused = true
  const blocked = engine.dispatchKey({ key: 'ArrowRight', code: 'ArrowRight' })
  assert.equal(blocked.defaultPrevented, false)
  assert.equal(tet.topLeft.col, 3)

  game.paused = false
  const pause = engine.dispatchKey({ key: 'P', code: 'KeyP' })
  assert.equal(pause.defaultPrevented, true)
  assert.equal(game.paused, true)

  const resume = engine.dispatchKey({ key: 'p', code: 'KeyP' })
  assert.equal(resume.defaultPrevented, true)
  assert.equal(game.paused, false)

  const ignored = engine.dispatchKey({ key: 'q', code: 'KeyQ' })
  assert.equal(ignored.defaultPrevented, false)
})

test('keyboard input ignores editable and unrelated targets', () => {
  const engine = loadEngine()
  const { tet } = activeTetGame(engine)
  const input = { tagName: 'INPUT' }
  const link = { tagName: 'A' }

  const editable = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', target: input })
  assert.equal(editable.defaultPrevented, false)
  assert.equal(tet.topLeft.col, 4)

  const unrelated = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', target: link })
  assert.equal(unrelated.defaultPrevented, false)
  assert.equal(tet.topLeft.col, 4)
})

test('blur pauses an active game and focus resumes only after blur-triggered pause', () => {
  const engine = loadEngine()
  const game = engine.createGame()

  game.resumeGame()
  assert.equal(game.paused, false)
  assert.equal(engine.pendingIntervals(), 1)

  engine.dispatchWindowEvent('blur')
  assert.equal(game.paused, true)
  assert.equal(engine.pendingIntervals(), 0)

  engine.dispatchWindowEvent('focus')
  assert.equal(game.paused, false)
  assert.equal(engine.pendingIntervals(), 1)

  game.pauseGame()
  assert.equal(game.paused, true)
  engine.dispatchWindowEvent('blur')
  engine.dispatchWindowEvent('focus')
  assert.equal(game.paused, true)
  assert.equal(engine.pendingIntervals(), 0)
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
    assert.equal(engine.document.onkeydown, undefined, fixture.name)
    assert.equal(engine.document.listenerCount('keydown'), 1, fixture.name)

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
  assert.equal(engine.document.onkeydown, undefined)
  assert.equal(engine.document.listenerCount('keydown'), 1)
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
  assert.equal(engine.document.onkeydown, undefined)
  assert.equal(engine.document.listenerCount('keydown'), 1)

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
