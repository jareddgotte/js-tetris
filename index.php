<!DOCTYPE html>
<html lang="en">
<head>
	<title>Tetris</title>

	<meta charset="UTF-8">
	<meta name="description" content="A Tetris game made explicitly with HTML5, JavaScript, and without jQuery and other JS libraries.">
	<meta name="keywords" content="HTML5,JavaScript,Tetris,Game,Asynchronous,CSS3">
	<meta name="author" content="Jared Gotte">

	<link rel="stylesheet" href="css/reset.css">
	<link rel="stylesheet" href="css/main.css">
</head>
<body>
	<main id="main">
		<!-- Banner inspired from font: The FontStruction "Tetromino (by Piotr Klarowski)" (http://fontstruct.com/fontstructions/show/118906) by "ecaGraphics" -->
		<h1><img id="tetris_banner" src="img/TETRIS.png" alt="Tetris logo"></h1>
		<section class="panel" id="public_controls" aria-labelledby="public_controls-title">
			<h2 id="public_controls-title">Controls</h2>
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
		</section><!--panel-->
		<canvas id="canvas"></canvas>
		<section class="panel" id="high_scores" aria-labelledby="high_scores-title">
			<h2 id="high_scores-title">High Scores</h2>
			<ol id="high_score_list"></ol>
		</section><!--panel-->
	</main><!--main-->
	<div id="footer">
		<span>&copy; 2013&ndash;2018 <a href="http://www.jaredgotte.com" target="_blank">Jared Gotte</a>. Apache License 2.0.</span>
	</div><!--footer-->

	<script src="js/Tetris.js"></script>
	<script src="js/TestCase.js"></script>
	<script>
		Game('canvas', 'high_score_list');
	</script>
</body>
</html>
