// JSDoc Wiki: http://en.wikipedia.org/wiki/JSDoc
// jsdoc-toolkit references: http://code.google.com/p/jsdoc-toolkit/wiki/TagReference
// JS Data Types: http://www.w3schools.com/js/js_datatypes.asp
// JS Try Catch Throw Errors Tut: http://www.w3schools.com/js/js_errors.asp

// The collision detection is mostly inspired from the article: http://gamedev.tutsplus.com/tutorials/implementation/implementing-tetris-collision-detection/ (by Michael James Williams on Oct 6th 2012)
// The reason why I did not entirely come up with my own algorithms for everything is for the sake of time

// Most of the standards I used for Tetris came from http://en.wikipedia.org/wiki/Tetris

/* Nomenclature:
 *
 * user:        Person playing the game.
 * Tet:         Short for Tetrimino (http://en.wikipedia.org/wiki/Tetrimino), or the name of our main class.  I will try to disambiguate within the comments when necessary.
 * living Tet:  Tet in free fall controlled by user.
 * landed Tet:  Tet that has landed and is no longer in control by user.
 */

function Game (canvas_id) {
	if (!(this instanceof arguments.callee)) return new Game(canvas_id); // force instantiation
	
	// Developer's Mode
	this.devModeOn = false;
	
	// public vars
	this.BOARD_ROW_NUM = 16; // Tetris standard is to have 10 horizontal blocks by 16 vertical blocks
	this.BOARD_COL_NUM = 10;
	this.newTet = true;
	this.currentTet = null;
	this.nextTet = null;
	this.updateLanded = true;
	this.allTets = [];
	this.tetsToRemove = [];
	this.score = 0;

	// private vars
	this.dropInterval = 750; // 750
	this.gameOver = false;
	this.canvasWidth = 200;
	this.blockS = this.canvasWidth / 10; // Assume block width and height will always be the same
	this.canvas = document.getElementById(canvas_id);
	this.canvas.width = this.canvasWidth;
	this.canvas.height = 2 * this.canvasWidth;
	this.panelHeight = Math.round((2 - this.BOARD_ROW_NUM / this.BOARD_COL_NUM) * this.canvasWidth);
	this.landed = [];
	this.paused = false;

	// init functions
	this.createTet();
	this.tetDownLoop();
	this.handleDocumentEvents(this);
}
Game.prototype.handleDocumentEvents = function (that) {
	// Handle page visibility change
	// From https://developer.mozilla.org/en-US/docs/Web/Guide/User_experience/Using_the_Page_Visibility_API?redirectlocale=en-US&redirectslug=DOM%2FUsing_the_Page_Visibility_API
	var hidden, visibilityChange;
	if (typeof document.hidden !== "undefined") { // Opera 12.10 and Firefox 18 and later support
		hidden = "hidden";
		visibilityChange = "visibilitychange";
	} else if (typeof document.mozHidden !== "undefined") {
		hidden = "mozHidden";
		visibilityChange = "mozvisibilitychange";
	} else if (typeof document.msHidden !== "undefined") {
		hidden = "msHidden";
		visibilityChange = "msvisibilitychange";
	} else if (typeof document.webkitHidden !== "undefined") {
		hidden = "webkitHidden";
		visibilityChange = "webkitvisibilitychange";
	}
	function handleVisibilityChange() {
		if (document[hidden]) {
			clearInterval(that.loop);
			that.paused = true;
			that.draw();
		} else {
			if (!that.gameOver) {
				that.tetDownLoop();
				that.dropOnce = false;
			}
			that.paused = false;
			that.draw();
		}
	}
	document.addEventListener(visibilityChange, handleVisibilityChange, false);
	
	// Handle key events
	document.onkeydown = function(e) { // http://www.javascripter.net/faq/keycodes.htm for keycodes
		switch (e.keyCode) {
			case 32: //console.log('dropping');
				if (!that.newTet && !that.paused) {
					while (!that.newTet) {
						that.currentTet.moveDown();
					}
					that.draw();
					that.tetDownLoop();
				}
				break;
			case 38: //console.log('rotating');
				if (!that.newTet && !that.paused) {
					that.currentTet.rotate();
					that.draw();
				}
				break;
			case 37: //console.log('moving left');
				if (!that.newTet && !that.paused) {
					that.currentTet.moveLeft();
					that.draw();
				}
				break;
			case 39: //console.log('moving right');
				if (!that.newTet && !that.paused) {
					that.currentTet.moveRight();
					that.draw();
				}
				break;
			case 40: //console.log('moving down');
				if (!that.newTet && !that.paused) {
					var skip = false;
					if (that.newTet) skip = true;
					if (!skip) clearInterval(that.loop);
					that.currentTet.moveDown();
					that.draw();
					if (!skip) that.tetDownLoop();
				}
				break;
			case 80: case 83: // p for pause, s for stop (they do same thing)
				if (!that.paused) { 
					clearInterval(that.loop);
					that.paused = true;
					that.draw();
				}
				else {
					if (!that.gameOver) {
						that.tetDownLoop();
						that.dropOnce = false;
					}
					that.paused = false;
					that.draw();
				}
				break;
			case 82: // r for reset
				that.allTets = [];
				that.currentTet = null;
				that.gameOver = false;
				that.newTet = true;
				that.nextTet = null;
				that.paused = false;
				that.score = 0;
				that.createTet();
				that.tetDownLoop();
				break;
			// Developer's Controls
			case 48: case 49: case 50: case 51: case 52: // test cases found in TestCase.js
			case 53: case 54: case 55: case 56: case 57: // number keys 0 to 9 (not numpad)
				if (that.devModeOn) {
					that.allTets = [];
					that.gameOver = false;
					that.score = 0;
					that.testCase(e.keyCode - 48);
					that.createTet();
					that.tetDownLoop();
				}
				break;
			case 71: // g for game over
				if (that.devModeOn) {
					that.gameOver = true;
					clearInterval(that.loop);
					//that.score = 1939999955999999;
					that.score = 10000;
					that.draw();
				}
				break;
			case 72: // h to reset high score to zero
				if (that.devModeOn) {
					that.setHighScore("highScore", 0, 365);
					that.draw();
				}
				break;
			default:
				console.log('unrecognized key: ' + e.keyCode);
		}
	}
}
Number.prototype.commaSeparate = function () { // comma separate number
	var tmp = Math.floor(this);
	if (tmp <= 99999999999999) {
		while (/(\d+)(\d{3})/.test(tmp.toString())) // from http://stackoverflow.com/a/12947816
			tmp = tmp.toString().replace(/(\d+)(\d{3})/, '$1' + ','+'$2');
	}
	else if (tmp > 999999999999999) tmp = tmp.toExponential(10);
	return tmp;
}
Game.prototype.draw = function () {
	// Keys respectively reflect the HTML color code of Tets: I, J, L, O, S, T, Z
	var tetColor = ['#3cc','#0af','#f90','#ee0','#0c0','#c0c','#c00'];

	var c = this.canvas.getContext('2d');
	c.clearRect(0, 0, this.canvas.width, 2 * this.canvas.width); // clear canvas
	
	// Draw top panel
	// paused
	if (this.paused) {
		c.fillStyle = '#f00';
		c.font = "16px Arial";
		c.fillText("PAUSED", 5, 74);
	}
	// score
	c.fillStyle = '#000';
	c.font = "16px Arial";
	c.fillText("Score: " + this.score.commaSeparate(), 4, 17); // 16 numbers max, or 14 with commas.  If beyond, switch to scientific notation.
	// next Tet
	c.font = "16px Arial";
	c.fillText("Next:", 35, 50);
	c.beginPath();
	c.moveTo((this.nextTet.topLeft.col + this.nextTet.perimeter[0][0]) * this.blockS, (this.nextTet.topLeft.row + this.nextTet.perimeter[0][1]) * this.blockS + 37);
	for (var row = 1, len = this.nextTet.perimeter.length;  row < len;  row++) {
		c.lineTo((this.nextTet.topLeft.col + this.nextTet.perimeter[row][0]) * this.blockS, (this.nextTet.topLeft.row + this.nextTet.perimeter[row][1]) * this.blockS + 37);
	}
	c.closePath();
	c.lineWidth = 2;
	c.fillStyle = tetColor[this.nextTet.type];
	c.fill();
	c.strokeStyle = "#000";
	c.stroke();
	// separator line
	c.beginPath();
	c.moveTo(0, this.panelHeight);
	c.lineTo(this.canvasWidth, this.panelHeight);
	c.lineWidth = 2;
	c.strokeStyle = "#eee";
	c.stroke();
	c.beginPath();
	c.moveTo(0, this.panelHeight);
	c.lineTo(4 * this.blockS - 3, this.panelHeight);
	c.lineTo(4 * this.blockS - 3, 2 * this.blockS - 6);
	c.lineTo(2 * 4 * this.blockS + 3, 2 * this.blockS - 6);
	c.lineTo(2 * 4 * this.blockS + 3, this.panelHeight);
	c.lineTo(this.canvasWidth, this.panelHeight);
	c.lineWidth = 2;
	c.strokeStyle = "#000";
	c.stroke();
	
	// Draw living Tet "shadow"
	if (!this.newTet) {
		var tmpPotTopLeft = { row: this.currentTet.topLeft.row + 1, col: this.currentTet.topLeft.col };
		while (!this.currentTet.doesTetCollideBot(tmpPotTopLeft)) {
			tmpPotTopLeft.row++;
		}
		tmpPotTopLeft.row--;
		c.beginPath();
		c.moveTo((tmpPotTopLeft.col + this.currentTet.perimeter[0][0]) * this.blockS, (tmpPotTopLeft.row + this.currentTet.perimeter[0][1]) * this.blockS + this.panelHeight);
		for (var row = 1, len = this.currentTet.perimeter.length;  row < len;  row++) {
			c.lineTo((tmpPotTopLeft.col + this.currentTet.perimeter[row][0]) * this.blockS, (tmpPotTopLeft.row + this.currentTet.perimeter[row][1]) * this.blockS + this.panelHeight);
		}
		c.closePath();
		c.lineWidth = 2;
		c.fillStyle = '#eee';
		c.fill();
		c.strokeStyle = "#ddd";
		c.stroke();
	}
	
	// Draw all Tets
	for (var tet = 0, aTLen = this.allTets.length;  tet < aTLen;  tet++) {
		var currTet = this.allTets[tet];
		c.beginPath();
		c.moveTo((currTet.topLeft.col + currTet.perimeter[0][0]) * this.blockS, (currTet.topLeft.row + currTet.perimeter[0][1]) * this.blockS + this.panelHeight);
		for (var row = 1, len = currTet.perimeter.length;  row < len;  row++) {
			c.lineTo((currTet.topLeft.col + currTet.perimeter[row][0]) * this.blockS, (currTet.topLeft.row + currTet.perimeter[row][1]) * this.blockS + this.panelHeight);
		}
		c.closePath();
		c.lineWidth = 2;
		c.fillStyle = tetColor[currTet.type];
		c.fill();
		c.strokeStyle = "#000";
		c.stroke();
	}
	
	// Draw Game Over text if game is over
	if (this.gameOver) {
		// gray tint
		c.globalAlpha = 0.8;
		c.fillStyle = "#333";
		c.fillRect(0, 0, this.canvas.width, 2 * this.canvas.width);
		c.globalAlpha = 1;
		// game over text
		c.fillStyle = '#f00'; c.font = "bold 32px Arial";
		c.fillText("GAME OVER", 3, 180);
		c.strokeStyle = '#000'; c.lineWidth = 1;
		c.strokeText("GAME OVER", 3, 180);
		// your score
		c.fillStyle = '#fff'; c.font = "bold 18px Arial";
		c.fillText("Your Score:", 5, 220);
		c.fillStyle = '#f00'; c.font = "bold 19px Arial";
		c.fillText(this.score.commaSeparate(), 14, 240);
		c.globalAlpha = 0.5;
		c.strokeStyle = '#000'; c.lineWidth = 1; c.font = "bold 18px Arial";
		c.strokeText("Your Score:", 5, 220);
		c.font = "bold 19px Arial";
		c.strokeText(this.score.commaSeparate(), 14, 240);
		c.globalAlpha = 1;
		// personal highest score
		c.fillStyle = '#fff'; c.font = "bold 17px Arial";
		c.fillText("Personal Highest Score:", 5, 270);
		c.fillStyle = '#f00'; c.font = "bold 19px Arial";
		c.fillText(this.checkHighScore().commaSeparate(), 14, 290);
		c.globalAlpha = 0.3;
		c.strokeStyle = '#000'; c.lineWidth = 1; c.font = "bold 17px Arial";
		c.strokeText("Personal Highest Score:", 5, 270);
		c.font = "bold 19px Arial";
		c.strokeText(this.checkHighScore().commaSeparate(), 14, 290);
		c.globalAlpha = 1;
	}
}
Game.prototype.createTet = function () {
	if (this.nextTet === null) this.nextTet = new Tet(this);
	if (this.newTet) {
		this.currentTet = this.nextTet;
		this.nextTet = new Tet(this);
	}
	this.newTet = false;
	// Display Game Over
	if (this.currentTet.doesTetCollideBot(this.currentTet.topLeft)) {
		this.nextTet = this.currentTet;
		this.gameOver = true;
		this.newTet = true;
		clearInterval(this.loop);
		return;
	}
	else this.allTets.push(this.currentTet);
	this.draw();
}
Game.prototype.tetDownLoop = function () {
	clearInterval(this.loop); // safe guard to prevent multiple loops from spawning before clearing it out first
	var that = this;
	this.loop = setInterval(function(){
		if (that.dropOnce && that.newTet) clearInterval(that.loop);
		if (that.newTet) that.createTet();
		else that.currentTet.moveDown();
		that.draw();
	}, that.dropInterval);
}
Game.prototype.getLanded = function (tet) {
	if (tet !== undefined) this.updateLanded = true;
	if (this.updateLanded) {
		for (var i = 0; i < this.BOARD_ROW_NUM; i++) {
			this.landed[i] = [0,0,0,0,0,0,0,0,0,0];
		}
		for (var i = 0, aT = this.allTets, len = aT.length;  i < len;  i++) {
			if (aT[i] === this.currentTet || aT[i] === tet) continue;
			for (var row = 0, rLen = aT[i].shape.length;  row < rLen;  row++) {
				for (var col = 0, cLen = aT[i].shape[row].length;  col < cLen;  col++) {
					if (aT[i].shape[row][col] !== 0) {
						this.landed[row + aT[i].topLeft.row][col + aT[i].topLeft.col] = 1;
					}
				}
			}
		}
		this.updateLanded = false;
	}
	return this.landed;
}
Game.prototype.alterShapes = function (fullRows) {
	var firstRow = fullRows[0], lastRow = fullRows[fullRows.length - 1];
	//console.log(this.allTets);
	for (var tet = 0, len = this.allTets.length;  tet < len;  tet++) {
		if (this.allTets[tet].topLeft.row <= firstRow - 4 || this.allTets[tet].topLeft.row > lastRow) continue;
		this.allTets[tet].alterShape(fullRows);
	}
	//this.tetsToRemove.sort(function(a,b){ return a - b }); // ensures indices are in numeric order
	//console.log(this.tetsToRemove);
	for (var i = 0, len = this.tetsToRemove.length;  i < len;  i++) {
		//console.log(this.allTets[this.tetsToRemove[i] - i]);
		this.allTets.splice(this.tetsToRemove[i] - i, 1);
	}
	this.tetsToRemove = [];
	this.updateLanded = true;
}
Game.prototype.getHighScore = function (c_name) {
	// from http://www.w3schools.com/js/js_cookies.asp
	var c_value = document.cookie, c_start = c_value.indexOf(" " + c_name + "=");
	if (c_start === -1) c_start = c_value.indexOf(c_name + "=");
	if (c_start === -1) c_value = null;
	else {
		c_start = c_value.indexOf("=", c_start) + 1;
		var c_end = c_value.indexOf(";", c_start);
		if (c_end === -1) c_end = c_value.length;
		c_value = unescape(c_value.substring(c_start, c_end));
	}
	return c_value;
}
Game.prototype.setHighScore = function (c_name, value, exdays) {
	// from http://www.w3schools.com/js/js_cookies.asp
	var exdate = new Date(), c_value;
	exdate.setDate(exdate.getDate() + exdays);
	c_value = escape(value) + ((exdays === null) ? "" : "; expires=" + exdate.toUTCString());
	document.cookie = c_name + "=" + c_value;
}
Game.prototype.checkHighScore = function () {
	var score = this.getHighScore("highScore");
	if (score === null || this.score > score) {
		this.setHighScore("highScore", this.score, 365);
	}
	return Math.max(score, this.score);
}

/**
 * This function creates a Tet class intended to be instantiated by "new Tet()".
 * However, upon completing a row in our Tetris game, we will want to remove the blocks in that row.  In the case that our Tet becomes divided during the row removal, we will want to split the whole Tet into multiple Tet fragments which is when we will use "new Tet(-1)", then set its properties manually.
 *
 * @author Jared Gotte
 * @class Represents a Tet, both living and landed.
 * @param {Number} [type] Shape of Tet desired, determined randomly if undefined.
 * @property {Number} type Initially only used to determined its shape upon our class being constructed.  If in range [0..6] (number of Tets), set its properties appropriately.  If -1, we will create a Tet with empty properties because we're going to set its topLeft, shape and perimeter manually.
 * @property {Object} topLeft This is the (row, column) position the Tet is in with respect to the game board (16 rows by 10 columns); (0, 0) being the most top left position.
 * @property {Number} topLeft.row Row position of Tet on board.
 * @property {Number} topLeft.col Column position of Tet on board.
 * @property {Array[Array[Number]]} shape Shape of Tet, e.g. _shape = [[1,1,1,1]] is horizontal I Tetrimino where [[1],[1],[1],[1]] is vertical I Tet.  Number in range [1..7] determines color (found from tetColor in draw()). Number of 0 indicates empty space.
 * @property {Array[Array[Number]]} perimeter Perimeter of Tet, e.g. _perimeter = [[0,0],[0,1],[4,1],[4,0]] is horizontal I Tet perimeter where [[0,0],[0,4],[1,4],[1,0]] is vertical I Tet.  Imagine Tetriminos being expressed as 4 "blocks," each block's side would be _s pixels in magnitude, where _s is the variable blockS defined in index.php.  Therefore, we can determine its perimeter by taking the "(x, y) coordinates" in each "row" of _perimeter, and multiplying each x and y value by _s.
 */
function Tet (game, type) {
	if (!(this instanceof arguments.callee)) return new Tet(game, type); // force instantiation
	this.game = game;
	if (type >= -1 && type < 7) this.type = type;
	else this.type = parseInt(Math.floor(Math.random()*7));
	this.rotation = 0;
	if (this.type > -1) {
		this.topLeft = { row: 0, col: 4 };
		this.setShape(this.getShapeMatrix(0));
	}
}
/**
 * This function takes in a Tet type and rotation then outputs its shape matrix.
 * This function is only needed on a live Tet.  I.e. if a Tet is already placed on the landed array, this function will not be used.
 *
 * @author Jared Gotte
 * @param {Number} type Type of shape being used, naturally determined randomly.
 * @param {Number} rotation Rotation of shape, determined by user input.
 * @returns {Array[Array[Number]]} Number matrix of shape.  If type is unexpected, return empty array.
 */
Tet.prototype.getShapeMatrix = function (rotation) {
	// Shapes from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
	// Note that the numbers in these arrays denote their eventual color
	var matrixMatrix = [
		[ [[1,1,1,1]], [[1],[1],[1],[1]] ], // I
		[ [[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]], [[1    ],[1,1,1]], [[1,1],[1  ],[1  ]] ], // J
		[ [[1,1,1],[1    ]], [[1,1],[0,1],[0,1]], [[0,0,1],[1,1,1]], [[1  ],[1  ],[1,1]] ], // L
		[ [[1,1],[1,1]] ], // O
		[ [[0,1,1],[1,1  ]], [[1  ],[1,1],[0,1]] ], // S
		[ [[1,1,1],[0,1  ]], [[0,1],[1,1],[0,1]], [[0,1  ],[1,1,1]], [[1  ],[1,1],[1  ]] ], // T
		[ [[1,1  ],[0,1,1]], [[0,1],[1,1],[1  ]] ], // Z
	], m = matrixMatrix[this.type];
	switch (m.length) {
		case 1:
			return m[0];
		case 2:
			return m[rotation % 2];
		case 4:
			return m[rotation];
		default:
			//console.log('unexpected array length in function ' + arguments.callee.toString().substr(9, arguments.callee.toString().indexOf('(') - 9));
			return [];
	}
}
// This function is used any time a living/landed Tet's shape is created/altered
// Upon breaking up a tet, make sure these conditions are met on its new shape:
// 1) Remove trailing zeros from each row, e.g. [1,0] becomes [1]
// 2) If new shape is one row, remove leading zeros, e.g. [0,1] becomes [1]
Tet.prototype.calcPerimeter = function () {
	var periMatrix = [
		[ [[1]],               [[0,0],[0,1],[1,1],[1,0]] ], // fragments
		[ [[1,1]],             [[0,0],[0,1],[2,1],[2,0]] ],
		[ [[1],[1]],           [[0,0],[0,2],[1,2],[1,0]] ],
		[ [[1,1,1]],           [[0,0],[0,1],[3,1],[3,0]] ],
		[ [[1],[1],[1]],       [[0,0],[0,3],[1,3],[1,0]] ],
		[ [[1,1],[0,1]],       [[0,0],[0,1],[1,1],[1,2],[2,2],[2,0]] ],
		[ [[0,1],[1,1]],       [[1,0],[1,1],[0,1],[0,2],[2,2],[2,0]] ],
		[ [[1  ],[1,1]],       [[0,0],[0,2],[2,2],[2,1],[1,1],[1,0]] ],
		[ [[1,1],[1  ]],       [[0,0],[0,2],[1,2],[1,1],[2,1],[2,0]] ],
		[ [[1,1,1,1]],         [[0,0],[0,1],[4,1],[4,0]] ], // I
		[ [[1],[1],[1],[1]],   [[0,0],[0,4],[1,4],[1,0]] ],
		[ [[1,1,1],[0,0,1]],   [[0,0],[0,1],[2,1],[2,2],[3,2],[3,0]] ], // J
		[ [[0,1],[0,1],[1,1]], [[1,0],[1,2],[0,2],[0,3],[2,3],[2,0]] ],
		[ [[1    ],[1,1,1]],   [[0,0],[0,2],[3,2],[3,1],[1,1],[1,0]] ],
		[ [[1,1],[1  ],[1  ]], [[0,0],[0,3],[1,3],[1,1],[2,1],[2,0]] ],
		[ [[1,1,1],[1    ]],   [[0,0],[0,2],[1,2],[1,1],[3,1],[3,0]] ], // L
		[ [[1,1],[0,1],[0,1]], [[0,0],[0,1],[1,1],[1,3],[2,3],[2,0]] ],
		[ [[0,0,1],[1,1,1]],   [[2,0],[2,1],[0,1],[0,2],[3,2],[3,0]] ],
		[ [[1  ],[1  ],[1,1]], [[0,0],[0,3],[2,3],[2,2],[1,2],[1,0]] ],
		[ [[1,1],[1,1]],       [[0,0],[0,2],[2,2],[2,0]] ], // O
		[ [[0,1,1],[1,1  ]],   [[1,0],[1,1],[0,1],[0,2],[2,2],[2,1],[3,1],[3,0]] ], // S
		[ [[1  ],[1,1],[0,1]], [[0,0],[0,2],[1,2],[1,3],[2,3],[2,1],[1,1],[1,0]] ],
		[ [[1,1,1],[0,1  ]],   [[0,0],[0,1],[1,1],[1,2],[2,2],[2,1],[3,1],[3,0]] ], // T
		[ [[0,1],[1,1],[0,1]], [[1,0],[1,1],[0,1],[0,2],[1,2],[1,3],[2,3],[2,0]] ],
		[ [[0,1  ],[1,1,1]],   [[1,0],[1,1],[0,1],[0,2],[3,2],[3,1],[2,1],[2,0]] ],
		[ [[1  ],[1,1],[1  ]], [[0,0],[0,3],[1,3],[1,2],[2,2],[2,1],[1,1],[1,0]] ],
		[ [[1,1  ],[0,1,1]],   [[0,0],[0,1],[1,1],[1,2],[3,2],[3,1],[2,1],[2,0]] ], // Z
		[ [[0,1],[1,1],[1  ]], [[1,0],[1,1],[0,1],[0,3],[1,3],[1,2],[2,2],[2,0]] ]
	], checkNextShape;
	for (var pRow = 0, pLen = periMatrix.length;  pRow < pLen;  pRow++) {
		checkNextShape = false;
		for (var row = 0, rLen = this.shape.length;  row < rLen;  row++) {
			if (rLen !== periMatrix[pRow][0].length) {
				checkNextShape = true;
				break;
			}
			if (checkNextShape) break;
			for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
				if (this.shape[row].length !== periMatrix[pRow][0][row].length) {
					checkNextShape = true;
					break;
				}
				if (this.shape[row][col] === periMatrix[pRow][0][row][col]) {
					continue;
				}
				checkNextShape = true;
				break;
			}
		}
		if (!checkNextShape) {
			// if it gets to this point, we found our point array
			this.perimeter = periMatrix[pRow][1];
			return;
		}
	}
	this.perimeter = [];
}
Tet.prototype.setShape = function (shape) {
	this.shape = shape;
	this.calcPerimeter();
}
Tet.prototype.rotate = function () { // by default, always clockwise
	var landed = this.game.getLanded(), potRot, potShape;
	if (this.rotation >= 3) potRot = 0;
	else potRot = this.rotation + 1;
	potShape = this.getShapeMatrix(potRot);
	// check for potential collisions
	for (var row = 0, rLen = potShape.length;  row < rLen;  row++) {
		for (var col = 0, cLen = potShape[row].length;  col < cLen;  col++) {
			if (potShape[row][col] !== 0) {
				if (col + this.topLeft.col < 0) {
					//console.log('left beyond playing field');
					return false;
				}
				if (col + this.topLeft.col >= this.game.BOARD_COL_NUM) {
					//console.log('right beyond playing field');
					return false;
				}
				if (row + this.topLeft.row >= this.game.BOARD_ROW_NUM) {
					//console.log('below playing field');
					return false;
				}
				if (landed[row + this.topLeft.row][col + this.topLeft.col] !== 0) {
					//console.log('rotate: space is taken');
					return false;
				}
			}
		}
	}
	this.rotation = potRot;
	this.setShape(potShape);
	return true;
}
Tet.prototype.doesTetCollideBot = function (potentialTopLeft) {
	var landed = this.game.getLanded(this);
	for (var row = 0, rLen = this.shape.length;  row < rLen;  row++) {
		for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
			if (this.shape[row][col] !== 0) {
				if (row + potentialTopLeft.row >= this.game.BOARD_ROW_NUM) {
					//console.log('below playing field');
					return true;
				}
				if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
					//console.log('bot: space taken');
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.doesTetCollideSide = function (potentialTopLeft) {
	var landed = this.game.getLanded();
	for (var row = 0, rLen = this.shape.length;  row < rLen;  row++) {
		for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
			if (this.shape[row][col] !== 0) {
				if (col + potentialTopLeft.col < 0) {
					//console.log('left beyond playing field');
					return true;
				}
				if (col + potentialTopLeft.col >= this.game.BOARD_COL_NUM) {
					//console.log('right beyond playing field');
					return true;
				}
				if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
					//console.log('side: space taken');
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.moveLeft = function () {
	var potentialTopLeft = { row: this.topLeft.row, col: this.topLeft.col - 1 };
	if (!this.doesTetCollideSide(potentialTopLeft)) this.topLeft = potentialTopLeft;
}
Tet.prototype.moveRight = function () {
	var potentialTopLeft = { row: this.topLeft.row, col: this.topLeft.col + 1 };
	if (!this.doesTetCollideSide(potentialTopLeft)) this.topLeft = potentialTopLeft;
}
Tet.prototype.moveDown = function () {
	var potentialTopLeft = { row: this.topLeft.row + 1, col: this.topLeft.col };
	if (!this.doesTetCollideBot(potentialTopLeft)) this.topLeft = potentialTopLeft;
	else {
		this.game.newTet = true;
		this.game.currentTet = null;
		this.game.updateLanded = true;
		this.collided();
	}
}
Tet.prototype.collided = function () {
	var landed = this.game.getLanded(), isFilled, fullRows = [], fRLen;
	for (var row = this.topLeft.row; row < this.game.BOARD_ROW_NUM; row++) {
		isFilled = true;
		for (var col = 0; col < this.game.BOARD_COL_NUM; col++)
			if (landed[row][col] === 0) isFilled = false;
		if (isFilled) fullRows.push(row);
	}
	this.game.updateLanded = true;
	fRLen = fullRows.length;
	if (fRLen === 0) return;
	this.game.score += Math.pow(fRLen, 1 + (fRLen - 1) * 0.1) * 10000; // Scale the point rewarded for filling rows to benefit those that break more at one time.
	this.game.alterShapes(fullRows);
	this.game.updateLanded = true;
	// perform animations
	var that = this, movingTets = [0], tetsMoved,
	moveLoop = setInterval( function() {
		movingTets = [];
		tetsMoved = true;
		while (tetsMoved) {
			tetsMoved = false;
			for (tet = 0, aT = that.game.allTets, tLen = aT.length, potTL = null;  tet < tLen;  tet++) {
				if (movingTets.indexOf(aT[tet], 0) > -1 || (aT[tet] === that.game.currentTet && that.game.newTet !== true)) continue;
				potTL = { row: aT[tet].topLeft.row + 1, col: aT[tet].topLeft.col };
				if (!aT[tet].doesTetCollideBot(potTL)) {
					aT[tet].topLeft = potTL;
					movingTets.push(aT[tet]);
					tetsMoved = true;
				}
			}
			that.game.updateLanded = true;
		}
		that.game.draw();
		if (movingTets.length === 0) {
			clearInterval(moveLoop);
			that.collided();
		}
	}, 200);
}
Tet.prototype.cleanShape = function (o) {
	var shape = o.shape, topLeft = o.topLeft, done = false;
	while (true) {
		for (var row = 0, len = shape.length;  row < len;  row++)
			if (shape[row][0] > 0) {
				done = true;
				break;
			}
		if (done) break;
		for (var row = 0, len = shape.length;  row < len;  row++)
			shape[row].splice(0,1);
		topLeft.col += 1;
	}
	for (var row = 0, len = shape.length;  row < len;  row++) {
		for (var col = shape[row].length - 1; col >= 0; col--) {
			if (shape[row][col] === 0) {
				shape[row].splice(col,1);
				continue;
			}
			break;
		}
	}
	return { shape: shape, topLeft: topLeft };
}
Array.prototype.allZeros = function () { // Checks if an Array is all zeros or not
	for (var col = 0, len = this.length;  col < len;  col++)
		if (this[col] > 0) return false;
	return true;
}
Tet.prototype.updateTet = function () {
	var currShape = [], topLeft, q = [];
	for (var row = 0, len = this.shape.length;  row < len;  row++) {
		if (!this.shape[row].allZeros()) {
			if (currShape.length === 0) topLeft = { row: this.topLeft.row + row, col: this.topLeft.col };
			currShape.push(this.shape[row]);
		}
		else {
			if (currShape.length === 0) continue;
			q.push({ shape: currShape, topLeft: topLeft });
			currShape = [];
		}
	}
	if (currShape.length > 0) q.push({ shape: currShape, topLeft: topLeft });
	if (q.length === 0) this.game.tetsToRemove.push(this.game.allTets.indexOf(this)); // Remove this Tet from allTets if shape is a zero'd matrix (Tet completely gone)
	for (var qs = 0, len = q.length;  qs < len;  qs++) {
		var tmp = this.cleanShape(q[qs]);
		if (qs === 0) {
			this.topLeft = tmp.topLeft;
			this.setShape(tmp.shape);
		}
		else {
			var newTet = new Tet(this.game, -1);
			newTet.type = this.type;
			newTet.topLeft = tmp.topLeft;
			newTet.setShape(tmp.shape);
			this.game.allTets.push(newTet);
		}
	}
}
Tet.prototype.alterShape = function (fullRows) {
	for (var i = 0, len = fullRows.length, row;  i < len;  i++) {
		row = fullRows[i] - this.topLeft.row;
		if (row < 0 || row > this.shape.length - 1) continue;
		for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
			this.shape[row][col] = 0;
		}
	}
	this.updateTet();
}
