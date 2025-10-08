// Passo 1: Configuração do Firebase
// COLE AQUI O OBJETO firebaseConfig QUE VOCÊ COPIOU DO CONSOLE
const firebaseConfig = {

  apiKey: "AIzaSyCvF8SoA2YQrrNOmRFI_IOEiXpRu0ZYu6w",

  authDomain: "controle-insumos-fazenda.firebaseapp.com",

  projectId: "controle-insumos-fazenda",

  storageBucket: "controle-insumos-fazenda.firebasestorage.app",

  messagingSenderId: "458933835087",

  appId: "1:458933835087:web:f7762203b30550cfcfa13a"

};


// Passo 2: Inicialização do Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth(); // Inicializa o serviço de autenticação
const insumosCollection = db.collection('insumos');

// Referências aos elementos de tela
const telaLogin = document.getElementById('tela-login');
const conteudoPrincipal = document.getElementById('conteudo-principal');
const formLogin = document.getElementById('form-login');
const loginEmailInput = document.getElementById('login-email');
const loginSenhaInput = document.getElementById('login-senha');
const loginError = document.getElementById('login-error');
const btnLogout = document.getElementById('btn-logout');
const userEmailSpan = document.getElementById('user-email');

const formAdicionar = document.getElementById('form-adicionar-item');
const nomeItemInput = document.getElementById('nome-item');
const categoriaItemInput = document.getElementById('categoria-item');
const listaPermanente = document.getElementById('lista-permanente');
const listaVariavel = document.getElementById('lista-variavel');

let unsubscribeFirestore = null; // Variável para guardar o listener do Firestore

// --- LÓGICA DE AUTENTICAÇÃO ---

// Gerencia o estado de autenticação em tempo real
auth.onAuthStateChanged(user => {
    if (user) {
        // Usuário está logado
        telaLogin.style.display = 'none';
        conteudoPrincipal.style.display = 'block';
        userEmailSpan.textContent = `Logado como: ${user.email}`;
        
        // Inicia o listener do Firestore APENAS quando o usuário está logado
        iniciarListenerFirestore();
    } else {
        // Usuário está deslogado
        telaLogin.style.display = 'flex';
        conteudoPrincipal.style.display = 'none';
        userEmailSpan.textContent = '';
        
        // Para o listener do Firestore para não usar recursos desnecessários
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
        // Limpa as listas
        listaPermanente.innerHTML = '';
        listaVariavel.innerHTML = '';
    }
});

// Evento de submit do formulário de login
formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginSenhaInput.value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log("Login bem-sucedido!", userCredential.user);
            loginError.textContent = '';
            formLogin.reset();
        })
        .catch(error => {
            console.error("Erro no login:", error);
            loginError.textContent = 'E-mail ou senha incorretos.';
        });
});

// Evento de clique no botão de logout
btnLogout.addEventListener('click', () => {
    auth.signOut().then(() => {
        console.log("Usuário deslogado.");
    });
});


// --- LÓGICA DO FIRESTORE (A mesma de antes, mas encapsulada) ---

function iniciarListenerFirestore() {
    // Escuta por alterações em tempo real
    unsubscribeFirestore = insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        listaPermanente.innerHTML = '';
        listaVariavel.innerHTML = '';
        snapshot.docs.forEach(renderizarItem);
    }, error => {
        console.error("Erro ao buscar insumos: ", error);
    });
}

function formatarTimestamp(timestamp) {
    if (!timestamp) return 'Sem data';
    const data = timestamp.toDate();
    return data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function atualizarQuantidade(id, novaQuantidade) {
    const quantidadeNumerica = parseInt(novaQuantidade, 10);
    if (isNaN(quantidadeNumerica) || quantidadeNumerica < 0) return;
    insumosCollection.doc(id).update({
        quantidade: quantidadeNumerica,
        ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(error => console.error("Erro ao atualizar o item: ", error));
}

function renderizarItem(doc) {
    const item = doc.data();
    const itemId = doc.id;
    const itemLi = document.createElement('li');
    itemLi.className = 'item-insumo';
    itemLi.dataset.id = itemId;

    itemLi.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">Última alteração: ${formatarTimestamp(item.ultimaAlteracao)}</div>
        </div>
        <div class="item-controles">
            <button class="btn-menos">-</button>
            <input type="number" value="${item.quantidade}" min="0">
            <button class="btn-mais">+</button>
        </div>
    `;

    const btnMenos = itemLi.querySelector('.btn-menos');
    const btnMais = itemLi.querySelector('.btn-mais');
    const inputQtde = itemLi.querySelector('input');

    btnMenos.addEventListener('click', () => {
        const valorAtual = parseInt(inputQtde.value, 10);
        if (valorAtual > 0) atualizarQuantidade(itemId, valorAtual - 1);
    });
    btnMais.addEventListener('click', () => {
        const valorAtual = parseInt(inputQtde.value, 10);
        atualizarQuantidade(itemId, valorAtual + 1);
    });
    inputQtde.addEventListener('change', () => atualizarQuantidade(itemId, inputQtde.value));

    if (item.categoria === 'permanente') {
        listaPermanente.appendChild(itemLi);
    } else {
        listaVariavel.appendChild(itemLi);
    }
}

formAdicionar.addEventListener('submit', (e) => {
    e.preventDefault();
    const nome = nomeItemInput.value;
    const categoria = categoriaItemInput.value;
    if (nome && categoria) {
        insumosCollection.add({
            nome: nome,
            categoria: categoria,
            quantidade: 0,
            ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
        }).then(() => {
            console.log("Insumo adicionado!");
            formAdicionar.reset();
        }).catch(error => console.error("Erro ao adicionar insumo: ", error));
    }
});