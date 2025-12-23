// Suas credenciais (Mantenha as que você já tem)
const firebaseConfig = {
  apiKey: "AIzaSyCvF8SoA2YQrrNOmRFI_IOEiXpRu0ZYu6w",
  authDomain: "controle-insumos-fazenda.firebaseapp.com",
  projectId: "controle-insumos-fazenda",
  storageBucket: "controle-insumos-fazenda.firebasestorage.app",
  messagingSenderId: "458933835087",
  appId: "1:458933835087:web:f7762203b30550cfcfa13a"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();
const auth = firebase.auth();
const insumosCollection = db.collection('insumos');

// LOGIN COM ALERTA DE ERRO PARA CELULAR
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value.trim();
        const senha = document.getElementById('login-senha').value.trim();
        
        // Alerta de progresso para o usuário saber que clicou
        console.log("Tentando logar...");

        auth.signInWithEmailAndPassword(email, senha)
            .then(() => {
                console.log("Logado com sucesso");
            })
            .catch(error => {
                // ESTE ALERTA VAI TE DIZER O ERRO NO IPHONE
                console.error(error);
                alert("Erro ao entrar: " + error.message);
            });
    });
}

// ... Restante do seu código (renderização, update, etc) ...
