let mediaRecorder;
let recordedChunks = [];
let recordingTimeout;
let countdownInterval;

const startButton = document.getElementById('startButton');
const words = ["Rock", "Paper", "Scissors", "Shoot"];

startButton.addEventListener('click', () => {
  messageElement.innerText = '';
  startButton.disabled = true;
  startRecordingCountdown();
});

async function requestCameraAccess() {
  try {
    await navigator.mediaDevices.getUserMedia({ video: true });
    return true; // Permission granted
  } catch (error) {
    return false; // Permission denied
  }
}

function updateCountdownText(countdown) {
  countdownTimer.innerText = `Recording in ${countdown} seconds`;
}

async function startRecordingCountdown() {
  let countdown = 3;

  updateCountdownText(countdown);

  countdownInterval = setInterval(async() => {
    countdown--;

    if (countdown >= 0) {
      updateCountdownText(countdown);
    } else {
      clearInterval(countdownInterval);
      const cameraAccessGranted = await requestCameraAccess();

      if (cameraAccessGranted) {
        startRecording();
        startWordDisplay();
      }
    }
  }, 1000);
}

function startWordDisplay() {
  let wordIndex = 0;

  countdownInterval = setInterval(() => {
    if (wordIndex < words.length) {
      countdownTimer.innerText = words[wordIndex];
      wordIndex++;
    } else {
      clearInterval(countdownInterval);
      stopRecording();
    }
  }, 1000);
}


function startRecording() {
  console.log('Starting recording...')
  const videoElement = document.getElementById('videoElement');
  recordedChunks = [];

  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
      videoElement.srcObject = stream;
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = handleDataAvailable;
      mediaRecorder.start();
    })
    .catch(error => {
      console.error('Error accessing camera:', error);
    });
}

function stopRecording() {
  console.log('Stopping recording...');
  startButton.disabled = false;
  clearTimeout(recordingTimeout); // Clear the timeout to stop the recording if it hasn't reached 3 seconds yet.
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
}

function handleDataAvailable(event) {
  if (event.data.size > 0) {
    recordedChunks.push(event.data);
  }
  if (mediaRecorder.state === 'inactive') {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    sendVideoToServer(blob);
  }
}

function sendVideoToServer(videoBlob) {
    // Create a FormData object to send the video as a binary file
    console.log('Sending video to server');
    const formData = new FormData();
    formData.append('video', videoBlob, 'recorded_video.webm');
  
    // Send the video to the Tornado server using Fetch API or AJAX
    fetch('/process_video', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json()) // Assuming the server sends JSON response
    .then(data => {
      console.log('Server response:', data);
    // Handle the server response and display the message
    const serverMessage = data.class; // Assuming the message key is "message"
    displayMessage(serverMessage);
  })
    .catch(error => {
      console.error('Error sending video:', error);
    });
  }  

function displayMessage(message) {
    const messageElement = document.getElementById('messageElement');
    messageElement.innerText = message;
  }