<?php
?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN"
"http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">
<meta name="keywords" content="">
<meta name="description" content="">
<title>Tetris</title>

<link rel="stylesheet" type="text/css" href="css/reset.css">
<link rel="stylesheet" type="text/css" href="css/main.css">

<script type="text/javascript">
//<![CDATA[

// The collision detection is mostly inspired from the article: http://gamedev.tutsplus.com/tutorials/implementation/implementing-tetris-collision-detection/ (by Michael James Williams on Oct 6th 2012)
// The reason why I did not entirely come up with my own algorithms for everything is for the sake of time

// Most of the standards I used for Tetris came from http://en.wikipedia.org/wiki/Tetris


// Assume 10 blocks can fit horizontally and 16 blocks vertically
// Thus, assume that canvas height will always be 1.6 times the magnitude of its width
// Assume block width and height will always be the same
var canvas_width = 200,
    block_s = canvas_width / 10,
    loop,
		dropInterval = 750,
    score = 0,
		currentTet,
    newTet = true;

// Build our empty landed array
var landed = [];
//var landedBeforeFloodFill = []; // debug
for (var i = 0; i < 16; i++) {
	landed[i] = [0,0,0,0,0,0,0,0,0,0];
	//landedBeforeFloodFill[i] = [0,0,0,0,0,0,0,0,0,0]; // debug
}

// debug variables
var dropOnce = false;
/*currentTet = new Tet(2);
//currentTet.topLeft = { row: 0, col: 7 };
//currentTet.shape = [[0,0,3],[3,3,3]];
currentTet.topLeft = { row: 0, col: 1 };
currentTet.shape = [[2,2],[2],[2]];
newTet = false;*/
/*landed[12] = [3,0,0,3,3,0,0,0,0,0];
landed[13] = [3,0,0,3,3,0,0,0,0,0];
landed[14] = [1,1,1,1,1,1,1,0,0,0];
landed[15] = [0,1,1,0,0,1,1,1,0,0];*/
/*landed[11] = [0,3,3,3,3,0,0,0,0,0];
landed[12] = [0,0,3,0,3,0,0,0,0,0];
landed[13] = [0,0,3,0,3,0,0,0,0,0];
landed[14] = [1,1,1,1,1,1,1,0,0,0];
landed[15] = [0,1,0,0,0,1,1,1,0,0];*/
/*landed[13] = [2,0,3,3,1,1,1,1,1,1];
landed[14] = [0,0,0,3,1,1,1,1,1,1];
landed[15] = [0,0,3,3,0,1,1,1,0,0];*/

// Needed to clone arrays of arrays for debugging
/*Object.prototype.clone = function() { // http://my.opera.com/GreyWyvern/blog/show.dml/1725165
	var newObj = (this instanceof Array) ? [] : {};
	for (i in this) {
		if (i == 'clone') continue;
		if (this[i] && typeof this[i] == "object") {
			newObj[i] = this[i].clone();
		} else newObj[i] = this[i]
	} return newObj;
}*/

function shapeMatrices (type, rotation) {
	// Shapes from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
	// Note that the numbers in these arrays denote their eventual color
	var matrixMatrix = [
		[ [[1,1,1,1]], [[1],[1],[1],[1]] ], // I
		[ [[2,2,2],[0,0,2]], [[0,2],[0,2],[2,2]], [[2],[2,2,2]], [[2,2],[2],[2]] ], // J
		[ [[3,3,3],[3]], [[3,3],[0,3],[0,3]], [[0,0,3],[3,3,3]], [[3],[3],[3,3]] ], // L
		[ [[4,4],[4,4]] ], // O
		[ [[0,5,5],[5,5]], [[5],[5,5],[0,5]] ], // S
		[ [[6,6,6],[0,6]], [[0,6],[6,6],[0,6]], [[0,6],[6,6,6]], [[6],[6,6],[6]] ], // T
		[ [[7,7],[0,7,7]], [[0,7],[7,7],[7]] ], // Z
	], m = matrixMatrix[type];
	switch (m.length) {
		case 1:
			return m[0];
		case 2:
			return m[rotation % 2];
		case 4:
			return m[rotation];
		default:
			//console.log('unexpected array length in function ' + arguments.callee.toString().substr(9, arguments.callee.toString().indexOf('(') - 9));
			return false;
	}
}

function Tet (type) {
	//console.log(type);
	this.topLeft = { row: 0, col: 4 };
	this.potentialTopLeft = this.topLeft;
	if (type >= 0) this.type = type;
	else this.type = parseInt(Math.floor(Math.random()*7));
	this.rotation = 0;
	this.shape = shapeMatrices(this.type, this.rotation);
}
Tet.prototype.checkBotCollision = function() {
	for (var row = 0; row < this.shape.length; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (row + this.potentialTopLeft.row >= landed.length) {
					//this block would be below the playing field
					//console.log('below playing field');
					return true;
				}
				else if (landed[row + this.potentialTopLeft.row][col + this.potentialTopLeft.col] != 0) {
					//console.log(landed[row + this.potentialTopLeft.row][col + this.potentialTopLeft.col]);
					//console.log('bot: space taken');
					//console.log(this.potentialTopLeft);
					//the space is taken
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.checkSideCollision = function() {
	for (var row = 0; row < this.shape.length; row++) {
		for (var col = 0; col < this.shape[row].length; col++) {
			if (this.shape[row][col] != 0) {
				if (col + this.potentialTopLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return true;
				}
				if (col + this.potentialTopLeft.col >= landed[0].length) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return true;
				}
				if (landed[row + this.potentialTopLeft.row][col + this.potentialTopLeft.col] != 0) {
					//console.log('side: space taken');
					//the space is taken
					return true;
				}
			}
		}
	}
	return false;
}
Tet.prototype.rotate = function() { // by default, always clockwise
	//console.log('rotating');
	var potRot;
	if (this.rotation >= 3) potRot = 0;
	else potRot = this.rotation + 1;
	var potShape = shapeMatrices(this.type, potRot);
	// check for potential collisions
	for (var row = 0; row < potShape.length; row++) {
		for (var col = 0; col < potShape[row].length; col++) {
			if (potShape[row][col] != 0) {
				if (col + this.topLeft.col < 0) {
					//this block would be to the left of the playing field
					//console.log('left beyond playing field');
					return false;
				}
				if (col + this.topLeft.col >= landed[0].length) {
					//this block would be to the right of the playing field
					//console.log('right beyond playing field');
					return false;
				}
				if (row + this.topLeft.row >= landed.length) {
					//this block would be below the playing field
					//console.log('below playing field');
					return false;
				}
				if (landed[row + this.topLeft.row][col + this.topLeft.col] != 0) {
					//the space is taken
					//console.log('rotate: space is taken');
					return false;
				}
			}
		}
	}
	this.shape = potShape;
	this.rotation = potRot;
	return true;
}
Tet.prototype.moveLeft = function() {
	this.potentialTopLeft = { row: this.topLeft.row, col: this.topLeft.col - 1 };
	if (!this.checkSideCollision()) this.topLeft = this.potentialTopLeft;
}
Tet.prototype.moveRight = function() {
	this.potentialTopLeft = { row: this.topLeft.row, col: this.topLeft.col + 1 };
	if (!this.checkSideCollision()) this.topLeft = this.potentialTopLeft;
}
Tet.prototype.moveDown = function() {
	//console.log('moving down');
	this.potentialTopLeft = { row: this.topLeft.row + 1, col: this.topLeft.col };
	//console.log(this.potentialTopLeft);
	if (!this.checkBotCollision()) this.topLeft = this.potentialTopLeft;
	else {
		for (var row = 0; row < this.shape.length; row++) {
			for (var col = 0; col < this.shape[row].length; col++) {
				if (this.shape[row][col] != 0) {
					landed[row + this.topLeft.row][col + this.topLeft.col] = this.shape[row][col];
				}
			}
		}
		return this.collided();
	}
	return true;
}
function ClumpNode (row, col, val) {
	this.row = row;
	this.col = col;
	this.val = val;
}
function Clump (row, col) {
	this.row = row; // row and col is the position where this clump starts on the lastRowRemoved
	this.col = col;
	this.topLeft = { row: 0, col: 0 };
	this.potentialTopLeft = this.topLeft;
	this.matrix = [];
}
Clump.prototype.addNode = function(node) {
		this.matrix.push(node);
}
Clump.prototype.computeShape = function() {
	var rowMin = 15, colMin = 9, rowMax = 0, colMax = 0, shape = [];
	for (var i = 0; i < this.matrix.length; i++) {
		if (this.matrix[i].row < rowMin) rowMin = this.matrix[i].row;
		if (this.matrix[i].col < colMin) colMin = this.matrix[i].col;
	}
	for (var i = 0; i < this.matrix.length; i++) {
		this.matrix[i].row = this.matrix[i].row - rowMin;
		if (this.matrix[i].row > rowMax) rowMax = this.matrix[i].row;
		this.matrix[i].col = this.matrix[i].col - colMin;
		if (this.matrix[i].col > colMax) colMax = this.matrix[i].col;
	}
	for (var row = 0; row <= rowMax; row++) {
		var tmp = [];
		for (var col = 0; col <= colMax; col++) {
			tmp.push(0);
		}
		shape.push(tmp);
	}
	for (var i = 0; i < this.matrix.length; i++) {
		shape[this.matrix[i].row][this.matrix[i].col] = this.matrix[i].val;
	}
	
	//console.log(this.matrix);
	//console.log(shape);
	this.topLeft.row = rowMin;
	this.topLeft.col = colMin;
	return shape;
}
Clump.prototype.size = function() {
	return this.matrix.length;
}
Tet.prototype.collided = function() {
	if (this.type >= 0) newTet = true;
	//console.log('tet down collision!');
	var isFilled, lastRowRemoved = -1;
	for (var row = this.topLeft.row; row < landed.length; row++) {
		isFilled = true;
		for (var col = 0; col < landed[row].length; col++) {
			if (landed[row][col] == 0)
				isFilled = false;
		}
		if (isFilled) {
			landed.splice(row, 1);
			landed.unshift([0,0,0,0,0,0,0,0,0,0]);
			lastRowRemoved = row;
			score++;
			console.log('score:' + score);
		}
	}
	if (lastRowRemoved >= 0 && this.type >= 0) {
		//landedBeforeFloodFill = landed.clone(); // debug
		//calculate clumps along lastRowRemoved and above
		var clumps = [], q, n, c, colorFound = -1, colorNow = -1, i;
		for (var col = 0; col < landed[lastRowRemoved].length; col++) {
			q = [], colorFound = landed[lastRowRemoved][col], i = 0;
			q.push(new ClumpNode(lastRowRemoved, col, colorFound));
			c = new Clump(lastRowRemoved, col);
			while (q.length > 0 && i < 1000) {
				n = q.shift();
				colorNow = landed[n.row][n.col];
				if (colorNow == colorFound && colorNow > 0) {
					//console.log('i:'+col+' row:'+n.row+' col:'+n.col+' val:'+colorNow);
					c.addNode(n);
					landed[n.row][n.col] = 0;
					if (n.col > 0) q.push(new ClumpNode(n.row, n.col - 1, colorNow));
					if (n.col < 15) q.push(new ClumpNode(n.row, n.col + 1, colorNow));
					if (n.row > 0) q.push(new ClumpNode(n.row - 1, n.col, colorNow));
					if (n.row < 15) q.push(new ClumpNode(n.row + 1, n.col, colorNow));
				}
				i++;
			}
			//console.log(c.size());
			if (c.size() > 0) clumps.push(c);
		}
		//console.log(clumps);
		//clumps[0].computeShape();
		for (var i = 0; i < clumps.length; i++) {
			var tmp = new Tet();
			tmp.shape = clumps[i].computeShape();
			tmp.topLeft = clumps[i].topLeft;
			//console.log(tmp.topLeft);
			tmp.type = -1;
			while (tmp.moveDown()) {}
		}
	}
	return false;
}

// Returns the color of the Tet in HTML color code string form
function tetColor (color) {
	switch (color) { // Colors from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
		case 1: // Cyan
			return '#0ff';
		case 2: // Blue
			return '#00f';
		case 3: // Orange
			return '#f90';
		case 4: // Yellow
			return '#ff0';
		case 5: // Green
			return '#0f0';
		case 6: // Purple
			return '#f0f';
		case 7: // Red
			return '#f00';
		default: // Black
			console.log('unexpected color: ' + color);
			return '#fff';
	}
}

window.onload = function() {
	//canvas.style.width = canvas_width + 'px'; canvas.style.height = 2 * canvas_width + 'px';
	canvas.width = canvas_width; canvas.height = 1.6 * canvas_width;
	var c = document.getElementById('canvas').getContext('2d');

	// debug/test with second canvas
	/*canvas2.width = canvas_width; canvas2.height = 1.6 * canvas_width;
	var c2 = document.getElementById('canvas2').getContext('2d');*/

	function drawCanvas () {
		//console.log('drawing canvas');
		c.clearRect(0, 0, canvas.width, canvas.height); // clear canvas
		//c2.clearRect(0, 0, canvas2.width, canvas2.height); // debug
		
		// Draw blocks already landed
		for (var row = 0; row < landed.length; row++) {
			for (var col = 0; col < landed[row].length; col++) {
				if (landed[row][col] != 0) {
					//draw block position
					c.fillStyle = tetColor(landed[row][col]);
					c.fillRect(col * block_s, row * block_s, block_s, block_s);
				}
				//debug with second canvas
				/*if (landedBeforeFloodFill[row][col] != 0) {
					//draw block position
					c2.fillStyle = tetColor(landedBeforeFloodFill[row][col]);
					c2.fillRect(col * block_s, row * block_s, block_s, block_s);
				}*/
			}
		}
		
		//debug with second canvas
		/*c2.fillStyle = '#f00';
		c2.beginPath();
		c2.moveTo(0,0);
		c2.lineTo(0,20);
		c2.lineTo(20,20);
		c2.lineTo(20,0);
		c2.closePath();
		//c2.stroke();
		c2.fill();*/

		// Draw blocks in current Tet
		if (!newTet) {
			for (var row = 0; row < currentTet.shape.length; row++) {
				for (var col = 0; col < currentTet.shape[row].length; col++) {
					if (currentTet.shape[row][col] != 0) {
						//draw block position
						c.fillStyle = tetColor(currentTet.shape[row][col]);
						c.fillRect((col + currentTet.topLeft.col) * block_s, (row + currentTet.topLeft.row) * block_s, block_s, block_s);
					}
				}
			}
		}

	}
	
	function createTet() {
		if (newTet) currentTet = new Tet();
		//console.log(currentTet.shape);
		newTet = false;
		drawCanvas();
	}
	
	function blockDownLoop() {
		clearInterval(loop); // safe guard to prevent multiple loops from spawning before clearing it out first
		loop = setInterval(function(){
			if (dropOnce && newTet) clearInterval(loop);
			if (newTet) createTet();
			else currentTet.moveDown();
			drawCanvas();
		}, dropInterval);
	}
	
	document.onkeydown = function(e) { // http://www.javascripter.net/faq/keycodes.htm for keycodes
		//console.log('key downed: ' + e.keyCode);
		switch (e.keyCode) {
			case 32:
				//console.log('dropping');
				while (!newTet) {
					currentTet.moveDown();
				}
				drawCanvas();
				blockDownLoop();
				break;
			case 38:
				//console.log('rotating');
				currentTet.rotate();
				drawCanvas();
				break;
			case 37:
				//console.log('moving left');
				currentTet.moveLeft();
				drawCanvas();
				break;
			case 39:
				//console.log('moving right');
				currentTet.moveRight();
				drawCanvas();
				break;
			case 40:
				//console.log('moving down');
				var skip;
				if (newTet) skip = true;
				if (!skip) clearInterval(loop);
				currentTet.moveDown();
				drawCanvas();
				if (!skip) blockDownLoop();
				break;
			default:
				console.log('unrecognized key: ' + e.keyCode);
				clearInterval(loop);
		}
	}

	createTet();
	
	blockDownLoop();

}

//]]>
</script>
<style type="text/css">
<!--
#canvas, #canvas2 {
	border: 1px solid black;
	margin: 0 auto;
	display: block;
}
-->
</style>

</head>
<body>
<div id="main">
	<canvas id="canvas"></canvas> 
	<!--canvas id="canvas2"></canvas-->
</div><!--main-->
</body>
</html>
