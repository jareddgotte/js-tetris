// JSDoc Wiki: http://en.wikipedia.org/wiki/JSDoc
// jsdoc3 tags: http://usejsdoc.org/#JSDoc3_Tag_Dictionary
// JS Data Types: http://www.w3schools.com/js/js_datatypes.asp
// How to express JS data types:
// https://developers.google.com/closure/compiler/docs/js-for-compiler#types

// The collision detection is mostly inspired from the article:
// http://gamedev.tutsplus.com/tutorials/implementation/implementing-tetris-collision-detection/
// (by Michael James Williams on Oct 6th 2012).
// The reason why I did not entirely come up with my own algorithms for
// everything is for the sake of time.

// Most of the standards I used for Tetris came from
// http://en.wikipedia.org/wiki/Tetris

/* Nomenclature:
 *
 * user:       Person playing the game.
 * Tet:        Short for Tetrimino (http://en.wikipedia.org/wiki/Tetrimino), or
 *             the name of our main class. I will try to disambiguate within the
 *             comments when necessary.
 * living Tet: Tet in free fall controlled by user.
 * landed Tet: Tet that has landed and is no longer in control by user.
 */

/**
 * This function creates a Game class intended to be instantiated by
 * "new Game()". Only one Game per page can work separately at the moment.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @class Represents all of the functions which generate and control the game
 *     board.  We use the {@link Tet} class to manipulate our Tets.
 * @param {string} canvasId - This is the id of the canvas element within the
 *     document from which this Game class was created.
 * @param {string} highScoresListId - This is the id of the list for which we
 *     are going to list out the user's past high scores.
 * @param {boolean} [devMode] - This is the option to set the game to be
 *     initially in Developer's Mode.
 * @property {boolean} devModeOn - If this is true, we can do Developer's Only
 *     events.
 * @property {number} BOARD_ROW_NUM - Pseudo-constant set to 16, determined by
 *     Tetris standards set in place before my game was made.
 * @property {number} BOARD_COL_NUM - Pseudo-constant set to 10, determined by
 *     Tetris standards set in place before my game was made.
 * @property {boolean} newTet - If true, we want to create a new Tet.
 * @property {Tet} currentTet - This is the Tet that is falling and controlled
 *     by the user.
 * @property {Tet} nextTet - This is the Tet that is going to come out after our
 *     currentTet lands.
 * @property {boolean} updateLanded - If true, we should update our landed array
 *     to be used in collision detection.
 * @property {Array.<Tet>} allTets - This is the array of all Tets that are in
 *     the game.
 * @property {Array.<Tet>} tetsToRemove - This is the array of all Tets that
 *     need to be removed before being drawn.
 * @property {number} score - This is the score that we're going to use to
 *     display.
 * @property {boolean} updateScore - This is the boolean we check to see if we
 *     should update our high score list or not.
 * @property {Array.<number>|null} highScores - The last usable high-score list,
 *     retained in memory when cookies are unavailable.
 * @property {number} dropInterval - This is the interval, in milliseconds, for
 *     which our currentTet is going to drop 1 block.
 * @property {boolean} gameOver - If this is set to true, we handle the "game
 *     over" events.
 * @property {number} canvasWidth - This is the width that we set. This width
 *     can be adjusted and our game will scale to it.
 * @property {number} blockS - This is the length of the side of each "block" on
 *     the game, in pixels.
 * @property {Element} canvas - This is the DOM element for which we are going
 *     to be drawing on.
 * @property {number} panelHeight - This is the height of the panel which houses
 *     our score, nextTet, and PAUSED/DEV text.
 * @property {Array.<Array.<number>>} landed - This is the array of array of
 *     numbers which we are going to populate with our allTets to be able to
 *     detect Tet collision.
 * @property {string} highScoresListId - This is the name of the high score list
 *     DOM element for which we are going to show our user their past high
 *     scores.
 */
function Game (canvasId, highScoresListId, devMode) {
  // Force only one instantiation
  if (!(this instanceof Game)) {
    return new Game(canvasId, highScoresListId, devMode)
  }

  // Developer Mode (when enabled/true, test cases can be ran via keybinds)
  this.devModeOn = devMode || false

  // Public Vars
  this.BOARD_ROW_NUM = 16 // Tetris standard is to have 10 horizontal blocks by 16 vertical blocks
  this.BOARD_COL_NUM = 10
  this.newTet = true
  this.currentTet = null
  this.nextTet = null
  this.updateLanded = true
  this.allTets = []
  this.tetsToRemove = []
  this.score = 0
  this.updateScore = true
  this.highScores = null

  // private vars
  this.dropInterval = 750 // 750
  this.gameOver = false
  this.canvasWidth = 200
  this.blockS = this.canvasWidth / 10 // Assume block width and height will always be the same
  this.canvas = document.getElementById(canvasId)
  this.canvas.tabIndex = 0
  this.canvas.width = this.canvasWidth
  this.canvas.height = 2 * this.canvasWidth
  this.panelHeight = Math.round((2 - this.BOARD_ROW_NUM / this.BOARD_COL_NUM) *
      this.canvasWidth)
  this.landed = []
  this.paused = true
  this.cascadeLoops = new Set()
  this.highScoresListId = highScoresListId

  // init functions
  this.displayHighScores()
  this.createTet()
  this.handleEvents()
}

/**
 * This method creates event listeners for the window and document. The
 * window listeners pause the game when focus leaves the page and resume it
 * when focus returns. The keyboard listener keeps gameplay input scoped to the
 * game surface or the page body so editable controls and unrelated targets can
 * keep their native browser behavior.
 * @author Jared Gotte <jaredgotte@gmail.com>
 */
Game.prototype.handleEvents = function () {
  const that = this
  let pausedBeforeBlur = true

  window.addEventListener('blur', function () {
    if (that.gameOver === false) {
      pausedBeforeBlur = that.paused
      that.pauseGame()
    }
  })

  window.addEventListener('focus', function () {
    if (!pausedBeforeBlur && that.gameOver === false) {
      that.resumeGame()
    }
  })

  document.addEventListener('keydown', function (e) {
    if (!that.isGameplayTarget(e.target)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (that.handleKeyEvent(e)) {
      e.preventDefault()
    }
  })
}

Game.prototype.isGameplayTarget = function (target) {
  if (!target) return true
  if (target === this.canvas) return true
  if (target === document.body || target === document.documentElement) return true
  return false
}

/**
 * This method clears every currently-scheduled row-clear cascade timer. More
 * than one can be in flight at once when a new Tet lands and clears a row
 * while an earlier cascade is still settling, so every timer id is tracked in
 * `cascadeLoops` rather than a single scalar, and every cleanup path (reset,
 * dev fixtures, game over) must clear the whole set to avoid leaving an
 * orphaned timer able to mutate `allTets` after the session it belongs to has
 * ended.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Game.prototype.clearCascadeLoops = function () {
  this.cascadeLoops.forEach(function (id) {
    clearInterval(id)
  })
  this.cascadeLoops.clear()
}

Game.prototype.pauseGame = function () {
  clearInterval(this.loop)
  this.paused = true
  this.draw()
}

Game.prototype.resumeGame = function () {
  if (this.gameOver === false) {
    this.tetDownLoop()
    this.paused = false
    this.draw()
  }
}

Game.prototype.handleKeyEvent = function (e) {
  const action = this.getKeyboardAction(e)
  if (action === null) return false
  return this.performKeyboardAction(action)
}

Game.prototype.getKeyboardAction = function (e) {
  const key = typeof e.key === 'string' ? e.key : ''
  const code = typeof e.code === 'string' ? e.code : ''
  const normalizedKey = key.toLowerCase()
  const normalizedCode = code.toLowerCase()

  if (key === ' ' || key === 'Spacebar' || code === 'Space') return { name: 'drop' }
  if (normalizedKey === 'arrowup' || normalizedCode === 'arrowup') return { name: 'rotate' }
  if (normalizedKey === 'arrowleft' || normalizedCode === 'arrowleft') return { name: 'left' }
  if (normalizedKey === 'arrowright' || normalizedCode === 'arrowright') return { name: 'right' }
  if (normalizedKey === 'arrowdown' || normalizedCode === 'arrowdown') return { name: 'down' }
  if (normalizedKey === 'p' || normalizedKey === 's' || normalizedCode === 'keyp' || normalizedCode === 'keys') {
    return { name: 'pause' }
  }
  if (normalizedKey === 'r' || normalizedCode === 'keyr') return { name: 'reset' }
  if (code === 'Backquote' || key === '`' || key === '~') return { name: 'toggleDevMode' }
  if (normalizedKey === 'end' || normalizedCode === 'end') return { name: 'devUp' }
  if (normalizedKey === 'g' || normalizedCode === 'keyg') return { name: 'devGameOver' }
  if (normalizedKey === 'h' || normalizedCode === 'keyh') return { name: 'devResetScores' }
  if (/^[0-9]$/.test(normalizedKey) && !normalizedCode.startsWith('numpad')) {
    return { name: 'devFixture', fixture: Number(normalizedKey) }
  }
  if (/^digit[0-9]$/.test(normalizedCode)) return { name: 'devFixture', fixture: Number(code.slice(-1)) }
  return null
}

Game.prototype.performKeyboardAction = function (action) {
  switch (action.name) {
    case 'drop':
      if (this.canTetMove() === true) {
        while (!this.newTet) {
          this.currentTet.moveDown()
        }
        this.draw()
        this.tetDownLoop()
        return true
      }
      return false
    case 'rotate':
      if (this.canTetMove() === true) {
        this.currentTet.rotate()
        this.draw()
        return true
      }
      return false
    case 'left':
      if (this.canTetMove() === true) {
        this.currentTet.moveLeft()
        this.draw()
        return true
      }
      return false
    case 'right':
      if (this.canTetMove() === true) {
        this.currentTet.moveRight()
        this.draw()
        return true
      }
      return false
    case 'down':
      if (this.canTetMove() === true) {
        let skip = false
        if (this.newTet) skip = true
        if (!skip) clearInterval(this.loop)
        this.currentTet.moveDown()
        this.draw()
        if (!skip && !this.paused) this.tetDownLoop()
        return true
      }
      return false
    case 'pause':
      if (this.gameOver === false) {
        if (!this.paused) {
          this.pauseGame()
        } else {
          if (this.gameOver === false) {
            this.tetDownLoop()
            this.dropOnce = false
          }
          this.paused = false
          this.draw()
        }
        return true
      }
      return false
    case 'reset':
      this.allTets = []
      clearInterval(this.loop)
      this.clearCascadeLoops()
      this.currentTet = null
      this.gameOver = false
      this.newTet = true
      this.nextTet = null
      this.paused = true
      this.score = 0
      this.updateScore = true
      this.createTet()
      return true
    case 'devUp':
      if (this.devModeOn) {
        if (this.currentTet.topLeft.row > 0) {
          this.currentTet.topLeft.row--
        }
        this.draw()
        return true
      }
      return false
    case 'devFixture':
      if (this.devModeOn) {
        this.allTets = []
        this.clearCascadeLoops()
        this.gameOver = false
        this.score = 0
        this.updateScore = true
        this.testCase(action.fixture)
        this.createTet()
        this.tetDownLoop()
        return true
      }
      return false
    case 'devGameOver':
      if (this.devModeOn) {
        this.gameOver = true
        clearInterval(this.loop)
        this.clearCascadeLoops()
        // this.score = 1939999955999999 // near max
        this.score = Math.random() * 100000
        this.updateScore = true
        this.draw()
        return true
      }
      return false
    case 'devResetScores':
      if (this.devModeOn) {
        this.setHighScores([0, 0, 0, 0, 0, 0, 0, 0, 0, 0])
        this.displayHighScores()
        this.draw()
        return true
      }
      return false
    case 'toggleDevMode':
      this.devModeOn = !this.devModeOn
      this.draw()
      return true
    default:
      return false
  }
}

/**
 * This method is exclusively used in the handleEvents method. We call it every
 * time we want to check if our Tet can be moved with the
 * space bar and up/right/left/down arrow keys.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {boolean} If the Tet can move, based on the conditions within the
 *     function, then return true.
 */
Game.prototype.canTetMove = function () {
  return ((this.newTet === false && this.paused === false) ||
      this.devModeOn === true) && this.gameOver === false
}

/**
 * This method is used to get a floating point number and separate it with
 * commas. We also round the number to the nearest integer.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {string} This is the comma separated number.
 */
function commaSeparateNumber (number) {
  let tmp = Math.floor(number)
  if (tmp <= 99999999999999) {
    // from http://stackoverflow.com/a/12947816
    while (/(\d+)(\d{3})/.test(tmp.toString())) {
      tmp = tmp.toString().replace(/(\d+)(\d{3})/, '$1' + ',' + '$2')
    }
  } else if (tmp > 999999999999999) {
    tmp = tmp.toExponential(10)
  }
  return tmp
}

/**
 * This method updates the high score list that is displayed on the web page.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Game.prototype.displayHighScores = function () {
  const highScores = this.getHighScores()
  let html = ''
  for (let i = 0, len = highScores.length; i < len; i++) {
    html += '<li>' + commaSeparateNumber(highScores[i]) + '</li>'
  }
  document.getElementById(this.highScoresListId).innerHTML = html
}

/**
 * This method draws everything to the canvas.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Game.prototype.draw = function () {
  // Keys respectively reflect the HTML color code of Tets: I, J, L, O, S, T, Z
  const tetColor = ['#3cc', '#0af', '#f90', '#ee0', '#0c0', '#c0c', '#c00']

  const c = this.canvas.getContext('2d')
  c.clearRect(0, 0, this.canvas.width, 2 * this.canvas.width) // clear canvas

  // Draw top panel
  // paused
  if (this.paused) {
    c.fillStyle = '#f00'
    c.font = '16px Arial'
    c.fillText('PAUSED', 5, 74)
  }
  // score
  c.fillStyle = '#000'
  c.font = '16px Arial'
  c.fillText('Score: ' + commaSeparateNumber(this.score), 4, 17) // 16 numbers max, or 14 with commas. If beyond, switch to scientific notation.
  // next Tet
  c.font = '16px Arial'
  c.fillText('Next:', 35, 50)
  c.beginPath()
  c.moveTo(
    (this.nextTet.topLeft.col + this.nextTet.perimeter[0][0]) * this.blockS,
    (this.nextTet.topLeft.row + this.nextTet.perimeter[0][1]) * this.blockS + 37)
  let row
  let len
  for (row = 1, len = this.nextTet.perimeter.length; row < len; row++) {
    c.lineTo(
      (this.nextTet.topLeft.col + this.nextTet.perimeter[row][0]) * this.blockS,
      (this.nextTet.topLeft.row + this.nextTet.perimeter[row][1]) * this.blockS + 37)
  }
  c.closePath()
  c.lineWidth = 2
  c.fillStyle = tetColor[this.nextTet.type]
  c.fill()
  c.strokeStyle = '#000'
  c.stroke()
  // separator line
  c.beginPath()
  c.moveTo(0, this.panelHeight)
  c.lineTo(this.canvasWidth, this.panelHeight)
  c.lineWidth = 2
  c.strokeStyle = '#eee'
  c.stroke()
  c.beginPath()
  c.moveTo(0, this.panelHeight)
  c.lineTo(4 * this.blockS - 3, this.panelHeight)
  c.lineTo(4 * this.blockS - 3, 2 * this.blockS - 6)
  c.lineTo(2 * 4 * this.blockS + 3, 2 * this.blockS - 6)
  c.lineTo(2 * 4 * this.blockS + 3, this.panelHeight)
  c.lineTo(this.canvasWidth, this.panelHeight)
  c.lineWidth = 2
  c.strokeStyle = '#000'
  c.stroke()
  // dev mode
  if (this.devModeOn) {
    c.fillStyle = '#0a0'
    c.font = '15px Arial'
    c.fillText('DEV', 166, 74)
  }

  // Draw living Tet "shadow" at bottom and rotation
  if (!this.newTet) {
    const tmpPotTopLeft = {
      row: this.currentTet.topLeft.row + 1,
      col: this.currentTet.topLeft.col
    }
    while (!this.currentTet.doesTetCollideBot(tmpPotTopLeft)) {
      tmpPotTopLeft.row++
    }
    tmpPotTopLeft.row--
    c.beginPath()
    c.moveTo(
      (tmpPotTopLeft.col + this.currentTet.perimeter[0][0]) * this.blockS,
      (tmpPotTopLeft.row + this.currentTet.perimeter[0][1]) * this.blockS + this.panelHeight)
    for (row = 1, len = this.currentTet.perimeter.length; row < len; row++) {
      c.lineTo(
        (tmpPotTopLeft.col + this.currentTet.perimeter[row][0]) * this.blockS,
        (tmpPotTopLeft.row + this.currentTet.perimeter[row][1]) * this.blockS + this.panelHeight)
    }
    c.closePath()
    c.lineWidth = 2
    c.fillStyle = '#eee'
    c.fill()
    c.strokeStyle = '#ddd'
    c.stroke()

    // draw pivot shadow
    if (this.currentTet.pivot > 0) {
      const potPerimeter = this.currentTet.doesNotTetPivotCollide()
      if (potPerimeter !== false) {
        c.beginPath()
        c.moveTo(
          (this.currentTet.topLeft.col + potPerimeter[0][0] + this.currentTet.pivot) * this.blockS,
          (this.currentTet.topLeft.row + potPerimeter[0][1]) * this.blockS + this.panelHeight)
        for (row = 1, len = this.currentTet.perimeter.length; row < len; row++) {
          c.lineTo(
            (this.currentTet.topLeft.col + potPerimeter[row][0] + this.currentTet.pivot) * this.blockS,
            (this.currentTet.topLeft.row + potPerimeter[row][1]) * this.blockS + this.panelHeight)
        }
        c.closePath()
        c.lineWidth = 2
        c.globalAlpha = 0.5
        c.fillStyle = '#eee'
        c.fill()
        c.strokeStyle = '#ddd'
        c.stroke()
        c.globalAlpha = 1
      }
    }
  }

  // Draw all Tets
  for (let tet = 0, aTLen = this.allTets.length; tet < aTLen; tet++) {
    const currTet = this.allTets[tet]
    c.beginPath()
    c.moveTo(
      (currTet.topLeft.col + currTet.perimeter[0][0]) * this.blockS,
      (currTet.topLeft.row + currTet.perimeter[0][1]) * this.blockS + this.panelHeight)
    for (row = 1, len = currTet.perimeter.length; row < len; row++) {
      c.lineTo(
        (currTet.topLeft.col + currTet.perimeter[row][0]) * this.blockS,
        (currTet.topLeft.row + currTet.perimeter[row][1]) * this.blockS + this.panelHeight)
    }
    c.closePath()
    c.lineWidth = 2
    c.fillStyle = tetColor[currTet.type]
    c.fill()
    c.strokeStyle = '#000'
    c.stroke()
  }

  // Draw Game Over text if game is over
  if (this.gameOver) {
    // gray tint
    c.globalAlpha = 0.8
    c.fillStyle = '#333'
    c.fillRect(0, 0, this.canvas.width, 2 * this.canvas.width)
    c.globalAlpha = 1
    // game over text
    c.fillStyle = '#f00'
    c.font = 'bold 32px Arial'
    c.fillText('GAME OVER', 3, 180)
    c.strokeStyle = '#000'
    c.lineWidth = 1
    c.strokeText('GAME OVER', 3, 180)
    // your score
    c.fillStyle = '#fff'
    c.font = 'bold 18px Arial'
    c.fillText('Your Score:', 5, 220)
    c.fillStyle = '#f00'
    c.font = 'bold 19px Arial'
    c.fillText(commaSeparateNumber(this.score), 14, 240)
    c.globalAlpha = 0.5
    c.strokeStyle = '#000'
    c.lineWidth = 1
    c.font = 'bold 18px Arial'
    c.strokeText('Your Score:', 5, 220)
    c.font = 'bold 19px Arial'
    c.strokeText(commaSeparateNumber(this.score), 14, 240)
    c.globalAlpha = 1
    // personal highest score
    const highscores = this.checkHighScore()
    c.fillStyle = '#fff'
    c.font = 'bold 17px Arial'
    c.fillText('Personal Highest Score:', 5, 270)
    c.fillStyle = '#f00'
    c.font = 'bold 19px Arial'
    c.fillText(commaSeparateNumber(highscores[0]), 14, 290)
    c.globalAlpha = 0.3
    c.strokeStyle = '#000'
    c.lineWidth = 1
    c.font = 'bold 17px Arial'
    c.strokeText('Personal Highest Score:', 5, 270)
    c.font = 'bold 19px Arial'
    c.strokeText(commaSeparateNumber(highscores[0]), 14, 290)
    c.globalAlpha = 1
    this.displayHighScores()
  }
}

/**
 * This method creates Tets. This also causes the Game Over screen to appear
 * when we cannot create a new Tet.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Game.prototype.createTet = function () {
  // Make sure first Tet is not an S or Z
  if (this.nextTet === null) {
    let t = parseInt(Math.floor(Math.random() * 7))
    if (t === 4 || t === 6) {
      t--
    }
    this.nextTet = new Tet(this, t)
  }
  // Build first Tet and next Tet
  if (this.newTet) {
    this.currentTet = this.nextTet
    this.nextTet = new Tet(this)
  }
  this.newTet = false
  // Display Game Over
  if (this.currentTet.doesTetCollideBot(this.currentTet.topLeft)) {
    this.nextTet = this.currentTet
    this.gameOver = true
    this.newTet = true
    clearInterval(this.loop)
    this.clearCascadeLoops()
    return
  } else this.allTets.push(this.currentTet)
  this.draw()
}

/**
 * This method creates a setInterval loop which moves our currentTet down at
 * each interval.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Game.prototype.tetDownLoop = function () {
  clearInterval(this.loop) // safe guard to prevent multiple loops from spawning before clearing it out first
  const that = this
  this.loop = setInterval(function () {
    if (that.dropOnce && that.newTet) clearInterval(that.loop)
    if (that.newTet) that.createTet()
    else if (!that.paused) that.currentTet.moveDown()
    that.draw()
  }, that.dropInterval)
}

/**
 * This method generates a landed array from allTets to be used to check for
 * Tet/fragment collisions.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Tet} [tet] - This parameter basically excludes the given Tet from
 *     allTets which are used to generate the landed array.
 * @returns {Array.<Array.<number>>} Landed array generated
 */
Game.prototype.getLanded = function (tet) {
  if (tet !== undefined) this.updateLanded = true
  if (this.updateLanded) {
    let i
    for (i = 0; i < this.BOARD_ROW_NUM; i++) {
      this.landed[i] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
    i = 0
    for (let aT = this.allTets, len = aT.length; i < len; i++) {
      if (aT[i] === this.currentTet || aT[i] === tet) continue
      for (let row = 0, rLen = aT[i].shape.length; row < rLen; row++) {
        for (let col = 0, cLen = aT[i].shape[row].length; col < cLen; col++) {
          if (aT[i].shape[row][col] !== 0) {
            this.landed[row + aT[i].topLeft.row][col + aT[i].topLeft.col] = 1
          }
        }
      }
    }
    this.updateLanded = false
  }
  return this.landed
}

/**
 * This method inserts all zeros into the rows of the shape array if they are
 * going to be removed. Once we do this, we call the updateLanded method.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<number>} fullRows - This is the list of all rows that are to
 *     be removed from the Tet shapes.
 */
Game.prototype.alterShapes = function (fullRows) {
  const firstRow = fullRows[0]
  const lastRow = fullRows[fullRows.length - 1]
  for (let tet = 0, len = this.allTets.length; tet < len; tet++) {
    if (this.allTets[tet].topLeft.row <= firstRow - 4 ||
        this.allTets[tet].topLeft.row > lastRow) {
      continue
    }
    this.allTets[tet].alterShape(fullRows)
  }
  // this.tetsToRemove.sort(function(a,b){ return a - b }) // ensures indices are in numeric order
  for (let i = 0, len2 = this.tetsToRemove.length; i < len2; i++) {
    this.allTets.splice(this.tetsToRemove[i] - i, 1)
  }
  this.tetsToRemove = []
  this.updateLanded = true
}

/**
 * This method came from:
 * {@link http://www.w3schools.com/js/js_cookies.asp|W3Schools}. It allows us to
 * use cookies to retrieve the user's info.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {string} cName - This is the name of the cookie we want.
 * @returns {string} This is the string extracted from our cookie.
 */
Game.prototype.getCookie = function (cName) {
  let cValue = document.cookie
  let cStart = cValue.indexOf(' ' + cName + '=')
  if (cStart === -1) cStart = cValue.indexOf(cName + '=')
  if (cStart === -1) cValue = null
  else {
    cStart = cValue.indexOf('=', cStart) + 1
    let cEnd = cValue.indexOf(';', cStart)
    if (cEnd === -1) cEnd = cValue.length
    cValue = unescape(cValue.substring(cStart, cEnd))
  }
  return cValue
}

/**
 * This method came from:
 * {@link http://www.w3schools.com/js/js_cookies.asp|W3Schools}. It allows us to
 * use cookies to store the user's info.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {string} cName - This is the name of the cookie we want.
 * @param {string} value - This is the value of the cookie we want to set.
 * @param {number} exDays - This is the expiration date of the cookie.
 */
Game.prototype.setCookie = function (cName, value, exDays) {
  const exdate = new Date()
  exdate.setDate(exdate.getDate() + exDays)
  const cValue = escape(value) +
      ((exDays === null) ? '' : '; expires=' + exdate.toUTCString())
  document.cookie = cName + '=' + cValue
}

/**
 * This function repairs persisted high scores into the shape used by the game.
 * @param {*} value - The value read from persistence.
 * @returns {Array.<number>} Ten descending finite, non-negative scores.
 */
function normalizeHighScores (value) {
  const scores = Array.isArray(value)
    ? value.filter(function (score) {
      return typeof score === 'number' && Number.isFinite(score) && score >= 0
    })
    : []
  scores.sort(function (a, b) { return b - a })
  scores.splice(10)
  while (scores.length < 10) scores.push(0)
  return scores
}

/**
 * This function checks whether persisted scores already have the normalized
 * shape, without mutating them.
 * @param {*} value - The persisted value.
 * @param {Array.<number>} normalized - Its normalized equivalent.
 * @returns {boolean} Whether the values are semantically unchanged.
 */
function highScoresAreNormalized (value, normalized) {
  if (!Array.isArray(value) || value.length !== normalized.length) return false
  for (let i = 0; i < normalized.length; i++) {
    if (value[i] !== normalized[i]) return false
  }
  return true
}

/**
 * This method gets the user's high scores from their cookie. Invalid or
 * unavailable cookie data falls back to the last usable in-memory list.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {Array.<number>} This is the list of the high scores of the user.
 */
Game.prototype.getHighScores = function () {
  let persisted
  let repair = false
  try {
    const cookie = this.getCookie('highScores')
    if (cookie === null) {
      repair = true
    } else {
      try {
        persisted = JSON.parse(cookie)
      } catch (error) {
        repair = true
      }
    }
  } catch (error) {
    repair = true
  }

  let candidate = persisted
  if (!Array.isArray(candidate)) {
    candidate = this.highScores || []
    repair = true
  }
  const normalized = normalizeHighScores(candidate)
  if (!highScoresAreNormalized(persisted, normalized)) repair = true
  this.highScores = normalized
  if (repair) this.setHighScores(normalized)
  return normalized.slice()
}

/**
 * This method saves the user's high scores into the cookie and retains a usable
 * in-memory copy if cookie writes are unavailable.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<number>} v - This is the list of the high scores we're going
 *     to save in the cookie.
 */
Game.prototype.setHighScores = function (v) {
  const normalized = normalizeHighScores(v)
  this.highScores = normalized
  try {
    this.setCookie('highScores', JSON.stringify(normalized), 365)
  } catch (error) {
    // The in-memory list remains usable when browser cookie writes are blocked.
  }
}

/**
 * This method basically adjusts the user's high scores if they made a higher
 * score than before.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {Array.<number>} This is the list of the high scores of the user.
 */
Game.prototype.checkHighScore = function () {
  const highScores = this.getHighScores()
  if (this.updateScore === true) {
    const hsLen = highScores.length
    if (Number.isFinite(this.score) && this.score >= 0) {
      for (let i = 0; i < hsLen; i++) {
        if (this.score > highScores[i]) {
          highScores.splice(i, 0, this.score)
          break
        }
      }
      if (highScores.length > hsLen) highScores.pop()
    }
    this.setHighScores(highScores)
    this.updateScore = false
  }
  return highScores
}

/**
 * This function creates a Tet class intended to be instantiated by "new Tet()".
 * However, upon completing a row in our Tetris game, we will want to remove the
 * blocks in that row.
 * In the case that our Tet becomes divided during the row removal, we will want
 * to split the whole Tet into multiple Tet fragments which is when we will use
 * "new Tet(-1)", then set its properties manually.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @class Represents a Tet, both living and landed.
 * @param {Game} game - Game object which the Tet will be in
 * @param {number} [type] - Shape of Tet desired, determined randomly if
 *     undefined.
 * @property {Game} game - Game object which the Tet is in
 * @property {number} type - Initially only used to determined its shape upon
 *     our class being constructed. If in range [0..6] (number of Tets), set its
 *     properties appropriately. If -1, we will create a Tet with empty
 *     properties because we're going to set its topLeft, shape and perimeter
 *     manually.
 * @property {number} rotation - Rotation is constrained by the range [0..3].
 *     Incrementing the rotation basically rotates the shape clockwise. This
 *     rotation decides our this.shape and this.perimeter.
 * @property {number} pivot - This is the number of rows we are going to move
 *     our tet when we decide to rotate it. Constraints are from
 *     [0..this.pivotMax].
 * @property {number} pivotMax - This is the maximum amount of times a block can
 *     be pivoted.
 * @property {{row: number, col: number}} topLeft - This is the (row, column)
 *     position the Tet is in with respect to the game board (16 rows by 10
 *     columns); (0, 0) being the most top left position.
 * @property {number} topLeft.row - Row position of Tet on board.
 * @property {number} topLeft.col - Column position of Tet on board.
 * @property {Array.<Array.<number>>} shape - Shape of Tet, e.g.
 *     _shape = [[1,1,1,1]] is horizontal I Tetrimino where [[1],[1],[1],[1]] is
 *     vertical I Tet. Number of 0 indicates empty space.
 * @property {Array.<Array.<number>>} perimeter - Perimeter of Tet, e.g.
 *     _perimeter = [[0,0],[0,1],[4,1],[4,0]] is horizontal I Tet perimeter
 *     where [[0,0],[0,4],[1,4],[1,0]] is vertical I Tet. Imagine Tetriminos
 *     being expressed as 4 "blocks," each block's side would be _s pixels in
 *     magnitude, where _s is the variable blockS defined in index.html.
 *     Therefore, we can determine its perimeter by taking the
 *     "(x, y) coordinates" in each "row" of _perimeter, and multiplying each x
 *     and y value by _s.
 */
function Tet (game, type) {
  if (!(this instanceof Tet)) return new Tet(game, type) // force instantiation
  this.game = game
  if (type >= -1 && type < 7) this.type = type
  else this.type = parseInt(Math.floor(Math.random() * 7))
  if (this.type > -1) {
    this.rotation = 0
    this.pivot = 0
    this.topLeft = { row: 0, col: 4 }
    this.setShape(this.getShapeMatrix(0))
  }
}

/**
 * This method takes in a Tet type and rotation then outputs its shape matrix.
 * This method is only needed on a live Tet. I.e. if a Tet is already placed on
 * the landed array, this method will not be used.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {number} rotation - Rotation of shape, determined by user input.
 * @returns {Array.<Array.<number>>} Number matrix of shape.  If type is
 *     unexpected, return empty array.
 */
Tet.prototype.getShapeMatrix = function (rotation) {
  // Shapes are from: http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
  // The numbers in these arrays denote their eventual color.
  // NOTE: Trailing zeros were removed and replaced by spaces in the following
  // matrices as a gaming optimization (preventing unnecessary loop iterations).
  /* eslint-disable comma-spacing, no-multi-spaces */
  const matrixMatrix = [
    [[[1,1,1,1]],       [[1],[1],[1],[1]]], // I
    [[[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]], [[1],[1,1,1]], [[1,1],[1],[1]]], // J
    [[[1,1,1],[1]], [[1,1],[0,1],[0,1]], [[0,0,1],[1,1,1]], [[1],[1],[1,1]]], // L
    [[[1,1],  [1,1]]], // O
    [[[0,1,1],[1,1]], [[1],[1,1],[0,1]]], // S
    [[[1,1,1],[0,1]], [[0,1],[1,1],[0,1]], [[0,1],[1,1,1]], [[1],[1,1],[1]]], // T
    [[[1,1],[0,1,1]], [[0,1],[1,1],[1]]] // Z
  ]
  /* eslint-enable comma-spacing, no-multi-spaces */
  const m = matrixMatrix[this.type]
  switch (this.type) {
    case 0: // I needs 3 pivots
      this.pivotMax = 3
      break
    case 3: // O needs no pivots
      this.pivotMax = 0
      break
    default: // every other Tet needs 1
      this.pivotMax = 1
  }
  switch (m.length) {
    case 1:
      return m[0]
    case 2:
      return m[rotation % 2]
    case 4:
      return m[rotation]
    default:
      // console.log('unexpected array length in function ' + arguments.callee.toString().substr(9, arguments.callee.toString().indexOf('(') - 9))
      return []
  }
}

/**
 * This method is used any time a living/landed Tet's shape is created/altered.
 * Upon breaking up a tet, make sure these conditions are met on its new shape:
 * 1) Remove trailing zeros from each row, e.g. [1,0] becomes [1];
 * 2) If new shape is one row, remove leading zeros, e.g. [0,1] becomes [1].
 *    Which they are in the Tet.cleanShape() method.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<Array.<number>>} shape - This is the shape of the Tet we care
 *     about getting the perimeter from.
 * @returns {Array.<Array.<number>>} Perimeter of shape.  If shape is unknown,
 *     return empty array.
 */
Tet.prototype.getPerimeter = function (shape) {
  // NOTE: Trailing zeros were removed and replaced by spaces in the following
  // matrices as a gaming optimization (preventing unnecessary loop iterations).
  /* eslint-disable comma-spacing, no-multi-spaces */
  const periMatrix = [
    [[[1]],               [[0,0],[0,1],[1,1],[1,0]]], // fragments
    [[[1,1]],             [[0,0],[0,1],[2,1],[2,0]]],
    [[[1],[1]],           [[0,0],[0,2],[1,2],[1,0]]],
    [[[1,1,1]],           [[0,0],[0,1],[3,1],[3,0]]],
    [[[1],[1],[1]],       [[0,0],[0,3],[1,3],[1,0]]],
    [[[1,1],[0,1]],       [[0,0],[0,1],[1,1],[1,2],[2,2],[2,0]]],
    [[[0,1],[1,1]],       [[1,0],[1,1],[0,1],[0,2],[2,2],[2,0]]],
    [[[1],[1,1]],       [[0,0],[0,2],[2,2],[2,1],[1,1],[1,0]]],
    [[[1,1],[1]],       [[0,0],[0,2],[1,2],[1,1],[2,1],[2,0]]],
    [[[1,1,1,1]],         [[0,0],[0,1],[4,1],[4,0]]], // I
    [[[1],[1],[1],[1]],   [[0,0],[0,4],[1,4],[1,0]]],
    [[[1,1,1],[0,0,1]],   [[0,0],[0,1],[2,1],[2,2],[3,2],[3,0]]], // J
    [[[0,1],[0,1],[1,1]], [[1,0],[1,2],[0,2],[0,3],[2,3],[2,0]]],
    [[[1],[1,1,1]],   [[0,0],[0,2],[3,2],[3,1],[1,1],[1,0]]],
    [[[1,1],[1],[1]], [[0,0],[0,3],[1,3],[1,1],[2,1],[2,0]]],
    [[[1,1,1],[1]],   [[0,0],[0,2],[1,2],[1,1],[3,1],[3,0]]], // L
    [[[1,1],[0,1],[0,1]], [[0,0],[0,1],[1,1],[1,3],[2,3],[2,0]]],
    [[[0,0,1],[1,1,1]],   [[2,0],[2,1],[0,1],[0,2],[3,2],[3,0]]],
    [[[1],[1],[1,1]], [[0,0],[0,3],[2,3],[2,2],[1,2],[1,0]]],
    [[[1,1],[1,1]],       [[0,0],[0,2],[2,2],[2,0]]], // O
    [[[0,1,1],[1,1]],   [[1,0],[1,1],[0,1],[0,2],[2,2],[2,1],[3,1],[3,0]]], // S
    [[[1],[1,1],[0,1]], [[0,0],[0,2],[1,2],[1,3],[2,3],[2,1],[1,1],[1,0]]],
    [[[1,1,1],[0,1]],   [[0,0],[0,1],[1,1],[1,2],[2,2],[2,1],[3,1],[3,0]]], // T
    [[[0,1],[1,1],[0,1]], [[1,0],[1,1],[0,1],[0,2],[1,2],[1,3],[2,3],[2,0]]],
    [[[0,1],[1,1,1]],   [[1,0],[1,1],[0,1],[0,2],[3,2],[3,1],[2,1],[2,0]]],
    [[[1],[1,1],[1]], [[0,0],[0,3],[1,3],[1,2],[2,2],[2,1],[1,1],[1,0]]],
    [[[1,1],[0,1,1]],   [[0,0],[0,1],[1,1],[1,2],[3,2],[3,1],[2,1],[2,0]]], // Z
    [[[0,1],[1,1],[1]], [[1,0],[1,1],[0,1],[0,3],[1,3],[1,2],[2,2],[2,0]]]
  ]
  /* eslint-enable comma-spacing, no-multi-spaces */
  let checkNextShape
  // Iterate through periMatrix to see if the given shape matches a shape within
  // this array
  for (let pRow = 0, pLen = periMatrix.length; pRow < pLen; pRow++) {
    checkNextShape = false
    for (let row = 0, rLen = shape.length; row < rLen; row++) {
      if (rLen !== periMatrix[pRow][0].length) {
        checkNextShape = true
        break
      }
      if (checkNextShape) break
      for (let col = 0, cLen = shape[row].length; col < cLen; col++) {
        if (shape[row].length !== periMatrix[pRow][0][row].length) {
          checkNextShape = true
          break
        }
        if (shape[row][col] === periMatrix[pRow][0][row][col]) {
          continue
        }
        checkNextShape = true
        break
      }
    }
    if (!checkNextShape) {
      // if it gets to this point, we found our point array
      return periMatrix[pRow][1]
    }
  }
  return []
}

/**
 * This method actually sets the shape and perimeter of the Tet that's executing
 * this method.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<Array.<number>>} shape - This is the shape of the Tet we care
 *     about getting the perimeter from.
 */
Tet.prototype.setShape = function (shape) {
  this.shape = shape
  this.perimeter = this.getPerimeter(shape)
}

/**
 * This method changes the rotation, if the shape can rotate properly on the
 * game board, and changes the shape and perimeter if it successfully rotates.
 * Otherwise, do nothing. We also move the Tet this.pivot blocks to the right,
 * then reset the pivot to zero.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<Array.<number>>} shape - This is the shape of the Tet we care
 *     about getting the perimeter from.
 * @returns {boolean} Currently, we don't care about the actual return value.
 */
Tet.prototype.rotate = function () { // by default, always clockwise
  const landed = this.game.getLanded()
  let potRot = this.rotation
  potRot = (potRot < 3 ? potRot + 1 : 0)
  const potShape = this.getShapeMatrix(potRot)
  // check for potential collisions at the column the Tet will actually end up
  // in once the pivot shift below is applied
  const potCol = this.topLeft.col + this.pivot
  for (let row = 0, rLen = potShape.length; row < rLen; row++) {
    for (let col = 0, cLen = potShape[row].length; col < cLen; col++) {
      if (potShape[row][col] !== 0) {
        if (col + potCol < 0) {
          // console.log('left beyond playing field')
          return false
        }
        if (col + potCol >= this.game.BOARD_COL_NUM) {
          // console.log('right beyond playing field')
          return false
        }
        if (row + this.topLeft.row >= this.game.BOARD_ROW_NUM) {
          // console.log('below playing field')
          return false
        }
        if (landed[row + this.topLeft.row][col + potCol] !== 0) {
          // console.log('rotate: space is taken')
          return false
        }
      }
    }
  }
  this.topLeft.col += this.pivot
  this.pivot = 0
  this.rotation = potRot
  this.setShape(potShape)
  return true
}

/**
 * This method checks to see if the pivot shape shadow can display properly.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {Array.<Array.<number>>} This returns the perimeter matrix given by
 *     the getPerimeter() method.
 */
Tet.prototype.doesNotTetPivotCollide = function () {
  let potRot = this.rotation
  const potentialTopLeft = {
    row: this.topLeft.row,
    col: this.topLeft.col + this.pivot
  }
  const landed = this.game.getLanded(this)
  potRot = potRot < 3 ? potRot + 1 : 0
  const potShape = this.getShapeMatrix(potRot)
  for (let row = 0, rLen = potShape.length; row < rLen; row++) {
    for (let col = 0, cLen = potShape[row].length; col < cLen; col++) {
      if (potShape[row][col] !== 0) {
        if (row + potentialTopLeft.row >= this.game.BOARD_ROW_NUM) {
          // console.log('below playing field')
          return false
        }
        if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
          // console.log('bot: space taken')
          return false
        }
        if (col + potentialTopLeft.col < 0) {
          // console.log('left beyond playing field')
          return false
        }
        if (col + potentialTopLeft.col >= this.game.BOARD_COL_NUM) {
          // console.log('right beyond playing field')
          return false
        }
        if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
          // console.log('side: space taken')
          return false
        }
      }
    }
  }
  return this.getPerimeter(potShape)
}

/**
 * This method checks to see if a Tet will collide with the bottom of the game
 * board or another Tet.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {{row: number, col: number}} potentialTopLeft - This object contains a
 *     potential row and column which we use to check to see if the Tet will
 *     collide if it moves to the coordinate specified by this param.
 * @returns {boolean} If Tet colides, return true; else, false.
 */
Tet.prototype.doesTetCollideBot = function (potentialTopLeft) {
  const landed = this.game.getLanded(this)
  for (let row = 0, rLen = this.shape.length; row < rLen; row++) {
    for (let col = 0, cLen = this.shape[row].length; col < cLen; col++) {
      if (this.shape[row][col] !== 0) {
        if (row + potentialTopLeft.row >= this.game.BOARD_ROW_NUM) {
          // console.log('below playing field')
          return true
        }
        if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
          // console.log('bot: space taken')
          return true
        }
      }
    }
  }
  return false
}

/**
 * This method checks to see if a Tet will collide with the side of the game
 * board or another Tet. If it collides on the right side of the Tet, we'll
 * adjust the pivot as necessary.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {{row: number, col: number}} potentialTopLeft - This object contains a
 *     potential row and column which we use to check to see if the Tet will
 *     collide if it moves to the coordinate specified by this param.
 * @param {number} [direction] - If value is 1, we are testing the right side
 *     and we're going to adjust the pivot.
 * @returns {boolean} If Tet colides, return true; else, false.
 */
Tet.prototype.doesTetCollideSide = function (potentialTopLeft, direction) {
  const landed = this.game.getLanded()
  for (let row = 0, rLen = this.shape.length; row < rLen; row++) {
    for (let col = 0, cLen = this.shape[row].length; col < cLen; col++) {
      if (this.shape[row][col] !== 0) {
        if (col + potentialTopLeft.col < 0) {
          // console.log('left beyond playing field');
          return true
        }
        if (col + potentialTopLeft.col >= this.game.BOARD_COL_NUM) {
          // console.log('right beyond playing field');
          if (this.pivot < this.pivotMax && this.rotation % 2 === 0) {
            this.pivot++
          }
          return true
        }
        if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
          // console.log('side: space taken');
          if (direction === 1 &&
              (this.pivot < this.pivotMax && this.rotation % 2 === 0)) {
            this.pivot++
          }
          return true
        }
      }
    }
  }
  return false
}

/**
 * This method moves the Tet left by 1 column if it does not collide with the
 * side of the game board or another Tet. This method also resets the pivot to
 * zero.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Tet.prototype.moveLeft = function () {
  this.pivot = 0
  const potentialTopLeft = {
    row: this.topLeft.row,
    col: this.topLeft.col - 1
  }
  if (!this.doesTetCollideSide(potentialTopLeft)) {
    this.topLeft = potentialTopLeft
  }
}

/**
 * This method moves the Tet right by 1 column if it does not collide with the
 * side of the game board or another Tet.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Tet.prototype.moveRight = function () {
  const potentialTopLeft = {
    row: this.topLeft.row,
    col: this.topLeft.col + 1
  }
  if (!this.doesTetCollideSide(potentialTopLeft, 1)) {
    this.topLeft = potentialTopLeft
  }
}

/**
 * This method moves the Tet down by 1 column if it does not collide with the
 * side of the game board or another Tet. If it does collide, the Tet lands, we
 * create another Tet, and we perform the collided method to handle row
 * elimination and Tet fragmentation.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Tet.prototype.moveDown = function () {
  const potentialTopLeft = {
    row: this.topLeft.row + 1,
    col: this.topLeft.col
  }
  if (!this.doesTetCollideBot(potentialTopLeft)) {
    this.topLeft = potentialTopLeft
  } else {
    this.game.newTet = true
    this.game.currentTet = null
    this.game.updateLanded = true
    this.collided()
  }
}

/**
 * This method handles row elimination and Tet fragmentation. We also adjust the
 * score depending on how many rows get eliminated. The score scales with how
 * many rows get eliminated at once by the following formula:
 * `score += Math.pow(rows_eliminated, 1 + (rows_eliminated - 1) * 0.1) * 10000`
 * We then perform the falling animations on the Tets affected by "gravity."
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Tet.prototype.collided = function () {
  const landed = this.game.getLanded()
  let isFilled
  const fullRows = []
  // Find the rows we're going to eliminate
  for (let row = this.topLeft.row; row < this.game.BOARD_ROW_NUM; row++) {
    isFilled = true
    for (let col = 0; col < this.game.BOARD_COL_NUM; col++) {
      if (landed[row][col] === 0) {
        isFilled = false
      }
    }
    if (isFilled) fullRows.push(row)
  }
  this.game.updateLanded = true
  const fRLen = fullRows.length
  if (fRLen === 0) return
  // Adjust score (Scale the point rewarded for filling rows to benefit those
  // that break more at one time.)
  this.game.score += Math.pow(fRLen, 1 + (fRLen - 1) * 0.1) * 10000
  // Alter the shapes
  this.game.alterShapes(fullRows)
  this.game.updateLanded = true
  // Perform falling animations
  const that = this
  let movingTets = [0]
  let tetsMoved
  const cascadeLoop = setInterval(function () {
    if (that.game.paused) return // freeze cascade motion while paused or backgrounded; resumes on the next unpaused tick
    movingTets = []
    tetsMoved = true
    while (tetsMoved) {
      tetsMoved = false
      for (let tet = 0, aT = that.game.allTets, tLen = aT.length, potTL = null;
        tet < tLen; tet++) {
        if (movingTets.indexOf(aT[tet], 0) > -1 ||
            (aT[tet] === that.game.currentTet && that.game.newTet !== true)) {
          continue
        }
        potTL = {
          row: aT[tet].topLeft.row + 1,
          col: aT[tet].topLeft.col
        }
        if (!aT[tet].doesTetCollideBot(potTL)) {
          aT[tet].topLeft = potTL
          movingTets.push(aT[tet])
          tetsMoved = true
        }
      }
      that.game.updateLanded = true
    }
    that.game.draw()
    if (movingTets.length === 0) {
      clearInterval(cascadeLoop)
      that.game.cascadeLoops.delete(cascadeLoop)
      that.collided()
    }
  }, 200)
  that.game.cascadeLoops.add(cascadeLoop)
}

/**
 * This method cleans up a Tet or Tet fragment, after being affected the by
 * collided method which affects the shape of Tets located in the rows being
 * eliminated. By cleaning, we mean removing extraneous zeros from their shape
 * matrix as well as adjusting their topLeft property. We clean them so that we
 * can match its shape against a known Tet/fragment so we can determine its
 * perimeter.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {{shape: Array.<Array.<number>>, topLeft: {row: number, col: number}}} o - This
 *     is a object which holds a shape and a topLeft property.
 * @returns {{shape: Array.<Array.<number>>, topLeft: {row: number, col: number}}} This
 *     is the cleaned up shape, without extraneous zeros, and adjusted topLeft.
 */
Tet.prototype.cleanShape = function (o) {
  const shape = o.shape
  const topLeft = o.topLeft
  let done = false
  // If there exists columns of all zeros on the far left, remove all those
  // columns
  let row
  let len
  while (true) {
    for (row = 0, len = shape.length; row < len; row++) {
      if (shape[row][0] > 0) {
        done = true
        break
      }
    }
    if (done) break
    for (row = 0, len = shape.length; row < len; row++) {
      shape[row].splice(0, 1)
    }
    // Adjust topLeft if necessary
    topLeft.col += 1
  }
  // If there exists zeros at the end of each row array, remove those zeros
  for (row = 0, len = shape.length; row < len; row++) {
    for (let col = shape[row].length - 1; col >= 0; col--) {
      if (shape[row][col] === 0) {
        shape[row].splice(col, 1)
        continue
      }
      break
    }
  }
  return { shape, topLeft }
}

/**
 * This method checks to see if itself, an array, is all zeros.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @returns {boolean} If itself is all zeros, return true; else, false.
 */
function arrayIsAllZeros (arr) {
  for (let col = 0, len = arr.length; col < len; col++) {
    if (arr[col] > 0) return false
  }
  return true
}

/**
 * This method parses its own shape to determine if it needs to fragment or not.
 * If it becomes fragmented, we instantiate a new Tet class to add in its
 * fragmented part.
 * @author Jared Gotte <jareddgotte@gmail.com>
 */
Tet.prototype.updateTet = function () {
  let currShape = []
  let topLeft
  const q = []
  // Iterate through the altered shape to build multiple fragments if necessary
  for (let row = 0, len = this.shape.length; row < len; row++) {
    // If we do not come across a row with all zeros, continue building our shape
    if (!arrayIsAllZeros(this.shape[row])) {
      if (currShape.length === 0) {
        topLeft = { row: this.topLeft.row + row, col: this.topLeft.col }
      }
      currShape.push(this.shape[row])
    // Otherwise, push this current shape only the queue and reset our temporary
    // shape to potentially build another
    } else {
      if (currShape.length === 0) continue
      q.push({ shape: currShape, topLeft })
      currShape = []
    }
  }
  if (currShape.length > 0) q.push({ shape: currShape, topLeft })
  if (q.length === 0) {
    // Remove this Tet from allTets if shape is a zero'd matrix (Tet completely gone)
    this.game.tetsToRemove.push(this.game.allTets.indexOf(this))
  }
  // Iterate through our queue
  for (let qs = 0, len2 = q.length; qs < len2; qs++) {
    const tmp = this.cleanShape(q[qs])
    // For the first object in the queue, keep our current Tet and just set the shape
    if (qs === 0) {
      this.topLeft = tmp.topLeft
      this.setShape(tmp.shape)
    // For all other objects in the queue, create a new Tet class and set its
    // shape, then push this new Tet onto the allTets Game class property
    } else {
      const newTet = new Tet(this.game, -1)
      newTet.type = this.type
      newTet.topLeft = tmp.topLeft
      newTet.setShape(tmp.shape)
      this.game.allTets.push(newTet)
    }
  }
}

/**
 * This method sets each row within its shape to zero for each row marked as
 * full.
 * @author Jared Gotte <jareddgotte@gmail.com>
 * @param {Array.<number>} fullRows - This is an array of all of the rows that
 *     were marked as full in the collided method above.
 */
Tet.prototype.alterShape = function (fullRows) {
  let row
  for (let i = 0, len = fullRows.length; i < len; i++) {
    row = fullRows[i] - this.topLeft.row
    if (row < 0 || row > this.shape.length - 1) {
      continue
    }
    for (let col = 0, cLen = this.shape[row].length; col < cLen; col++) {
      this.shape[row][col] = 0
    }
  }
  this.updateTet()
}
