import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getDatabase, ref, push, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Your web app's Firebase configuration
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

// Access the video and canvas elements
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const captureButton = document.getElementById('capture');
const imagesContainer = document.getElementById('images');
const overlay = document.getElementById('overlay');
const closeButton = document.getElementById('closeButton');

// Request camera access
navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => {
        video.srcObject = stream;
    })
    .catch(err => console.error("Error accessing camera: ", err));

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
