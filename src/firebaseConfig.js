import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, serverTimestamp, collection, addDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBsKk-6yt6pW6iRaU6FEaKuBDCzjjAs-NY",
  authDomain: "nakhonlottery-app-343e2.firebaseapp.com",
  projectId: "nakhonlottery-app-343e2",
  storageBucket: "nakhonlottery-app-343e2.firebasestorage.app",
  messagingSenderId: "803028445917",
  appId: "1:803028445917:web:895ae6a6369f50af9a8934"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore
const db = getFirestore(app);

// Initialize Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Function to log auth activity
const logAuthActivity = async (eventType, collectionName) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, collectionName), {
      email: user.email,
      event: eventType,
      timestamp: serverTimestamp()
    });
    console.log(`Logged ${eventType} event for ${user.email} in ${collectionName}`);
  } catch (error) {
    console.error(`Error logging ${eventType} activity: `, error);
  }
};

// Export only what's needed
export { auth, googleProvider, db, serverTimestamp, logAuthActivity };