<!DOCTYPE html>
<html>
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

window.onload = function() {
	Game('canvas');
}

//]]>
</script>
<style type="text/css">
<!--
#canvas {
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
