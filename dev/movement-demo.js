const http = require('http');
const { URL } = require('url');

const { RobotMovement } = require('../src/core/RobotMovement');

const robot = new RobotMovement(10, {
    x: 1,
    y: 1,
    direction: 'EAST'
});

function renderPage(message = '') {
    const state = robot.getState();

    const arrows = {
        NORTH: '^',
        EAST: '>',
        SOUTH: 'v',
        WEST: '<'
    };

    let grid = '';

    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 10; x++) {
            if (x === state.x && y === state.y) {
                grid += '<div class="tile robot">ROBOT<br>' +
                    arrows[state.direction] +
                    '</div>';
            } else {
                grid += '<div class="tile"></div>';
            }
        }
    }

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Robot Movement Core Demo</title>

<style>
body {
    margin: 0;
    background: #111;
    color: white;
    font-family: monospace;
    text-align: center;
}

h1 {
    margin-top: 30px;
}

#state {
    font-size: 20px;
    margin: 20px;
}

#grid {
    width: 500px;
    height: 500px;
    margin: auto;
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    grid-template-rows: repeat(10, 1fr);
    border: 3px solid white;
}

.tile {
    border: 1px solid #333;
    box-sizing: border-box;
}

.robot {
    background: #333;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-weight: bold;
}

.controls {
    margin: 25px;
}

button {
    font-family: monospace;
    font-size: 16px;
    padding: 12px 20px;
    margin: 5px;
}

.message {
    margin: 20px;
    min-height: 20px;
}
</style>
</head>

<body>

<h1>ROBOT MOVEMENT CORE</h1>

<div id="state">
X: ${state.x} |
Y: ${state.y} |
Direction: ${state.direction}
</div>

<div id="grid">
${grid}
</div>

<div class="controls">

<form method="GET" action="/turn-left" style="display:inline">
<button type="submit">TURN L</button>
</form>

<form method="GET" action="/move" style="display:inline">
<button type="submit">MOVE</button>
</form>

<form method="GET" action="/turn-right" style="display:inline">
<button type="submit">TURN R</button>
</form>

<form method="GET" action="/reset" style="display:inline">
<button type="submit">RESET</button>
</form>

</div>

<div class="message">
${message}
</div>

</body>
</html>
`;
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost:3001');

    try {
        if (url.pathname === '/move') {
            const result = robot.move();

            res.writeHead(302, {
                Location: '/'
            });

            res.end();
            return;
        }

        if (url.pathname === '/turn-left') {
            robot.turnLeft();

            res.writeHead(302, {
                Location: '/'
            });

            res.end();
            return;
        }

        if (url.pathname === '/turn-right') {
            robot.turnRight();

            res.writeHead(302, {
                Location: '/'
            });

            res.end();
            return;
        }

        if (url.pathname === '/reset') {
            robot.reset({
                x: 1,
                y: 1,
                direction: 'EAST'
            });

            res.writeHead(302, {
                Location: '/'
            });

            res.end();
            return;
        }

        if (url.pathname === '/') {
            res.writeHead(200, {
                'Content-Type': 'text/html; charset=utf-8'
            });

            res.end(renderPage());
            return;
        }

        res.writeHead(404);
        res.end('Not found');

    } catch (error) {
        res.writeHead(500, {
            'Content-Type': 'text/plain'
        });

        res.end(error.message);
    }
});

server.listen(3001, () => {
    console.log('');
    console.log('====================================');
    console.log(' ROBOT MOVEMENT VISUAL TEST');
    console.log('====================================');
    console.log('');
    console.log('Open: http://localhost:3001');
    console.log('');
});
