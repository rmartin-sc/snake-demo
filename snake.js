
"use strict";

let BLOCK_SIZE = 40;                  // Number of pixels per gameboard grid block
const INITIAL_SNAKE_DIRECTION = 'R';    // One of R, L, U, or D
const INITIAL_SNAKE_SPEED = 5;    // One of R, L, U, or D
const DEFAULT_SNAKE_COLOR = "#721745";  

// In the objects below...
// - positions are always objects of the form {x,y} representing positions on the game board grid
// - directions are always one of 'L', 'R', 'U', or 'D' (left, right, up, down)

/**
 * Returns the number of pixels represented by a given size in gameboard blocks
 * @param sizeInBlocks The size to convert in terms of number of gameboard grid squares (blocks)
 * @param includeUnits Whether or not to include the 'px' unit in the returned value
 */
function px(sizeInBlocks, includeUnits=true) {
    let px = sizeInBlocks * BLOCK_SIZE;
    
    if ( includeUnits ) {
        px += 'px';
    }

    return px;
}

/**
 * @returns True if the two given positions are the same position on the game board
 * @param {object} p1 An object of the form {x,y} representing a position on the game baord
 * @param {object} p2 An object of the form {x,y} representing a position on the game baord
 */
function isPositionEqual(p1, p2) {
    return p1.x == p2.x && p1.y == p2.y;
}

const board = {
    el : document.getElementById('gameboard'),     // The gameboard element

    /**
     * Sizes the gameboard so that it takes up the maximum amount of space within the browser viewport
     * but has width and height dimensions that are multiples of the BLOCK_SIZE
     */
    resize : function() {

        const w = window.innerWidth;
        const h = window.innerHeight;

        // Size the board so there is a left/right margin by subtracting 2 grid block sizes from the window width
        const maxPxWidth = w - px(2, false);  
        // Size the board so there is a bottom margin by subtracting 1 grid block size from the window height
        // Also make room for the header element by removing its height (board.el.offsetTop) from the window height
        const maxPxHeight = h - this.el.offsetTop - px(1, false);

        // At this point boardPxW and boardPxH are the pixel maximum width and height dimensions of the board.
        // If we now divide these dimensions by BLOCK_SIZE and round down we have the grid size of the board.
        this.gridWidth = Math.floor(maxPxWidth / BLOCK_SIZE);
        this.gridHeight = Math.floor(maxPxHeight / BLOCK_SIZE);

        this.el.style.width = px(this.gridWidth);
        this.el.style.height = px(this.gridHeight);

        this.el.style.borderWidth = px(0.5);  // Give the gameboard a 1/2 BLOCK_SIZE border
    },

    /**
     * Place the given element at the correct pixel position for the given grid coordinates.
     * This function assumes that the given element has position:absolute and is positioned relative to #gameboard
     * 
     * @param el The element to position on the gameboard grid
     * @param gridPosition The position (an object of the form {x,y}) on the gameboard grid at which to place the given element
     */
    place : function(el, gridPosition) {
        el.style.top = px(gridPosition.y);
        el.style.left = px(gridPosition.x);
    },

    /**
     * Add the given DOM element to the board's DOM element
     * @param {HTMLElement} el The element to add to the board
     */
    add : function(el) {
        this.el.appendChild(el);
    },

    /**
     * Remove the given DOM element from the board's DOM element
     * @param {HTMLElement} el The element to remove from the board
     */
    remove : function(el) {
        this.el.removeChild(el);
    },

    /**
     * Removes all DOM elements from the game boad
     */
    clear : function() {

        while ( this.el.lastChild ) {
            this.el.removeChild(this.el.lastChild);
        }

    },

    /**
     * @returns {object} An object of the form {x,y} representing a random position on the game board
     */
    getRandomPosition : function() {
        return {
            x : Math.floor(Math.random() * this.gridWidth),
            y : Math.floor(Math.random() * this.gridHeight)
        };
    },

    /**
     * @returns {object} An object of the form {x,y} representing the grid position nearest the middle of the game board
     */
    getMidPosition : function() {
        return {
            x : Math.floor(this.gridWidth/2),
            y : Math.floor(this.gridHeight/2)
        };
    },

    /**
     * @returns {boolean} True if the given point lies inside the game board; false otherwise
     * @param {object} point An object of the form {x,y} representing a grid position
     */
    contains : function(point) {
        return point.x >= 0 && point.x < this.gridWidth && point.y >= 0 && point.y < this.gridHeight;
    }
}


/**
 * Represents an object that may be placed on the game board.  Eg, Food, or SnakeSegment.
 * Each PlaceableObject has a gridPosition (an instance of Point) and an 'el' property
 * which is a reference to the DOM element represented by the PlaceableObject.
 * 
 * PlaceableObjects should only be 1x1 elements in the gameboard grid.  Thus, SnakeSegment
 * is a PlaceableObject, but Snake is NOT, even though Snake does share some methods with 
 * PlaceableObject.
 */
class PlaceableObject {
    /**
     * @param {object} gridPosition An {x,y} object representing this object's position on the gameboard grid
     */
    constructor(el, gridPosition) {
        this.el = el;
        this.gridPosition = gridPosition;
    }

    /**
     * Add this object's DOM element to the board
     */
    addTo(board) {
        board.add(this.el);
    }

    /**
     * Place a food's DOM element at the food's position on the given board
     */
    placeOn(board) {
        board.place(this.el, this.gridPosition);
    }

    /**
     * Removes the food DOM element from the given board
     */
    removeFrom(board) {
        board.remove(this.el);
    }
}

class Food extends PlaceableObject {

    constructor(gridPosition) {
        let f = document.createElement('div');
        f.className = 'food';
        f.style.width = f.style.height = px(1);
        f.style.borderRadius = '50%';
        f.style.backgroundColor = 'green';

        super(f, gridPosition);

        this.value = 10;
    }
}

class SnakeSegment extends PlaceableObject {

    constructor(gridPosition, direction, color) {
        const segmentEl = document.createElement('div');

        segmentEl.className = 'snake-segment';

        segmentEl.style.backgroundColor = color;
        segmentEl.style.width = segmentEl.style.height = px(1);
        segmentEl.setAttribute('data-direction', direction);

        super(segmentEl, gridPosition);

        this._direction = direction;

    }

    /**
     * @returns The next position (an object of the form {x,y}) for the given snake segment, given its current direction
     */
    nextPosition() {
        switch( this.direction ) {
            case 'U':
                return {x: this.gridPosition.x, y: this.gridPosition.y-1};
            case 'D':
                return {x: this.gridPosition.x, y: this.gridPosition.y+1};
            case 'L':
                return {x: this.gridPosition.x-1, y: this.gridPosition.y};
            case 'R':
                return {x: this.gridPosition.x+1, y: this.gridPosition.y};
            default:
                return this.gridPosition;
        }
    }

    /**
     * @returns {string} The current direction of the segment
     */
    get direction() { return this._direction; }

    /**
     * Sets the direction of the segment
     * @param {string} direction One of 'L', 'R', 'U', 'D' (left, right, up, down)
     */
    set direction(direction) {
        this._direction = direction;
        this.el.setAttribute('data-direction', direction);
    }

}

class Snake {

    constructor(gridPosition, color) {

        this.color = color;

        const firstSegment = new SnakeSegment(gridPosition, INITIAL_SNAKE_DIRECTION, color);
        firstSegment.el.classList.add('head', true);
        firstSegment.el.classList.add('tail', true);

        this.segments = [ firstSegment ];
        this.score = 0;
        this.speed = INITIAL_SNAKE_SPEED;

    }

    /**
     * @returns The segment that represents the snake's head
     */
    getHead() {
        return this.segments[0];
    }

    /**
     * @returns The segment that represents the snake's tail
     */
    getTail() { 
        return this.segments[this.segments.length-1];
    }
    
    /**
     * Sets the direction of the snake's head to the given direction
     * @param {string} direction One of 'L', 'R', 'U', or 'D' (left, right, up, down)
     */
    setHeadDirection(direction) {
        this.getHead().direction = direction;
    }
            
    /**
     * Adds a new segment to the snake in the same position as the current tail
     */
    grow() {
        const tail = this.segments[this.segments.length-1];
        const newTail = new SnakeSegment(this.getTail().gridPosition, null, this.color);

        tail.el.classList.remove('tail'); 
        newTail.el.classList.add('tail');

        this.segments.push(newTail);
    }

    /**
     * @returns The next position of the snake's head, given its current direction
     */
    nextHeadPosition() {
        return this.getHead().nextPosition();
    }

    /**
     * Moves all the snake's segments in their current direction, and updates their directions
     * such that the segments follow the head
     */
    slither() {
        // nextDir will be the NEW direction of the segment being processed in each iteration of the loop below
        let nextDir = this.getHead().direction;
        for ( let s of this.segments ) {
            // Update the segment's position to its next position
            s.gridPosition = s.nextPosition();

            const oldDir = s.direction;  // Remember its current direction so we can use it as the next nextDir
            s.direction = nextDir;       // Update the segment's direction to the nextDir (which was the previous segments direction)
            nextDir = oldDir;            // Finally, set up nextDir for the next iteration
        }
    }

    /**
     * Adds all snake segment DOM elements to the given board
     */
    addTo(board) {  
        this.segments.forEach(s => s.addTo(board)); 
    }

    /**
     * Places all the segments of the snake at their current position on the given board
     */
    placeOn(board) {
        this.segments.forEach(s => s.placeOn(board));
    }

    /**
     * 'Kills' the snake by making each of its segments transparent
     */
    kill() {
        this.segments.forEach(s => s.el.style.opacity = '0.5');
    }

    /**
     * Increments the snake's score by the value of the given food, and causes the snake to grow
     */
    feed(food) {
        this.incrementScore(food.value);
        this.grow();
        this.incrementSpeed();
    }

    incrementScore(value) {
        this.score += value;
    }

    incrementSpeed() {
        this.speed *= 1.05;
    }

    /**
     * @returns true if any segment of the snake is on the given position
     * @param {object} position An object of the form {x,y} representing the position to check
     */
    isOnPosition(position) {
        for ( const seg of this.segments ) {
            if ( isPositionEqual(seg.gridPosition, position) ) { return true; }
        }
        return false;
    }

    /**
     * @returns true if the snake's head is at the given position
     * @param {object} position An object of the form {x,y} representing the position to check
     */
    isHeadOnPosition(position) {
        return isPositionEqual(this.getHead().gridPosition, position);
    }

    /**
     * @return The size of the snake
     */
    getSize() {
        return this.segments.length;
    }

}

// Since we extend the main Snake class, we ONLY need to specify the code
// that makes each snake subclass unique!
class HssishSnake extends Snake {
    incrementScore(value) {
        this.score += value + 2;
    }
}
class TssishSnake extends Snake {
    incrementSpeed() {
        this.speed *= 1.01
    }
}
class KssishSnake extends Snake {
    grow() {
        if ( Math.random() > 0.5 ) {
            return super.grow()
        }   
    }
}

/**
 * Show the given element by adding the 'show' class to it
 * @param {HTMLElement} el The element to show
 */
function show(el) {
    el.classList.add('show');
}

/**
 * Hide the given element by removing the 'show' class from it
 * @param {HTMLElement} el The element to show
 */
function hide(el) {
    el.classList.remove('show');
}

/**
 * Update the score element's text to reflect the current
 */
function updateGameStats(score, size, speed) {
    document.getElementById('score').innerText = score;
    document.getElementById('size').innerText = size;
    document.getElementById('speed').innerText = speed.toFixed(2) + ' blocks/sec';
}

// An object that keeps track of the overall game state
const game = {

    // Properties:

    board : board,
    snake : null,
    food : null,
    isPaused : false,
    timerId : null,

    // Methods:
        
    /**
     * @returns True if the game is over (the snake has hit a wall or one of its own segments)
     */
    isOver : function() {

        if ( this.snake === null ) { return false; }
        
        const nextHeadPosition = this.snake.nextHeadPosition();
            
        // Game is over if either the next head position is outside the board...
        return ! this.board.contains(nextHeadPosition) 
            || // ... or ...
            // The next position is the same as another segment's
            this.snake.isOnPosition(nextHeadPosition);
    },

    /**
     * Starts a new game
     */
    start : function() {
        this.reset();
        hide(document.getElementById('menu'));
        this.restartTimer();
    },

    /**
     * Pause/unpause the game
     */
    togglePause : function() {
        if ( this.isPaused ) {
            this.isPaused = false;
            hide(document.getElementById('paused'));
            this.restartTimer();
        } else {
            this.isPaused = true;
            show(document.getElementById('paused'));
            this.stopTimer();
        }
    },

    restartTimer : function() {
        if ( settings.isDebugModeOn() ) { return; }

        this.stopTimer();
        
        const interval = 1000 / this.snake.speed;
        this.timerId = setInterval(() => {
            this.update();
        }, interval);
    },

    stopTimer : function() {
        clearInterval(this.timerId);
    },
    
    /**
     * Change the snake direction AND update the game state
     * @param {string} direction One of 'L', 'R', 'U', 'D' (left, right, up, down)
     */
    updateDirection : function(direction) {
        this.snake.setHeadDirection(direction);
        this.update();
        this.restartTimer();
    },

    /**
     * Updates the game state based on the current location and direction of snake segments
     */
    update : function() {
        
        if ( this.isOver() ) {
            show(document.getElementById('game-over'));
            this.snake.kill();
            this.stopTimer();
            window.removeEventListener('keydown', handleKeyDown);
        } else {
            this.snake.slither();

            if ( this.snake.isHeadOnPosition(this.food.gridPosition) ) {
                this.snake.feed(this.food);
                this.restartTimer();
                this.snake.addTo(this.board);  // Required in order to get the new segment added onto the board

                this.food.removeFrom(this.board);

                // The current food has been eaten! Make a new one at a random location
                this.food = new Food(this.board.getRandomPosition());
                this.food.addTo(this.board);
                this.food.placeOn(this.board);

                updateGameStats(this.snake.score, this.snake.getSize(), this.snake.speed);
            }
            
            // Finally, place the snake segments at their updated positions
            this.snake.placeOn(this.board);  
        }
    },

    /**
     * Resets all necessary objects to a state ready for a new game
     */
    reset : function() {

        this.board.clear();
        this.board.resize();

        // Needs to happen after the board has been created and sized
        switch ( settings.snakeType(true) ) {
            case "s":
                this.snake = new Snake(this.board.getMidPosition(), settings.snakeColor());
                break;
            case "h":
                this.snake = new HssishSnake(this.board.getMidPosition(), settings.snakeColor());
                break;
            case "t":
                this.snake = new TssishSnake(this.board.getMidPosition(), settings.snakeColor());
                break;
            case "k":
                this.snake = new KssishSnake(this.board.getMidPosition(), settings.snakeColor());
                break;
                            
        }
        
        this.food = new Food(this.board.getRandomPosition());

        this.snake.addTo(this.board);
        this.food.addTo(this.board);

        this.snake.placeOn(this.board);
        this.food.placeOn(this.board);
        
        hide(document.getElementById('game-over'));

        updateGameStats(this.snake.score, this.snake.getSize(), this.snake.speed);
        document.getElementById('type').innerHTML = settings.snakeType();
        document.getElementById('name').innerHTML = settings.snakeName();

        window.addEventListener('keydown', handleKeyDown);

    },

    /**
     * Respond to a pressed key
     */
    keyDown : function(key) {

        if ( this.isPaused ) {
            if ( key === ' ' ) { 
                this.togglePause(); 
            }
        } else {
            switch(key) {
                case 'ArrowDown':
                    this.updateDirection('D');
                    break;
                case 'ArrowUp':
                    this.updateDirection('U');
                    break;
                case 'ArrowLeft':
                    this.updateDirection('L');
                    break;
                case 'ArrowRight':
                    this.updateDirection('R');
                    break;
                case ' ':
                    this.togglePause();
            }
        }
    }
}

const settings = {
    isDebugModeOn : function() {
        return document.getElementById('debug-mode-on').checked;
    },

    snakeColor : function() {
        return document.getElementById('snake-color').value;
    },

    blockSize : function() {
        return document.getElementById('block-size').value;
    },

    snakeType : function(getValue) {
        const typeCtrl = document.getElementById('snake-type');
        if ( getValue ) {
            return typeCtrl.value;
        } else {
            if ( typeCtrl.value ) {
                return typeCtrl.options[typeCtrl.selectedIndex].textContent;
            } else {
                return "";
            }
        }
    },

    snakeName : function() {
        return document.getElementById('snake-name').value;
    }

}

function handleKeyDown(event) {
    const handledKeys = [ 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', ' ' ]
    if ( handledKeys.includes(event.key) ) {
        game.keyDown(event.key);
    }
}

function validateName() {
    const name = settings.snakeName();
    const type = settings.snakeType(false);

    let validationMessage = "";

    
    if ( name ) {
        const startLetter = type[0];

        let re = new RegExp(`^${startLetter}`);
        if ( ! re.test(name) ) {
            validationMessage += `${type} names must start with '${startLetter}'. `;
        }

        re = new RegExp(` ([^-${startLetter}]|$)`);
        if ( re.test(name) ) {
            validationMessage += `Spaces in ${type} names must be followed by either '-' or '${startLetter}'. `;
        }

        re = new RegExp(`(^| )(${startLetter}( |$)|${startLetter}[Ss]( |$)|${startLetter}[Ss]*[^Ss ])`);
        if ( re.test(name) ) {
            validationMessage += `${type} hisses must start with a '${startLetter}' followed by at least two upper or lower case esses. `;
        }

        if ( /-$|-[^-<]|<[^ ]/.test(name) ) {
            validationMessage += `Tongue flicks must start with at least one hyphen and end with one '<'. `
        }

    }

    document.getElementById('snake-name').setCustomValidity(validationMessage);

}

function init() {

    window.addEventListener('beforeunload', function(event) {

        if ( ! game.isOver() && ! document.getElementById('menu').classList.contains('show') ) {
            event.preventDefault();
            event.returnValue = "You are in the middle of a game!  Are you sure you want to leave?";
        }
        
    });

    document.body.addEventListener('click', (event) => {
        if ( game.isOver() && ! event.target.classList.contains('snake-segment') ) { 
            show(document.getElementById('menu')); 
        }
    });

    document.forms[0].onsubmit = (e) => {
        game.start();
        e.preventDefault();
    };

    if ( location.search.includes('manual') ) {
        document.getElementById('debug-mode-on').checked = true;
    }

    document.getElementById('snake-color').value = DEFAULT_SNAKE_COLOR;

    document.getElementById('block-size').oninput = () => {
        BLOCK_SIZE = settings.blockSize();
        const blockSizePreview = document.getElementById('block-size-preview');
        blockSizePreview.style.width = px(1);
        blockSizePreview.style.height = px(1);
    }

    document.getElementById('snake-type').onchange = () => {
        let placeholder = "eg. ";

        switch ( settings.snakeType(true) ) {
            case "s":
                placeholder += "Sss SSss";
                break;
            case "h": 
                placeholder += "Hss HSSss";
                break;
            case "t":
                placeholder += "Tss TSSss";
                break;
            case "k":
                placeholder += "Kss KSSss";
                break;
        }

        placeholder += " --< ----<";
        document.getElementById('snake-name').placeholder = placeholder;
    }

    document.getElementById('snake-type').selectedIndex = -1;

    document.getElementById('snake-name').addEventListener('input', () => {

        const name = settings.snakeName();
        
        let strippedName = "";
        for ( let c of name ) {
            if ( "HKSsT -<".includes(c) ) {
                strippedName += c;
            }
        }

        document.getElementById('snake-name').value = strippedName;
    })

    document.getElementById('snake-name').addEventListener('input', () => {
        const name = settings.snakeName();
        const typeCtrl = document.getElementById('snake-type');

        if ( name === "" ) { return; }
    
        // Just look at the first character of the name and make the determination based on that
        switch ( name[0] ) {
            case 'S':
                typeCtrl.selectedIndex = 0;
                break;
            case 'H':
                typeCtrl.selectedIndex = 1;
                break;
            case 'T':
                typeCtrl.selectedIndex = 2;
                break;
            case 'K':
                typeCtrl.selectedIndex = 3;
                break;
            default:
                typeCtrl.selectedIndex = -1;
                break;
        }
    });

    document.getElementById('snake-name').addEventListener('input', () => {
        validateName();
    });

    document.getElementById('snake-type').addEventListener('change', () => {
        validateName();
    })
}

init();