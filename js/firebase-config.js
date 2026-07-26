const firebaseConfig = {
  apiKey: "AIzaSyBDfAoS88t1nzD9xtz35dZJcnjekel50OI",
  authDomain: "destie-shop.firebaseapp.com",
  projectId: "destie-shop",
  storageBucket: "destie-shop.firebasestorage.app",
  messagingSenderId: "987910188705",
  appId: "1:987910188705:web:95a17c66bb8ab5b7e24ae0"
};


firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
