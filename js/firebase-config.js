// Configuración de Firebase para NITROPEAK
const firebaseConfig = {
  apiKey: "AIzaSyCmQvuZForGQIxafEcIfHFAsPyeqgB1by",
  authDomain: "nitropeak-6bee4.firebaseapp.com",
  projectId: "nitropeak-6bee4",
  storageBucket: "nitropeak-6bee4.firebasestorage.app",
  messagingSenderId: "498858670688",
  appId: "1:498858670688:web:c6951939e2c6ab33f94905",
  measurementId: "G-87SK8SC22D"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
