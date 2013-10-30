<!DOCTYPE html>
<html>
<head>

<meta name="description" content="A Tetris game made explicitly with HTML5, JavaScript, and without jQuery and other JS libraries.">
<meta name="keywords" content="HTML5,JavaScript,Tetris,Game,Asynchronous,CSS3">
<meta name="author" content="Jared Gotte">
<meta charset="UTF-8">
<title>Tetris</title>

<link rel="stylesheet" href="css/reset.css">
<link rel="stylesheet" href="css/main.css">

<script src="js/Tetris.js"></script>
<script src="js/TestCase.js"></script>
<script>
window.onload = function() {
	Game('canvas', 'high_score_list', 1);
}
</script>
</head>
<body>

<div id="main">
	<!-- Banner inspired from font: The FontStruction "Tetromino (by Piotr Klarowski)" (http://fontstruct.com/fontstructions/show/118906) by "ecaGraphics" -->
	<img id="tetris_banner" src="img/TETRIS.png" alt="TETRIS">
	<div class="panel" id="public_controls">
		<h2>Controls</h2>
		<ul>
			<li><h3>Control</h3><h3>Key</h3></li>
			<li><div><span>Rotate</span></div><span><b>Up</b> Arrow Key</span></li>
			<li><div><span>Move Left</span></div><span><b>Left</b> Arrow Key</span></li>
			<li><div><span>Move Right</span></div><span><b>Right</b> Arrow </span></li>
			<li><div><span>Move Down</span></div><span><b>Down</b> Arrow </span></li>
			<li><div><span>Instantly Move Down</span></div><span><b>Space</b> Bar</span></li>
			<br>
			<li><div><span>Pause Game</span></div><span><b>S</b> or <b>P</b> Key</span></li>
			<li><div><span>Restart Game</span></div><span><b>R</b> Key</span></li>
		</ul>
	</div><!--panel-->
	<canvas id="canvas"></canvas> 
	<div class="panel" id="high_scores">
		<h2>High Scores</h2>
		<ol id="high_score_list"></ol>
	</div><!--panel-->
</div><!--main-->
<div id="footer">
	<span>&copy; 2013 <a href="http://www.jaredgotte.com" target="_blank">Jared Gotte</a>. Apache License 2.0.</span>
</div><!--footer-->

</body>
</html>
