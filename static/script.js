let mediaRecorder;
let recordedChunks = [];

function startRecording() {
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
    const formData = new FormData();
    formData.append('video', videoBlob, 'recorded_video.webm');
  
    // Send the video to the Tornado server using Fetch API or AJAX
    fetch('/process_video', {
      method: 'POST',
      body: formData,
    })
    .then(response => response.json()) // Assuming the server sends JSON response
    .then(data => {
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