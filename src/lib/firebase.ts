import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  projectId: "studio-6139822035-f2e85",
  appId: "1:760512381886:web:da6fdf96347e2a8042afef",
  apiKey: "AIzaSyAfvATOQ5SUGhYrmG6KdS3tC5VkFq7VaVU",
  authDomain: "studio-6139822035-f2e85.firebaseapp.com",
  messagingSenderId: "760512381886",
  storageBucket: "studio-6139822035-f2e85.firebasestorage.app",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
