import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';  // Importa apenas getAuth
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDlJQODT8nbeycOADSDK81Sjy0l92_zvi8",
  authDomain: "faixa-e3fff.firebaseapp.com",
  projectId: "faixa-e3fff",
  storageBucket: "faixa-e3fff.appspot.com",
  messagingSenderId: "120294129513",
  appId: "1:120294129513:web:8f43f1b6ad5fc64aa307f8",
  measurementId: "G-MELE4590GB"
};

// Inicializa o app Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore
const db = getFirestore(app);

// Inicializa o Auth sem configuração específica de persistência
const auth = getAuth(app);

export { db, auth };
