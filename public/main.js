import io from 'https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.8.1/socket.io.esm.min.js';

const socket = io();
socket.on('connect', () => {
    console.log('Connected to server');
});

window.panSpeed = 8;
window.tiltSpeed = 4;


// Add a check to the show-feed checkbox
// If its true, we want to display the webcam feed in the video element
const showFeed = document.querySelector('input#show-feed');
const videoFeed = document.querySelector('video#feed');

showFeed.addEventListener('change', () => {
    if(showFeed.checked) {
        videoFeed.style.display = 'block';
        videoFeed.srcObject = new MediaStream();
        navigator.mediaDevices.getUserMedia({ video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        } })
            .then(stream => {
                videoFeed.srcObject = stream;
                // Resize the videoFeed object to fit the video
                // Get the video resolution and set it to the video element
                // videoFeed.style.width = stream.getVideoTracks()[0].getSettings().width + 'px';
                // videoFeed.style.height = stream.getVideoTracks()[0].getSettings().height + 'px';
            })
            .catch(err => {
                console.error(err);
            });
    } else {
        videoFeed.style.display = 'none';
        videoFeed.srcObject = null;
    }
});

// Add a click event to the video feed to send a command to the server to move to that position
videoFeed.addEventListener('click', (event) => {
    let x = event.offsetX / videoFeed.clientWidth;
    let y = event.offsetY / videoFeed.clientHeight;

    socket.emit('position', x, y, panSpeed, tiltSpeed);
});

const sliders = document.querySelectorAll('input[type="range"]');
sliders.forEach(slider => {
    slider.addEventListener('input', () => {
        switch(slider.name) {
            case 'panSpeed': panSpeed = slider.value; break;
            case 'tiltSpeed': tiltSpeed = slider.value; break;
        }

        document.querySelector(`span#${slider.name}`).textContent = slider
            .value
            .toString()
            .padStart(2, '0');
    });
});

const bnts = document.querySelectorAll('btn');
bnts.forEach(btn => {
    var state = false;
    btn.addEventListener('mousedown', () => {
        let dir = btn.getAttribute('dir');
        // If dir is not a number, then its the home button
        if(isNaN(dir)) {
            socket.emit('home');
            return;
        }
        dir = Number(dir);

        socket.emit('move', dir, panSpeed, tiltSpeed);
        state = true;
    });
    btn.addEventListener('mouseup', () => {
        if(state) { 
            socket.emit('moveStop');
            state = false;
        }
    });
    btn.addEventListener('mouseleave', () => {
        if(state) { 
            socket.emit('moveStop');
            state = false;
        }
    });
});

// Arrow key support to the whole page
var keys = {
    Up: false,
    Down: false,
    Left: false,
    Right: false
}
document.addEventListener('keydown', (e) => {
    let dir = null; let alreadyPressed = false;
    switch(e.key) {
        case 'ArrowUp': {
            if(keys.Up) alreadyPressed = true;
            dir = 0; 
            keys.Up = true; 
            break;
        }
        case 'ArrowDown': {
            if(keys.Down) alreadyPressed = true;
            dir = 1; 
            keys.Down = true; 
            break;
        }
        case 'ArrowLeft': {
            if(keys.Left) alreadyPressed = true;
            dir = 2; 
            keys.Left = true; 
            break;
        }
        case 'ArrowRight': {
            if(keys.Right) alreadyPressed = true;
            dir = 3; 
            keys.Right = true; 
            break;
        }
    }

    if(dir !== null && !alreadyPressed) {
        // Add the active state to the button
        document.querySelector(`btn[dir="${dir}"]`).classList.add('active');

        socket.emit('move', dir, panSpeed, tiltSpeed);
    }
});
document.addEventListener('keyup', (e) => {
    let dir = null;
    switch(e.key) {
        case 'ArrowUp': dir = 0; keys.Up = false; break;
        case 'ArrowDown': dir = 1; keys.Down = false; break;
        case 'ArrowLeft': dir = 2; keys.Left = false; break;
        case 'ArrowRight': dir = 3; keys.Right = false; break;
    }
    // Add the active state to the button
    document.querySelector(`btn[dir="${dir}"]`).classList.remove('active');
    
    socket.emit('moveStop');
        // let anyKey = Object.values(keys).some(v => v);
    // if(!anyKey) {
    //     socket.emit('moveStop');
    // }
});
