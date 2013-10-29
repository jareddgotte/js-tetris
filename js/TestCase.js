Game.prototype.testCase = function (n) {
	var tmp;
	switch (n) {
		case 1: // Check T (rotated once) single row (middle) deletion
			tmp = new Tet(this, 3);
			tmp.topLeft = { row: 14, col: 0 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 5);
			tmp.rotate();
			tmp.topLeft = { row: 13, col: 2 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 1);
			tmp.topLeft = { row: 14, col: 4 };
			this.allTets.push(tmp);
			// Falling Tet
			tmp = new Tet(this, 1);
			tmp.topLeft = { row: 14, col: 7 };
			this.currentTet = tmp;
			break;
		case 2: // Check I (rotated once) double row (middle) deletion
			tmp = new Tet(this, 3);
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
			// Falling Tet
			tmp = new Tet(this, 0);
			tmp.rotate();
			tmp.topLeft = { row: 11, col: 3 };
			this.currentTet = tmp;
			break;
		case 3: // Check I (rotated once) single row (middle) deletion
			tmp = new Tet(this, 3);
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
			// Falling Tet
			tmp = new Tet(this, 0);
			tmp.rotate();
			tmp.topLeft = { row: 11, col: 3 };
			this.currentTet = tmp;
			break;
		case 4: // Check if cascade alg works - dependant order
			tmp = new Tet(this, 5); // T
			tmp.rotate();
			tmp.rotate();
			tmp.rotate();
			tmp.topLeft = { row: 13, col: 0 };
			this.allTets.push(tmp);
			tmp = new Tet(this, -1); // 2x1 fragment
			var shape = [[1],[1]];
			tmp.setShape(shape);
			tmp.topLeft = { row: 14, col: 3 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 5); // T
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 3 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 2); // L
			tmp.topLeft = { row: 10, col: 4 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 1); // J
			tmp.rotate();
			tmp.rotate();
			tmp.rotate();
			tmp.topLeft = { row: 9, col: 3 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 0); // I
			tmp.topLeft = { row: 15, col: 5 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 3); // O
			tmp.topLeft = { row: 13, col: 5 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 3); // O
			tmp.topLeft = { row: 13, col: 7 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 0); // I
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 9 };
			this.allTets.push(tmp);
			// Falling Tet
			tmp = new Tet(this, 2); // L
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 1 };
			this.currentTet = tmp;
			break;
		case 5: // Check if cascade alg works - double delete
			tmp = new Tet(this, 1); // J
			tmp.rotate();
			tmp.rotate();
			tmp.rotate();
			tmp.topLeft = { row: 13, col: 0 };
			this.allTets.push(tmp);
			tmp = new Tet(this, -1); // 1x1 fragment
			var shape = [[1]];
			tmp.setShape(shape);
			tmp.topLeft = { row: 15, col: 1 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 0); // I
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 3 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 3); // O
			tmp.topLeft = { row: 14, col: 4 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 3); // O
			tmp.topLeft = { row: 14, col: 6 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 3); // O
			tmp.topLeft = { row: 14, col: 8 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 5); // T
			tmp.rotate();
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 4 };
			this.allTets.push(tmp);
			tmp = new Tet(this, 5); // T
			tmp.rotate();
			tmp.rotate();
			tmp.topLeft = { row: 12, col: 7 };
			this.allTets.push(tmp);
			// Falling Tet
			tmp = new Tet(this, 2); // L
			tmp.rotate();
			tmp.topLeft = { row: 11, col: 1 };
			this.currentTet = tmp;
			break;
		default: // Do nothing
			console.log('Test Case: ' + n + ' does not exist.  Resetting.');
			this.currentTet = null;
			this.dropOnce = false;
			this.newTet = true;
			this.nextTet = null;
			this.paused = false;
			return;
	}

	console.log('Test Case: ' + n);
	// Do not change these vars
	this.dropOnce = true;
	this.newTet = false;
	this.paused = true;
	this.updateLanded = true;
}
