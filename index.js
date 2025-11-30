// Import dependencies
import http from "http";
import express from 'express';
import { Server as SocketIOServer } from "socket.io";
import dotenv from 'dotenv';
import path from "path";
import { Huddlecam, Direction, Exposure } from './Huddlecam.js';
import readline from 'readline';

dotenv.config();

// Get camera settings
const serialPORT = process.env.SERIAL_PORT;
const baudRate = process.env.BAUDRATE;
if(!serialPORT) {
	console.log('Please provide `SERIAL_PORT` in the .env file');
	process.exit(1);
}
if(!baudRate) {
	console.log('Please provide `BAUDRATE` in the .env file');
	process.exit(1);
}

// Setup camera
const Camera = new Huddlecam(serialPORT, parseInt(baudRate));
// Camera.on('data', (data) => console.log('Camera data:', data.toString('hex')));
Camera.on('error', (error) => console.error('Camera error:', error));
Camera.on('close', () => console.log('Camera is disconnected'));
Camera.on('open', () => { console.log('Camera is connected'); 
	Camera.home();

	// Open cli input so we can eval commands
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: false // Fixes duplicated input
	});

	// Evaluate commands from the command line
	rl.on('line', async (input) => {
		// input = input.trim();
		if(input.length === 0) return;


		try {
			const cmd = `Camera.${input};`;

			var timeStart = Date.now();
			const res = await eval(cmd);
			var timeEnd = Date.now();
			var t = timeEnd - timeStart;

			// Print out a nice formatted log line of what command was run, how long it took, and the response
			// console.log(res);
			console.log(`\x1b[32m${cmd}\x1b[0m took \x1b[33m${t}ms\x1b[0m and returned \x1b[36m${JSON.stringify(res)}\x1b[0m`);
		} catch(err) {
			console.error(err);
		}
	});
});


// Setup web app
const webPORT = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'public')));

// Setup the socket.io interface
io.on('connection', (socket) => {
	console.log('A user connected');
	socket.on('disconnect', () => {
		console.log('User disconnected');
	});

	socket.on('reset', () => {
		Camera.reset();
	});
	socket.on('home', () => {
		Camera.home();
	});
	socket.on('move', (direction, panSpeed, tiltSpeed) => {
		Camera.move(direction, panSpeed, tiltSpeed);
	});
	socket.on('getPosition', () => {
		Camera.positionInquiry().then((position) => {
			socket.emit('position', position);
		});
	});
	socket.on('moveTo', (panSpeed, tiltSpeed, x, y, W, H, relative) => {
		Camera.moveTo(panSpeed, tiltSpeed, x, y, W, H, relative); // TODO
	})
	socket.on('moveStop', () => {
		Camera.stop();
	})
});

// Start the web server
server.listen(webPORT, () => {
	console.log(`Web server listening on port ${webPORT}`);
});