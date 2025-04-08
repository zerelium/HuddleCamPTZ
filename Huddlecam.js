// Based on the Huddlecam VISCA protocol
// https://huddlecamhd.com/wp-content/uploads/2021/01/HuddlecamHD-VISCA-Command.pdf


import { SerialPort } from 'serialport';
import { EventEmitter } from 'events';

/**
 * @typedef {Object} CameraResponse
 * @property {String} command The command that was sent to the camera
 * @property {Boolean|Error} response The response from the camera
*/


const Exposure = {
	FullAuto: 0,
	Manual: 1,
	ShutterPriority: 2,
	IrisPriority: 3
};
const Direction = {
	Up: 0,
	Down: 1,
	Left: 2,
	Right: 3,
	UpLeft: 4,
	UpRight: 5,
	DownLeft: 6,
	DownRight: 7	
};		

class Huddlecam extends EventEmitter {
    constructor(path, baudRate) {
        super();
        this.path = path;
        this.baudRate = baudRate;
        this.serial = new SerialPort({ path, baudRate });

        // Forward all serial events to the EventEmitter
        this.serial.on('open', () => this.emit('open'));
        this.serial.on('close', () => this.emit('close'));
        this.serial.on('data', (data) => this.emit('data', data));
        this.serial.on('error', (error) => this.emit('error', error));


        // States
        this.power = "Unknown";
        this.backlight = false;
        this.position = null;
        this.focus = "Unknown";
        this.whiteBalance = "Unknown";
        this.exposure = "Unknown";
        this.shutterPos = null;
        this.irisPos = null;
        this.videoFormat = "Unknown";
        this.panTiltPos = null;
        this.colorFormat = "Unknown";
    }

    /**
     * Helper function to send a command to the camera
     * 
     * @param {String} cmd The VISCA command to send
     * @param {Boolean} [inquiry=false] Whether the command is an inquiry, defaults to false. If it is, wait for a response.
     * @returns {Promise<CameraResponse>} The response from the camera
     * 
     * @example
     * Camera.sendCommand('81 01 04 07 02 FF');
     * Camera.sendCommand('8101040702FF'); // Both are equivalent
    */
    sendCommand(cmd, inquiry = false) {
        return new Promise((resolve, reject) => {
            var State = { command: cmd, response: '' };
            this.serial.write(Buffer.from(cmd.replace(/\s+/g, ''), 'hex'), (err) => {
                if(err) {
                    State.response = err;
                    reject(State);
                } else {
                    if(inquiry) {
                        this.once('data', (data) => {
                            State.response = data.toString('hex');
                            resolve(State);
                        });
                    } else {
                        State.response = true;
                        resolve(State);
                    }
                }
            });
        });
    }

    /** 
     * Cancel any ongoing VISCA command on the camera. 
     * 
     * @param {Number} [socket=1] The socket to cancel the command on (1-2)
     * @returns {Promise<CameraResponse>} The response from the camera
     * 
     * @example
     * Camera.cancelCommand(1);
     * Camera.cancelCommand(); // Both are equivalent
    */ 
    cancelCommand(socket = 1) {
        if(socket < 1) socket = 1;
        if(socket > 2) socket = 2;
        const socketHex = socket.toString(16).padStart(2, '0');
        return this.sendCommand(`8x 2${socketHex} FF`);
    }

    powerOn() {
        return this.sendCommand('81 01 04 00 02 FF');
    }
    powerOff() {
        return this.sendCommand('81 01 04 00 03 FF');
    }

    //focus

    //zoomFocus // TODO: My camera zoom is broken, but I should implement this

    //whiteBalance // These commands are missing from the VISCA protocol

    /**
     * Set the exposure mode of the camera
     * 
     * @param {Number} mode The exposure mode to set. 0 = Full Auto, 1 = Manual, 2 = Shutter Priority, 3 = Iris Priority
	 * @returns {Promise<CameraResponse>} The response from the camera
	 * 
	 * @example
	 * Camera.exposureMode(Exposure.ShutterPriority);
	 * Camera.exposureMode(2); // Both are equivalent
     */
    exposureMode(mode) {
        if(mode < 0) mode = 0;
        if(mode > 3) mode = 3;
        
        var b = '';
        switch(mode) {
            case 0: b = '0'; break; // Full Auto
            case 1: b = '3'; break; // Manual
            case 2: b = 'A'; break; // Shutter Priority
            case 3: b = 'B'; break; // Iris Priority
        };

        return this.sendCommand(`81 01 04 07 0${b} FF`);
    }

    // shutterPos

    // irisPos

    toggleBacklight() {
    }

    backlightOn() {
        return this.sendCommand('81 01 04 33 02 FF');
    }
    backlightOff() {
        return this.sendCommand('81 01 04 33 03 FF');
    }


    /** ===== PAN-TILT ===== */
    /**
     * Helper function to get the hex value of the pan speed.
     * 
     * @param {Number} speed A number between 1-18 
     * @returns {String} The hex value of the pan speed
    */
    getPanSpeed(speed) {
        if(speed < 1) speed = 1;
        if(speed > 18) speed = 18;

        return speed.toString(16).padStart(2, '0');
    }
    /**
     * Helper function to get the hex value of the tilt speed.
     * 
     * @param {Number} speed A number between 1-14 
     * @returns {String} The hex value of the tilt speed
    */
    getTiltSpeed(speed) {
        if(speed < 1) speed = 1;
        if(speed > 14) speed = 14;

        return speed.toString(16).padStart(2, '0');
    }

    /**
     * Move the camera using the tilt functionality.
     * Must be followed by a stop command to stop the camera.
     * 
	 * @param {Number} direction The direction to move the camera in (1-8). 1 = Up, 2 = Down, 3 = Left, 4 = Right, 5 = Up-Left, 6 = Up-Right, 7 = Down-Left, 8 = Down-Right
     * @param {Number} ps        The speed to pan the camera at (1-18).
     * @param {Number} ts        The speed to tilt the camera at (1-14).
     * @returns {Promise<CameraResponse>} The response from the camera
	 * 
	 * @example
	 * Camera.move(1, 3); // Move the camera up at speed 3
	 * Camera.move(2, 7); // Move the camera down at speed 7
    */
    move(direction, ps = 5, ts = 3) {
		const panSpeed = this.getPanSpeed(ps); // We dont use panning
		const tiltSpeed = this.getTiltSpeed(ts); // Tilt provides continuous movement

		// console.log('called move', direction, panSpeed, tiltSpeed);

		switch(direction) {
			case 0: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 03 01 FF`); // Up
			case 1: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 03 02 FF`); // Down
			case 2: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 01 03 FF`); // Left
			case 3: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 02 03 FF`); // Right
			case 4: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 01 01 FF`); // Up-Left
			case 5: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 02 01 FF`); // Up-Right
			case 6: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 01 02 FF`); // Down-Left
			case 7: return this.sendCommand(`81 01 06 01 ${panSpeed} ${tiltSpeed} 02 02 FF`); // Down-Right
		}
    }

	/**
	 * Move the camera to an absolute/relative position.
	 * 
	 * @param {Number} ps   Pan speed 
	 * @param {Number} ts   Tilt speed
	 * @param {Number} pan  A number between 0-2016 
	 * @param {Number} tilt A number between 0-456
	 * @param {Boolean} [relative=false] Whether the position is relative or absolute, defaults to false
	 * @returns {Promise<CameraResponse>} The response from the camera
	 * 
	 * @example
	 * Camera.position(3, 3, 1008, 228); // Move the camera to the "center"
	 * Camera.position(3, 3, 0, 0); // Move the camera to the bottom-left
	 * Camera.position(3, 3, 2016, 456); // Move the camera to the top-right
	 */
	position(ps, ts, pan, tilt, relative = false) { // This is semi-broken. Cant seem to get relative position to get negative. Also cannot tilt down?
		const panSpeed = this.getPanSpeed(ps);
		const tiltSpeed = this.getTiltSpeed(ts);

		const panPos = pan.toString(16).padStart(4, '0');
		const tiltPos = tilt.toString(16).padStart(4, '0');

		const rel = relative ? '03' : '02';

		var command = `81 01 06 ${rel} ${panSpeed} ${tiltSpeed} 0${panPos[0]} 0${panPos[0]} 0${panPos[2]} 0${panPos[3]} 0${tiltPos[0]} 0${tiltPos[1]} 0${tiltPos[2]} 0${tiltPos[3]} FF`;
		return this.sendCommand(command);
	}

    stop() {
        return this.sendCommand('81 01 06 01 00 00 03 03 FF');
    }
    /**
     * Return the camera to its home position.
     * @returns {Promise<CameraResponse>} The response from the camera
     */
    home() {
        return this.sendCommand('81 01 06 04 FF');
    }
    /**
     * Reset the camera. Essentially the same as power cycling the camera.
     * It will run through its startup sequence.
     * @returns {Promise<CameraResponse>} The response from the camera
     */
    reset() {
        return this.sendCommand('81 01 06 05 FF');
    }


    /** ===== INQUIRIES ===== */

    /**
     * Poll the camera for its power state.
     * Will return "On", "Off (standby)" or "Internal power circuit error".
     * @returns {Promise<String>} The power state of the camera
     */
    async powerInquiry() {
        const res = await this.sendCommand('81 09 04 00 FF', true);
        const b = res.response[5];
        switch(b) {
            case '2': return "On";
            case '3': return "Off (standby)";
            case '4': return "Internal power circuit error";
        };
        
        return "Unknown";
    }

	async positionInquiry() {
        const res = await this.sendCommand('81 09 06 12 FF', true);
        console.log(res.response)
		const pan = parseInt(res.response.slice(5, 9), 16);
		const tilt = parseInt(res.response.slice(9, 13), 16);

        return null;
		// return { pan, tilt };
	}
    
    async focusInquiry() {
        const res = await this.sendCommand('81 09 04 38 FF', true);
        const b = res.response[5];
        switch(b) {
            case '2': return "Auto";
            case '3': return "Manual";
        };

        return "Unknown";
    }

    async whiteBalanceInquiry() {
        const res = await this.sendCommand('81 09 04 35 FF', true);
        const b = res.response[5];
        switch(b) {
            case '0': return "Auto";
            case '1': return "In Door";
            case '2': return "Out Door";
            case '3': return "One Push WB";
            case '5': return "Manual";
        };

        return "Unknown";
    }

    async exposureInquiry() {
        const res = await this.sendCommand('81 09 04 39 FF', true);
        const b = res.response[5];
        switch(b) {
            case '0': return "Full Auto";
            case '3': return "Manual";
            case 'A': return "Shutter Priority";
            case 'B': return "Iris Priority";
        };

        return "Unknown";
    }

    async shutterPosInquiry() { return null; }
    async irisPosInquiry() { return null; }

    async backlightInquiry() {
        const res = await this.sendCommand('81 09 04 33 FF', true);
        const b = res.response[5];
        switch(b) {
            case '2': return "On";
            case '3': return "Off";
        };

        return "Unknown";
    }

    async videoFormatInquiry() {
        const res = await this.sendCommand('81 09 06 23 FF', true);
        const b = res.response[5];
        switch(b) {
            case '1': return "1920x1080p/30";
            case '2': return "1920x1080i/60";
            case '3': return "1280x720p/60";
            case '9': return "1920x1080p/25";
            case 'A': return "1920x1080i/50";
            case 'B': return "1280x720p/50";
            case 'D': return "";
        };

        return "Unknown";
    }

    async panTiltPosInquiry() { return null; }

    async colorFormatInquiry() {
        const res = await this.sendCommand('81 09 7E 01 03 FF', true);
        const b = res.response[5];
        switch(b) {
            case '0': return "RGB";
            case '1': return "YPbPr";
        };

        return "Unknown";
    }
};

export { Huddlecam, Exposure, Direction };