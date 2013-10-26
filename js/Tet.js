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

function Game (canvas_id) {
	if ( !(this instanceof arguments.callee) ) // force instantiation
		return new Game(canvas_id);
	
	// Assume 10 blocks can fit horizontally and 16 blocks vertically
	// Thus, assume that canvas height will always be 1.6 times the magnitude of its width
	// Assume block width and height will always be the same
	this.newTet = true;
	this.BOARD_ROW_NUM = 16;
	this.BOARD_COL_NUM = 10;
	this.score = 0,
	this.fallingClumps = [];
	this.landed = []; // Build our empty landed array
	for (var i = 0; i < this.BOARD_ROW_NUM; i++) {
		this.landed[i] = [null,null,null,null,null,null,null,null,null,null];
	}

	this.dropOnce = false; // debug
	this.dropInterval = 750;
	this.currentTet = null;

	this.canvas_width = 200,
	this.block_s = this.canvas_width / 10,
	this.canvas = document.getElementById(canvas_id);
	this.canvas.width = this.canvas_width;
	this.canvas.height = this.BOARD_ROW_NUM / this.BOARD_COL_NUM * this.canvas_width;
	
	this.createTet();
	this.tetDownLoop();
	
	var that = this;
	document.onkeydown = function(e) { // http://www.javascripter.net/faq/keycodes.htm for keycodes
		//console.log('key downed: ' + e.keyCode);
		switch (e.keyCode) {
			case 32:
				//console.log('dropping');
				while (!that.newTet) {
					that.currentTet.moveDown();
				}
				that.draw();
				that.tetDownLoop();
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
Game.prototype.draw = function () {
	// Returns the color of the Tet in HTML color code string form
	function tetColor (type) {
		switch (type) { // Colors from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
			case 0: // I
				return '#3cc'; // Cyan
			case 1: // J
				return '#0af'; // Blue
			case 2: // L
				return '#f90'; // Orange
			case 3: // O
				return '#ee0'; // Yellow
			case 4: // S
				return '#0c0'; // Green
			case 5: // T
				return '#c0c'; // Purple
			case 6: // Z
				return '#c00'; // Red
			default:
				console.log('unexpected type (for color): ' + type);
				return '#fff'; // Black
		}
	}

	var c = this.canvas.getContext('2d');
	//console.log('drawing canvas');
	c.clearRect(0, 0, this.canvas.width, this.canvas.height); // clear canvas
	
	// Draw blocks already landed
	for (var row = 0, tetVisited = [], currLandedTetRef, lastLandedTetRef = null; row < this.BOARD_ROW_NUM; row++) {
		for (var col = 0; col < this.BOARD_COL_NUM; col++) {
			if (this.landed[row][col] != null) {
				currLandedTetRef = this.landed[row][col].ref;
				if (currLandedTetRef == lastLandedTetRef) continue;
				if (tetVisited.indexOf(currLandedTetRef) >= 0) continue;
				if (currLandedTetRef.type === -1) { this.landed[row][col] = null; continue; } // found a zombie Tet and removing it
				tetVisited.push(currLandedTetRef);
				//console.log(this.landed);
				//console.log(this.landed[row][col].pos);
				c.beginPath();

				c.moveTo((currLandedTetRef.topLeft.col + currLandedTetRef.perimeter[0][0]) * this.block_s, (currLandedTetRef.topLeft.row + currLandedTetRef.perimeter[0][1]) * this.block_s);
				for (var row = 1, len = currLandedTetRef.perimeter.length; row < len; row++) {
					c.lineTo((currLandedTetRef.topLeft.col + currLandedTetRef.perimeter[row][0]) * this.block_s, (currLandedTetRef.topLeft.row + currLandedTetRef.perimeter[row][1]) * this.block_s);
				}
				
				c.closePath();
				c.lineJoin = 'miter';
				c.lineWidth = 3;
				c.fillStyle = tetColor(currLandedTetRef.type);
				c.fill();
				c.stroke();
				
				lastLandedTetRef = currLandedTetRef;
			}
		}
	}
	
	// Draw blocks in current Tet
	if (!this.newTet) {
		// Draw perimeter in current Tet
		c.beginPath();
		//console.log(this.currentTet.perimeter);
		c.moveTo((this.currentTet.topLeft.col + this.currentTet.perimeter[0][0]) * this.block_s, (this.currentTet.topLeft.row + this.currentTet.perimeter[0][1]) * this.block_s);
		for (var row = 1, len = this.currentTet.perimeter.length; row < len; row++) {
			c.lineTo((this.currentTet.topLeft.col + this.currentTet.perimeter[row][0]) * this.block_s, (this.currentTet.topLeft.row + this.currentTet.perimeter[row][1]) * this.block_s);
		}
		c.closePath();
		c.lineJoin = 'miter';
		c.lineWidth = 3;
		c.fillStyle = tetColor(this.currentTet.type);
		c.fill();
		c.stroke();
	}
}
Game.prototype.createTet = function () {
	//console.log('creating Tet');
	if (this.newTet) this.currentTet = new Tet(this);
	//console.log(this.currentTet.shape);
	this.newTet = false;
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

function TetNode (tet, pos) {
	if ( !(this instanceof arguments.callee) ) // force instantiation
		return new TetNode(tet, pos);
	this.ref = tet;
	this.pos = pos;
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
 * @property {Array[Array[Number]]} shape Shape of Tet, e.g. _shape = [[1,1,1,1]] is horizontal I Tetrimino where [[1],[1],[1],[1]] is vertical I Tet.  Number in range [1..7] determines color (found from tetColor() in index.php). Number of 0 indicates empty space.
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
		this.shape = this.getShapeMatrix(0);
		this.calcPerimeter();
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
	for (var pRow = 0, pLen = periMatrix.length; pRow < pLen; pRow++) {
		checkNextShape = false;
		for (var row = 0, len = this.shape.length; row < len; row++) {
			if (len != periMatrix[pRow][0].length) {
				checkNextShape = true;
				break;
			}
			if (checkNextShape) break;
			for (var col = 0; col < this.shape[row].length; col++) {
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
Tet.prototype.changeShape = function (shape) {
	this.shape = shape;
	this.calcPerimeter();
}
Tet.prototype.rotate = function () { // by default, always clockwise
	//console.log('rotation: ' + this.rotation);
	var potRot;
	if (this.rotation >= 3) potRot = 0;
	else potRot = this.rotation + 1;
	var potShape = this.getShapeMatrix(potRot);
	// check for potential collisions
	for (var row = 0, len = potShape.length; row < len; row++) {
		for (var col = 0; col < potShape[row].length; col++) {
			if (potShape[row][col] != 0) {
				if (col + this.topLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return false;
				}
				if (col + this.topLeft.col >= this.game.BOARD_COL_NUM) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return false;
				}
				if (row + this.topLeft.row >= this.game.BOARD_ROW_NUM) {
					//this block would be below the playing field
					//console.log('below playing field');
					return false;
				}
				if (this.game.landed[row + this.topLeft.row][col + this.topLeft.col] != null) {
					//the space is taken
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
	for (var row = 0, len = this.shape.length; row < len; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (row + potentialTopLeft.row >= this.game.BOARD_ROW_NUM) {
					//this block would be below the playing field
					//console.log('below playing field');
					return true;
				}
				else if (this.game.landed[row + potentialTopLeft.row][col + potentialTopLeft.col] != null) {
					//console.log(this.game.landed[row + potentialTopLeft.row][col + potentialTopLeft.col]);
					//console.log('bot: space taken');
					//console.log(potentialTopLeft);
					//the space is taken
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.checkSideCollision = function (potentialTopLeft) {
	for (var row = 0, len = this.shape.length; row < len; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (col + potentialTopLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return true;
				}
				if (col + potentialTopLeft.col >= this.game.BOARD_COL_NUM) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return true;
				}
				if (this.game.landed[row + potentialTopLeft.row][col + potentialTopLeft.col] != null) {
					//console.log('side: space taken');
					//the space is taken
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
		for (var row = 0, len = this.shape.length; row < len; row++) {
			for (var col = 0; col < this.shape[row].length; col++) {
				if (this.shape[row][col] != 0) {
					this.game.landed[row + this.topLeft.row][col + this.topLeft.col] = new TetNode(this, { row: row + this.topLeft.row, col: col + this.topLeft.col } );
				}
			}
		}
		return this.collided();
	}
	return true;
}
Tet.prototype.collided = function () {
	if (this.type >= 0) this.game.newTet = true; // uncommented/unable this line once v1 collided() is removed
	//console.log('tet down collision!');
	var isFilled, lastRowRemoved = -1;
	for (var row = this.topLeft.row; row < this.game.BOARD_ROW_NUM; row++) {
		isFilled = true;
		for (var col = 0; col < this.game.BOARD_COL_NUM; col++) {
			if (this.game.landed[row][col] == null)
				isFilled = false;
		}
		if (isFilled) {
			this.game.landed.splice(row, 1);
			this.game.landed.unshift([null,null,null,null,null,null,null,null,null,null]);
			lastRowRemoved = row;
			this.game.score++;
			console.log('score:' + this.game.score);
		}
	}
	return false;
}
Tet.prototype.alterShape = function (row, col) {
	if (this.shape[row - this.topLeft.row][col - this.topLeft.col] === 0){
		console.log('alterShape() exception: row: '+row+' col: '+col+' already zero of shape: '+this.shape+' in Tet:');
		console.log(this);
	}
	this.shape[row - this.topLeft.row][col - this.topLeft.col] = 0;
}
Tet.prototype.cleanShape = function (o) {
	var shape = o.shape, topLeft = o.topLeft, done = false;
	while (true) {
		for (var row = 0, len = shape.length; row < len; row++)
			if (shape[row][0] > 0) {
				done = true;
				break;
			}
		if (done) break;
		for (var row = 0, len = shape.length; row < len; row++)
			shape[row].splice(0,1);
		topLeft.col += 1;
	}
	for (var row = 0, len = shape.length; row < len; row++) {
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
Array.prototype.allZeros = function () {
	for (var col = 0, len = this.length; col < len; col++)
		if (this[col] > 0) return false;
	return true;
}
Tet.prototype.update = function () {
	var currShape = [], topLeft = this.topLeft, q = [];
	for (var row = 0, len = shape.length; row < len; row++) {
		if (shape[row].allZeros()) {
			if (currShape.length === 0) {
				topLeft.row += 1;
				continue;
			}
			q.push({ shape: currShape, topLeft: topLeft });
			currShape = [];
		}
	}
	if (currShape.length > 0) q.push({ shape: currShape, topLeft: topLeft });
	this.type = -1;
	for (var qs = 0, len = q.length; qs < len; qs++) {
		var tmp = this.cleanShape(q[qs]);
		var newTet = new Tet(this.game, -1);
		newTet.type = this.type;
		newTet.shape = tmp.shape;
		newTet.topLeft = tmp.topLeft;
		newTet.perimeter = newTet.calcPerimeter();
		this.game.fallingClumps.push(newTet);
	}
}
