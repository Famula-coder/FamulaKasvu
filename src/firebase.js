import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBRWpY7o7shqONFtVhm-IzHaPjNmhKxC3E",
  authDomain: "famulakasvu.firebaseapp.com",
  projectId: "famulakasvu",
  storageBucket: "famulakasvu.firebasestorage.app",
  messagingSenderId: "950910086371",
  appId: "1:950910086371:web:79a6553a1b0a7cb882e9d6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export const appId = "famulakasvu-prod"; // namespace string for docs
