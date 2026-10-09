// ============================================================
// OM MARUTI DIAMOND
// Firebase Client Configuration
// ============================================================

// Firebase core
import {
    initializeApp
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";

// Firebase Authentication
import {
    browserSessionPersistence,
    connectAuthEmulator,
    getAuth,
    setPersistence
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

// Cloud Firestore
import {
    connectFirestoreEmulator,
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Cloud Functions
import {
    connectFunctionsEmulator,
    getFunctions
} from "https://www.gstatic.com/firebasejs/12.4.0/firebase-functions.js";


// ============================================================
// FIREBASE CONFIGURATION
// ============================================================
//
// Firebase Web configuration identifies this Firebase web app.
// It is NOT an Admin SDK credential.
//
// NEVER put:
// - service account private keys
// - passwords
// - Firebase Admin credentials
// - bootstrap secrets
// - other private server secrets
//
// inside this file.
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBj7uU3b9IgONt90ytbCiMJK8YtlINqVqk",

  authDomain:
    "om-maruti-diamond.firebaseapp.com",

  projectId:
    "om-maruti-diamond",

  storageBucket:
    "om-maruti-diamond.firebasestorage.app",

  messagingSenderId:
    "68634682297",

  appId:
    "1:68634682297:web:cf5566677abd351876cc68"
};


// ============================================================
// INITIALIZE FIREBASE
// ============================================================

const app = initializeApp(firebaseConfig);


// ============================================================
// INITIALIZE SERVICES
// ============================================================

const auth = getAuth(app);

const db = getFirestore(app);

const functions = getFunctions(app);


// ============================================================
// LOCAL DEVELOPMENT DETECTION
// ============================================================
//
// Only use Firebase emulators when this website is running
// locally.
//
// Production domains will NOT enter this block.
// ============================================================

const isLocalDevelopment =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";


// ============================================================
// CONNECT LOCAL FIREBASE EMULATORS
// ============================================================
//
// IMPORTANT:
//
// Start the Firebase Emulator Suite before using the website
// locally.
//
// Auth:
// localhost:9099
//
// Firestore:
// localhost:8080
//
// Functions:
// localhost:5001
//
// These connections prevent development data from being written
// into the production Firebase services.
// ============================================================

if (isLocalDevelopment) {

  connectAuthEmulator(
    auth,
    "http://127.0.0.1:9099",
    {
      disableWarnings: true
    }
  );

  connectFirestoreEmulator(
    db,
    "127.0.0.1",
    8080
  );

  connectFunctionsEmulator(
    functions,
    "127.0.0.1",
    5001
  );

  console.info(
    "OM MARUTI DIAMOND: Firebase emulators connected."
  );

}


// ============================================================
// AUTH SESSION POLICY
// ============================================================

try {

  await setPersistence(
    auth,
    browserSessionPersistence
  );

} catch (error) {

  console.error(
    "Unable to configure Firebase authentication persistence."
  );

}


// ============================================================
// EXPORTS
// ============================================================

export {
    app,
    auth,
    db,
    functions,
    isLocalDevelopment
};
