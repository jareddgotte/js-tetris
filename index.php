<!DOCTYPE html>
<html>
<head>

<meta name="description" content="A Tetris game made explicitly with HTML5, JavaScript, and without jQuery and other JS libraries.">
<meta name="keywords" content="HTML5,CSS,JavaScript,Tetris,Game">
<meta name="author" content="Jared Gotte">
<meta charset="UTF-8">
<title>Tetris</title>

<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/main.css">

<script src="js/Tetris.js"></script>
<script>
//<![CDATA[

// The collision detection is mostly inspired from the article: http://gamedev.tutsplus.com/tutorials/implementation/implementing-tetris-collision-detection/ (by Michael James Williams on Oct 6th 2012)
// The reason why I did not entirely come up with my own algorithms for everything is for the sake of time

// Most of the standards I used for Tetris came from http://en.wikipedia.org/wiki/Tetris

window.onload = function() {
	Game('canvas');
}

//]]>
</script>
<style>
#canvas {
	border: 1px solid black;
	margin: 0 auto;
	display: block;
}
</style>
</head>
<body>

<div id="main">
	<canvas id="canvas"></canvas> 
</div><!--main-->

</body>
</html>
