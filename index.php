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

<script type="text/javascript" src="js/Tet.js"></script>
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

// Returns the color of the Tet in HTML color code string form
function tetColor (color) {
	switch (color) { // Colors from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
		case 1: // Cyan
			return '#3cc'; //0ff
		case 2: // Blue
			return '#00c';
		case 3: // Orange
			return '#f90';
		case 4: // Yellow
			return '#ee0';
		case 5: // Green
			return '#0c0'; // 0f0
		case 6: // Purple
			return '#c0c';
		case 7: // Red
			return '#c00';
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
