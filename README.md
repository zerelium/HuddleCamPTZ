# HuddleCamPTZ

This is a personal project that provides:
1. A Node.js library for controlling HuddleCamHD cameras using the VISCA protocol.
2. A web-based GUI for basic camera control via WebSocket.

The Node.js library offers extensive functionality, while the GUI focuses on simplicity, currently supporting pan-tilt control with plans to add zoom.

<br/>

## Features

### Node.js Library
- Core VISCA protocol commands:
	- Power, pan-tilt, exposure, backlight, reset, and home.
- Advanced features:
	- Absolute/relative positioning and inquiry commands.

### Web-Based GUI
- Pan-tilt control with adjustable speed.
- Real-time WebSocket communication.
- Keyboard support.
- Planned zoom functionality (untested due to hardware limitations).
<br/>

## Getting Started

### Prerequisites
- Node.js >= 14.0.0
- npm >= 6.0.0
- A HuddleCamHD camera

### Installation
1. Clone the repository:
	 ```bash
	 git clone https://github.com/zerelium/HuddleCamPTZ
	 cd HuddleCamPTZ
	 ```
2. Install dependencies:
	 ```bash
	 npm install
	 ```
3. Configure `.env`:
	 ```plaintext
	 PORT=3000
	 SERIAL_PORT=/dev/ttyUSB0
	 BAUDRATE=9600
	 ```

### Running the Application
- Start the server:
	```bash
	npm start
	```
- Open the GUI at `http://localhost:PORT`.
<br/>

## Usage

### Node.js Library
Example usage:
```javascript
import { Huddlecam, Direction } from './Huddlecam.js';

const camera = new Huddlecam('/dev/ttyUSB0', 9600);
camera.on('open', () => {
	console.log('Camera connected');
	camera.move(Direction.Up, 8, 4);
});
```

### Web-Based GUI
- Use on-screen controls or arrow keys for pan-tilt.
- Adjust speed with sliders.
- Enable video feed for live output.
<br/>

## Limitations
- GUI zoom control is pending hardware testing.
- Some VISCA commands are not implemented.
<br/>

## Future Plans
- Extend the Node.js library with more commands.
- Add zoom to the GUI.
- Enhance the GUI with presets and advanced settings.
- Provide the library via NPM.

---
Licensed under ISC.
