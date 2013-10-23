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

var BOARD_ROW_NUM = 16, BOARD_COL_NUM = 10;

var canvas_width = 200,
    block_s = canvas_width / 10,
    score = 0,
    newTet = true,
		fallingClumps = [];

// Version 2
// Build our empty landed array
var landed = [];
for (var i = 0; i < BOARD_ROW_NUM; i++) {
	landed[i] = [null,null,null,null,null,null,null,null,null,null];
}

function TetNode (tet, pos) {
	this.ref = tet;
	this.pos = pos;
}

// Unfortunately needed to clone arrays of arrays
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
function Tet (type) {
	//console.log(type);
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
	for (var pRow = 0; pRow < periMatrix.length; pRow++) {
		checkNextShape = false;
		for (var row = 0; row < this.shape.length; row++) {
			if (this.shape.length != periMatrix[pRow][0].length) {
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
	for (var row = 0; row < potShape.length; row++) {
		for (var col = 0; col < potShape[row].length; col++) {
			if (potShape[row][col] != 0) {
				if (col + this.topLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return false;
				}
				if (col + this.topLeft.col >= BOARD_COL_NUM) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return false;
				}
				if (row + this.topLeft.row >= BOARD_ROW_NUM) {
					//this block would be below the playing field
					//console.log('below playing field');
					return false;
				}
				if (landed[row + this.topLeft.row][col + this.topLeft.col] != null) {
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
	for (var row = 0; row < this.shape.length; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (row + potentialTopLeft.row >= BOARD_ROW_NUM) {
					//this block would be below the playing field
					//console.log('below playing field');
					return true;
				}
				else if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] != null) {
					//console.log(landed[row + potentialTopLeft.row][col + potentialTopLeft.col]);
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
	for (var row = 0; row < this.shape.length; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (col + potentialTopLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return true;
				}
				if (col + potentialTopLeft.col >= BOARD_COL_NUM) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return true;
				}
				if (landed[row + potentialTopLeft.row][col + potentialTopLeft.col] != null) {
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
		for (var row = 0; row < this.shape.length; row++) {
			for (var col = 0; col < this.shape[row].length; col++) {
				if (this.shape[row][col] != 0) {
					landed[row + this.topLeft.row][col + this.topLeft.col] = new TetNode(this, { row: row + this.topLeft.row, col: col + this.topLeft.col } );
				}
			}
		}
		return this.collided();
	}
	return true;
}
Tet.prototype.collided = function () {
	if (this.type >= 0) newTet = true; // uncommented/unable this line once v1 collided() is removed
	//console.log('tet down collision!');
	var isFilled, lastRowRemoved = -1;
	for (var row = this.topLeft.row; row < BOARD_ROW_NUM; row++) {
		isFilled = true;
		for (var col = 0; col < BOARD_COL_NUM; col++) {
			if (landed[row][col] == null)
				isFilled = false;
		}
		if (isFilled) {
			landed.splice(row, 1);
			landed.unshift([null,null,null,null,null,null,null,null,null,null]);
			lastRowRemoved = row;
			score++;
			console.log('score:' + score);
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
		for (var row = 0; row < shape.length; row++)
			if (shape[row][0] > 0) {
				done = true;
				break;
			}
		if (done) break;
		for (var row = 0; row < shape.length; row++)
			shape[row].splice(0,1);
		topLeft.col += 1;
	}
	for (var row = 0; row < shape.length; row++) {
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
	for (var col = 0; col < this.length; col++)
		if (this[col] > 0) return false;
	return true;
}
Tet.prototype.update = function () {
	var currShape = [], topLeft = this.topLeft, q = [];
	for (var row = 0; row < shape.length; row++) {
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
	for (var qs = 0; qs < q.length; qs++) {
		var tmp = this.cleanShape(q[qs]);
		var newTet = new Tet(-1);
		newTet.type = this.type;
		newTet.shape = tmp.shape;
		newTet.topLeft = tmp.topLeft;
		newTet.perimeter = newTet.calcPerimeter();
		fallingClumps.push(newTet);
	}
}
