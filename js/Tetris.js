// JSDoc Wiki: http://en.wikipedia.org/wiki/JSDoc
// jsdoc-toolkit references: http://code.google.com/p/jsdoc-toolkit/wiki/TagReference
// JS Data Types: http://www.w3schools.com/js/js_datatypes.asp
// JS Try Catch Throw Errors Tut: http://www.w3schools.com/js/js_errors.asp

/* Nomenclature:
 *
 * user:        Person playing the game.
 * Tet:         Short for Tetrimino (http://en.wikipedia.org/wiki/Tetrimino), or the name of our main class.  I will try to disambiguate within the comments when necessary.
 * living Tet:  Tet in free fall controlled by user.
 * landed Tet:  Tet that has landed and is no longer in control by user.
 */

// Checks if an Array is all zeros or not
Array.prototype.allZeros = function () {
	for (var col = 0, len = this.length;  col < len;  col++)
		if (this[col] > 0) return false;
	return true;
}

function Game (canvas_id) {
	if ( !(this instanceof arguments.callee) ) // force instantiation
		return new Game(canvas_id);
	
	// Assume 10 blocks can fit horizontally and 16 blocks vertically
	// Thus, assume that canvas height will always be 1.6 times the magnitude of its width
	// Assume block width and height will always be the same
	// public vars
	this.BOARD_ROW_NUM = 16;
	this.BOARD_COL_NUM = 10;
	this.newTet = true;
	this.currentTet = null;
	this.score = 0,
	this.allTets = [];
	this.fallingClumps = [];
	this.landed = []; // Build our empty landed array
	this.landedSemaphore = false;
	this.updateLanded = true;

	// debug/test cases
	this.testCasing = false;

	// private vars
	this.dropInterval = 750;
	this.gameOver = false;
	this.canvas_width = 200,
	this.block_s = this.canvas_width / 10,
	this.canvas = document.getElementById(canvas_id);
	this.canvas.width = this.canvas_width;
	this.canvas.height = this.BOARD_ROW_NUM / this.BOARD_COL_NUM * this.canvas_width;
	
	// init functions
	if (this.testCasing) this.testCase();
	this.createTet();
	this.tetDownLoop();
	
	var that = this;
	document.onkeydown = function(e) { // http://www.javascripter.net/faq/keycodes.htm for keycodes
		//console.log('key downed: ' + e.keyCode);
		switch (e.keyCode) {
			case 32:
				//console.log('dropping');
				if (!that.newTet) {
					while (!that.newTet) {
						that.currentTet.moveDown();
					}
					that.draw();
					that.tetDownLoop();
				}
				break;
			case 38:
				//console.log('rotating');
				that.currentTet.rotate();
				that.draw();
				break;
			case 37:
				//console.log('moving left');
				that.currentTet.moveLeft();
				that.draw();
				break;
			case 39:
				//console.log('moving right');
				that.currentTet.moveRight();
				that.draw();
				break;
			case 40:
				//console.log('moving down');
				var skip;
				if (that.newTet) skip = true;
				if (!skip) clearInterval(that.loop);
				that.currentTet.moveDown();
				that.draw();
				if (!skip) that.tetDownLoop();
				break;
			default:
				console.log('unrecognized key: ' + e.keyCode);
				clearInterval(that.loop);
		}
	}
}
Game.prototype.testCase = function () {
	// Check T (rotated once) single row (middle) deletion
	/*var tmp = new Tet(this, 3);
	tmp.topLeft = { row: 14, col: 0 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 5);
	tmp.rotate();
	tmp.topLeft = { row: 13, col: 2 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 4 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 7 };
	this.currentTet = tmp;*/
	// Check I (rotated once) double row (middle) deletion
	/*var tmp = new Tet(this, 3);
	tmp.topLeft = { row: 14, col: 0 };
	this.allTets.push(tmp);
	var tmp = new Tet(this, 3);
	tmp.topLeft = { row: 12, col: 0 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 0);
	tmp.rotate();
	tmp.topLeft = { row: 12, col: 2 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 4 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 7 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.rotate();
	tmp.rotate();
	tmp.topLeft = { row: 12, col: 4 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.rotate();
	tmp.rotate();
	tmp.topLeft = { row: 12, col: 7 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 0);
	tmp.rotate();
	tmp.topLeft = { row: 11, col: 3 };
	this.currentTet = tmp;*/
	// Check I (rotated once) single row (middle) deletion
	var tmp = new Tet(this, 3);
	tmp.topLeft = { row: 14, col: 0 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 0);
	tmp.rotate();
	tmp.topLeft = { row: 12, col: 2 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 4 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 1);
	tmp.topLeft = { row: 14, col: 7 };
	this.allTets.push(tmp);
	tmp = new Tet(this, 0);
	tmp.rotate();
	tmp.topLeft = { row: 11, col: 3 };
	this.currentTet = tmp;
		
	this.newTet = false;
	this.dropOnce = true;
}
Game.prototype.draw = function () {
	//console.log('drawing canvas');

	// Keys respectively reflect the HTML color code of Tets: I, J, L, O, S, T, Z
	var tetColor = ['#3cc','#0af','#f90','#ee0','#0c0','#c0c','#c00'];

	var c = this.canvas.getContext('2d');
	c.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear canvas
	
	// Draw all Tets
	for (var tet = 0, aTLen = this.allTets.length;  tet < aTLen;  tet++) {
		var currTet = this.allTets[tet];
		c.beginPath();
		c.moveTo((currTet.topLeft.col + currTet.perimeter[0][0]) * this.block_s, (currTet.topLeft.row + currTet.perimeter[0][1]) * this.block_s);
		for (var row = 1, len = currTet.perimeter.length;  row < len;  row++) {
			c.lineTo((currTet.topLeft.col + currTet.perimeter[row][0]) * this.block_s, (currTet.topLeft.row + currTet.perimeter[row][1]) * this.block_s);
		}
		c.closePath();
		c.lineJoin = 'miter';
		c.lineWidth = 3;
		c.fillStyle = tetColor[currTet.type];
		c.fill();
		c.strokeStyle="#000";
		c.stroke();
	}
	
	// Draw living Tet "shadow"
	if (this.currentTet !== null) {
		var blb = { row: 0, col: 0 }, brb = { row: 0, col: 0 };
		for (var row = 0, rLen = this.currentTet.shape.length;  row < rLen;  row++) {
			for (var col = 0, cLen = this.currentTet.shape[row].length;  col < cLen;  col++) {
				if (this.currentTet.shape[row][col] === 1) {
					if (row >= blb.row && col <= blb.col) blb = { row: row, col: col };
					else if (row >= brb.row && col >= brb.col) brb = { row: row, col: col };
				}
			}
		}
		/*console.log('row min: ' + Math.min(this.currentTet.topLeft.row + blb.row, this.currentTet.topLeft.row + brb.row));
		console.log('col start: ' + (this.currentTet.topLeft.col + blb.col));
		console.log('col end: ' + (this.currentTet.topLeft.col + brb.col));*/
		var tll = { row: this.BOARD_ROW_NUM, col: 0 }, trl = { row: this.BOARD_ROW_NUM, col: brb.col + 1 };
		for (var row = Math.min(this.currentTet.topLeft.row + blb.row, this.currentTet.topLeft.row + brb.row);  row < this.BOARD_ROW_NUM;  row++) {
			for (var col = this.currentTet.topLeft.col + blb.col;  col <= this.currentTet.topLeft.col + brb.col;  col++) {
				if (this.landed[row][col] === 1) {
					//console.log(row +' '+ col);
					if (row <= tll.row && col == this.currentTet.topLeft.col + blb.col) tll.row = row;
					else if (row <= trl.row && col == this.currentTet.topLeft.col + brb.col) trl.row = row;
				}
			}
		}
		/*console.log(blb);
		console.log(brb);
		console.log(tll);
		console.log(trl);*/
		c.lineWidth = 1;
		c.strokeStyle="#eee";
		c.beginPath();
		c.moveTo((this.currentTet.topLeft.col + blb.col) * this.block_s, (this.currentTet.topLeft.row + blb.row + 1) * this.block_s);
		c.lineTo((this.currentTet.topLeft.col + tll.col) * this.block_s, (tll.row) * this.block_s);
		c.moveTo((this.currentTet.topLeft.col + brb.col + 1) * this.block_s, (this.currentTet.topLeft.row + brb.row + 1) * this.block_s);
		c.lineTo((this.currentTet.topLeft.col + trl.col) * this.block_s, (trl.row) * this.block_s);
		c.stroke();
	}
	
	// Draw Game Over text if game is over
	if (this.gameOver) {
		c.fillStyle = '#f00';
		c.font = "36px Arial";
		c.fillText("Game Over",6,170);
		c.lineWidth = 1;
		c.fillStyle = '#000';
		c.strokeText("Game Over",6,170);
	}
}
Game.prototype.createTet = function () {
	//console.log('creating Tet');
	if (this.newTet) this.currentTet = new Tet(this);
	//console.log(this.currentTet.shape);
	this.newTet = false;
	if (this.currentTet.checkBotCollision(this.currentTet.potentialTopLeft)) {
		console.log('Game Over');
		this.gameOver = true;
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
Game.prototype.getLanded = function () {
	if (this.updateLanded) {
		for (var i = 0; i < this.BOARD_ROW_NUM; i++) {
			this.landed[i] = [0,0,0,0,0,0,0,0,0,0];
		}
		for (var i = 0, aT = this.allTets, len = aT.length;  i < len;  i++) {
			if (aT[i] === this.currentTet) continue;
			for (var row = 0, rLen = aT[i].shape.length;  row < rLen;  row++) {
				for (var col = 0, cLen = aT[i].shape[row].length;  col < cLen;  col++) {
					if (aT[i].shape[row][col] != 0) {
						this.landed[row + aT[i].topLeft.row][col + aT[i].topLeft.col] = 1;
					}
				}
			}
		}
		this.updateLanded = false;
	}
	//console.log(this.landed);
	return this.landed;
}
Game.prototype.alterShapes = function (fullRows) {
	var firstRow = fullRows[0], lastRow = fullRows[fullRows.length - 1];
	//console.log(this.allTets);
	for (var tet = 0, len = this.allTets.length;  tet < len;  tet++) {
		if (this.allTets[tet].topLeft.row <= firstRow - 4 || this.allTets[tet].topLeft.row > lastRow) continue;
		this.allTets[tet].alterShape(fullRows);
	}
	this.updateLanded = true;
}

// Needed to clone arrays of arrays
/*Object.prototype.clone = function() { // http://my.opera.com/GreyWyvern/blog/show.dml/1725165
	var newObj = (this instanceof Array) ? [] : {};
	for (i in this) {
		if (i == 'clone') continue;
		if (this[i] && typeof this[i] == "object") {
			newObj[i] = this[i].clone();
		} else newObj[i] = this[i]
	} return newObj;
}*/

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
 * @property {Array[Array[Number]]} perimeter Perimeter of Tet, e.g. _perimeter = [[0,0],[0,1],[4,1],[4,0]] is horizontal I Tet perimeter where [[0,0],[0,4],[1,4],[1,0]] is vertical I Tet.  Imagine Tetriminos being expressed as 4 "blocks," each block's side would be _s pixels in magnitude, where _s is the variable block_s defined in index.php.  Therefore, we can determine its perimeter by taking the "(x, y) coordinates" in each "row" of _perimeter, and multiplying each x and y value by _s.
 */
function Tet (game, type) {
	if ( !(this instanceof arguments.callee) ) // force instantiation
		return new Tet(game, type);
	//console.log(type);
	this.game = game;
	if (type >= -1 && type < 7) this.type = type;
	else this.type = parseInt(Math.floor(Math.random()*7));
	this.rotation = 0;
	if (type > -1 || type == undefined) {
		this.topLeft = { row: 0, col: 4 };
		this.potentialTopLeft = this.topLeft;
		this.setShape(this.getShapeMatrix(0));
	}
	//console.log(this.shape);
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
	//console.log('calculating perimeter, rot: ' + this.rotation);
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
			if (len != periMatrix[pRow][0].length) {
				checkNextShape = true;
				break;
			}
			if (checkNextShape) break;
			for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
				if (this.shape[row].length != periMatrix[pRow][0][row].length) {
					checkNextShape = true;
					break;
				}
				if (this.shape[row][col] == periMatrix[pRow][0][row][col]) {
					continue;
				}
				checkNextShape = true;
				break;
			}
		}
		if (!checkNextShape) {
			// if it gets to this point, we found our point array
			//console.log('found perimeter ' + pRow);
			//console.log(periMatrix[pRow][1]);
			this.perimeter = periMatrix[pRow][1];
			return;
		}
	}
	//console.log(this.shape);
	this.perimeter = [];
}
Tet.prototype.setShape = function (shape) {
	this.shape = shape;
	this.calcPerimeter();
}
Tet.prototype.rotate = function () { // by default, always clockwise
	//console.log('rotation: ' + this.rotation);
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
				if (this.game.landed[row + this.topLeft.row][col + this.topLeft.col] !== 0) {
					//console.log('rotate: space is taken');
					return false;
				}
			}
		}
	}
	this.rotation = potRot;
	this.shape = potShape;
	this.calcPerimeter();
	return true;
}
Tet.prototype.checkBotCollision = function (potentialTopLeft) {
	//console.log('checking bot coll');
	var landed = this.game.getLanded();
	//console.log(this.shape);
	for (var row = 0, rLen = this.shape.length;  row < rLen;  row++) {
		for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++) {
			if (this.shape[row][col] !== 0) {
				if (row + potentialTopLeft.row >= this.game.BOARD_ROW_NUM) {
					//console.log('below playing field');
					return true;
				}
				if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] !== 0) {
					//console.log(landed[row + potentialTopLeft.row][col + potentialTopLeft.col]);
					//console.log('bot: space taken');
					//console.log(potentialTopLeft);
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.checkSideCollision = function (potentialTopLeft) {
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
	if (!this.checkSideCollision(potentialTopLeft)) this.topLeft = potentialTopLeft;
}
Tet.prototype.moveRight = function () {
	var potentialTopLeft = { row: this.topLeft.row, col: this.topLeft.col + 1 };
	if (!this.checkSideCollision(potentialTopLeft)) this.topLeft = potentialTopLeft;
}
Tet.prototype.moveDown = function () {
	//console.log('moving down');
	var potentialTopLeft = { row: this.topLeft.row + 1, col: this.topLeft.col };
	//console.log(potentialTopLeft);
	if (!this.checkBotCollision(potentialTopLeft)) this.topLeft = potentialTopLeft;
	else {
		this.game.currentTet = null;
		this.game.updateLanded = true;
		this.collided();
	}
}
Tet.prototype.collided = function () {
	//console.log('tet down collision!');
	this.game.newTet = true;
	var landed = this.game.getLanded(), isFilled, fullRows = [], fRLen;
	for (var row = this.topLeft.row; row < this.game.BOARD_ROW_NUM; row++) {
		isFilled = true;
		for (var col = 0; col < this.game.BOARD_COL_NUM; col++)
			if (landed[row][col] === 0) isFilled = false;
		if (isFilled) fullRows.push(row);
	}
	//console.log(fullRows);
	this.game.updateLanded = true;
	fRLen = fullRows.length;
	if (fRLen === 0) return;
	this.game.score += Math.pow(fRLen, 1 + (fRLen - 1) * 0.1) * 100;
	document.getElementById('score').innerHTML = this.game.score;
	console.log('score:' + this.game.score);
	this.game.alterShapes(fullRows);
	this.game.updateLanded = true;
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
	if (q.length === 0) this.game.allTets.splice(this.game.allTets.indexOf(this),1); // Remove this Tet from allTets if shape is a zero'd matrix (Tet completely gone)
	//console.log(q);
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
			//this.game.fallingClumps.push(newTet);
			this.game.allTets.push(newTet);
		}
	}
}
Tet.prototype.alterShape = function (fullRows) {
	//console.log('altering shape');
	for (var i = 0, len = fullRows.length, row;  i < len;  i++) {
		row = fullRows[i] - this.topLeft.row;
		if (row < 0 || row > this.shape.length - 1) continue;
		for (var col = 0, cLen = this.shape[row].length;  col < cLen;  col++)
			this.shape[row][col] = 0;
	}
	this.updateTet();
}
