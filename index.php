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
var loop,
    dropInterval = 750,
    currentTet;

// debug variables
var dropOnce = false;

// Returns the color of the Tet in HTML color code string form
function tetColor (type) {
	switch (type) { // Colors from http://en.wikipedia.org/wiki/Tetris#Colors_of_Tetriminos
		case 0: // Cyan
			return '#3cc'; //0ff
		case 1: // Blue
			return '#0af';
		case 2: // Orange
			return '#f90';
		case 3: // Yellow
			return '#ee0';
		case 4: // Green
			return '#0c0'; // 0f0
		case 5: // Purple
			return '#c0c';
		case 6: // Red
			return '#c00';
		default: // Black
			console.log('unexpected type (for color): ' + type);
			return '#fff';
	}
}

window.onload = function() {
	//canvas.style.width = canvas_width + 'px'; canvas.style.height = 2 * canvas_width + 'px';
	canvas.width = canvas_width; canvas.height = BOARD_ROW_NUM / BOARD_COL_NUM * canvas_width;
	var c = document.getElementById('canvas').getContext('2d');

	function drawCanvas () {
		//console.log('drawing canvas');
		c.clearRect(0, 0, canvas.width, canvas.height); // clear canvas
		
		// Draw blocks already landed
		var tetVisited = [], currLandedTetRef, lastLandedTetRef = null;
		for (var row = 0; row < BOARD_ROW_NUM; row++) {
			for (var col = 0; col < BOARD_COL_NUM; col++) {
				if (landed[row][col] != null) {
					currLandedTetRef = landed[row][col].ref;
					if (currLandedTetRef == lastLandedTetRef) continue;
					if (tetVisited.indexOf(currLandedTetRef) >= 0) continue;
					if (currLandedTetRef.type === -1) { landed[row][col] = null; continue; } // found a zombie Tet and removing it
					tetVisited.push(currLandedTetRef);
					//console.log(landed);
					//console.log(landed[row][col].pos);
					c.beginPath();

					c.moveTo((currLandedTetRef.topLeft.col + currLandedTetRef.perimeter[0][0]) * block_s, (currLandedTetRef.topLeft.row + currLandedTetRef.perimeter[0][1]) * block_s);
					for (var row = 1; row < currLandedTetRef.perimeter.length; row++) {
						c.lineTo((currLandedTetRef.topLeft.col + currLandedTetRef.perimeter[row][0]) * block_s, (currLandedTetRef.topLeft.row + currLandedTetRef.perimeter[row][1]) * block_s);
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
			// Draw perimeter in current Tet
			c.beginPath();
			//console.log(currentTet.perimeter);
			c.moveTo((currentTet.topLeft.col + currentTet.perimeter[0][0]) * block_s, (currentTet.topLeft.row + currentTet.perimeter[0][1]) * block_s);
			for (var row = 1; row < currentTet.perimeter.length; row++) {
				c.lineTo((currentTet.topLeft.col + currentTet.perimeter[row][0]) * block_s, (currentTet.topLeft.row + currentTet.perimeter[row][1]) * block_s);
			}
			c.closePath();
			c.lineJoin = 'miter';
			c.lineWidth = 3;
			c.fillStyle = tetColor(currentTet.type);
			c.fill();
			c.stroke();
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
</div><!--main-->
</body>
</html>
