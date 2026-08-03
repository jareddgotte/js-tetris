'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const vm = require('node:vm')

const root = path.resolve(__dirname, '..')
const engineSource = fs.readFileSync(path.join(root, 'js/Tetris.js'), 'utf8')
const fixturesSource = fs.readFileSync(path.join(root, 'js/TestCase.js'), 'utf8')
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
const stylesSource = fs.readFileSync(path.join(root, 'css/main.css'), 'utf8')

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

  function createNode (tagName, initial = {}) {
    const node = createEventTarget()
    node.tagName = tagName
    node.textContent = initial.textContent || ''
    node.innerHTML = initial.innerHTML || ''
    node.hidden = Boolean(initial.hidden)
    node.attributes = Object.assign({}, initial.attributes)
    node.setAttribute = function (name, value) {
      node.attributes[name] = String(value)
    }
    node.getAttribute = function (name) {
      return Object.prototype.hasOwnProperty.call(node.attributes, name) ? node.attributes[name] : null
    }
    node.hasAttribute = function (name) {
      return Object.prototype.hasOwnProperty.call(node.attributes, name)
    }
    node.focus = function () {
      document.activeElement = node
    }
    return node
  }

  const canvasTextNode = createNode('CANVAS')
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
  const canvas = canvasTextNode
  canvas.getContext = function () {
    return canvasContext
  }

  const nodes = {
    canvas,
    'game-fallback': createNode('P', { textContent: 'If the canvas cannot render, use the buttons and keyboard shortcuts above.' }),
    'game-instructions': createNode('P', { textContent: 'Use the Start/Pause Game button or P/S to begin, arrows and Space to play, and R to restart.' }),
    'game-live-status': createNode('P', { textContent: '' }),
    'game-restart': createNode('BUTTON', { textContent: 'Restart Game' }),
    'game-start-pause': createNode('BUTTON', { textContent: 'Start/Pause Game' }),
    'game-status': createNode('SECTION'),
    'game-status-message': createNode('P', { textContent: 'Press Start/Pause Game to begin.' }),
    'game-status-score': createNode('SPAN', { textContent: '0' }),
    'game-status-state': createNode('SPAN', { textContent: 'Paused' }),
    'game-status-title': createNode('H3', { textContent: 'Status' }),
    'gameplay-title': createNode('H2', { textContent: 'Play' }),
    'high-scores': createNode('SECTION'),
    'high-scores-list': createNode('OL'),
    'high-scores-title': createNode('H2', { textContent: 'High Scores' }),
    'public-controls': createNode('SECTION'),
    'public-controls-title': createNode('H2', { textContent: 'Controls' })
  }

  const document = createEventTarget()
  document.body = createNode('BODY')
  document.documentElement = createNode('HTML')
  document.activeElement = document.body
  document.getElementById = function (id) {
    return nodes[id] || null
  }
  document.createElement = function (tagName) {
    return createNode(String(tagName || 'div').toUpperCase())
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
      return new context.Game('canvas', 'high-scores-list', devMode)
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

test('numpad digits do not trigger developer fixtures', () => {
  const engine = loadEngine()
  const game = engine.createGame(true)
  const fixtureCalls = []
  game.testCase = function (fixture) {
    fixtureCalls.push(fixture)
  }
  game.createTet = function () {}
  game.tetDownLoop = function () {}

  const numpad = engine.dispatchKey({ key: '5', code: 'Numpad5' })

  assert.equal(numpad.defaultPrevented, false)
  assert.deepEqual(fixtureCalls, [])
})

test('keyboard actions are mapped by name and prevent default only when handled', () => {
  const engine = loadEngine()
  const { game, tet } = activeTetGame(engine)

  const left = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft' })
  assert.equal(left.defaultPrevented, true)
  assert.equal(tet.topLeft.col, 3)

  const keyOnlyRotate = engine.dispatchKey({ key: 'ArrowUp' })
  assert.equal(keyOnlyRotate.defaultPrevented, true)
  assert.equal(tet.rotation, 1)

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

  const modifierBlocked = engine.dispatchKey({ key: 'r', code: 'KeyR', ctrlKey: true })
  assert.equal(modifierBlocked.defaultPrevented, false)
  assert.equal(game.paused, false)
})

test('index.html and main.css expose baseline accessible semantics and reflow hooks', () => {
  assert.match(indexSource, /<meta name="viewport" content="width=device-width, initial-scale=1">/)
  assert.match(indexSource, /id="game-start-pause"/)
  assert.match(indexSource, /id="game-restart"/)
  assert.match(indexSource, /aria-labelledby="gameplay-title game-instructions game-status-title"/)
  assert.match(indexSource, /id="game-live-status" class="sr-only" aria-live="polite" aria-atomic="true"/)
  assert.equal(indexSource.includes('<br>'), false)
  assert.match(stylesSource, /button:focus-visible/)
  assert.match(stylesSource, /#canvas:focus-visible/)
  assert.match(stylesSource, /@media \(max-width: 48rem\)/)
  assert.match(stylesSource, /flex-wrap: wrap/)
  assert.match(stylesSource, /grid-template-columns: minmax\(0, 1fr\) auto/)
})

test('visible controls update status text while the live region stays eventful', () => {
  const engine = loadEngine()
  const game = engine.createGame()
  const startPause = engine.document.getElementById('game-start-pause')
  const restart = engine.document.getElementById('game-restart')
  const state = engine.document.getElementById('game-status-state')
  const score = engine.document.getElementById('game-status-score')
  const message = engine.document.getElementById('game-status-message')
  const live = engine.document.getElementById('game-live-status')

  assert.equal(engine.canvas.tabIndex, 0)
  assert.equal(state.textContent, 'Paused')
  assert.equal(score.textContent, '0')
  assert.equal(message.textContent, 'Press Start/Pause Game to begin or resume.')
  assert.equal(live.textContent, 'Paused. Score 0.')

  game.draw()
  assert.equal(live.textContent, 'Paused. Score 0.')

  startPause.dispatchEvent({ type: 'click' })
  assert.equal(game.paused, false)
  assert.equal(state.textContent, 'Running')
  assert.equal(message.textContent, 'Game running.')
  assert.match(live.textContent, /^Running\. Score 0\.$/)

  game.score = 1200
  game.draw()
  assert.equal(score.textContent, '1,200')
  assert.match(live.textContent, /^Running\. Score 1,200\.$/)

  restart.dispatchEvent({ type: 'click' })
  assert.equal(game.paused, true)
  assert.equal(score.textContent, '0')
  assert.equal(state.textContent, 'Paused')
  assert.equal(message.textContent, 'Press Start/Pause Game to begin or resume.')
})

test('keyboard input ignores editable and unrelated targets', () => {
  const engine = loadEngine()
  const { tet } = activeTetGame(engine)
  const input = { tagName: 'INPUT' }
  const link = { tagName: 'A' }
  const button = engine.document.getElementById('game-start-pause')

  const editable = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', target: input })
  assert.equal(editable.defaultPrevented, false)
  assert.equal(tet.topLeft.col, 4)

  const unrelated = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', target: link })
  assert.equal(unrelated.defaultPrevented, false)
  assert.equal(tet.topLeft.col, 4)

  const buttonTarget = engine.dispatchKey({ key: 'ArrowLeft', code: 'ArrowLeft', target: button })
  assert.equal(buttonTarget.defaultPrevented, false)
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
