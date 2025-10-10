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
const auth = firebase.auth();
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

let unsubscribeFirestore = null;

// --- LÓGICA DE AUTENTICAÇÃO ---

auth.onAuthStateChanged(user => {
    if (user) {
        telaLogin.style.display = 'none';
        conteudoPrincipal.style.display = 'block';
        userEmailSpan.textContent = `Logado como: ${user.email}`;
        iniciarListenerFirestore();
    } else {
        telaLogin.style.display = 'flex';
        conteudoPrincipal.style.display = 'none';
        userEmailSpan.textContent = '';
        if (unsubscribeFirestore) {
            unsubscribeFirestore();
        }
        listaPermanente.innerHTML = '';
        listaVariavel.innerHTML = '';
    }
});

formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = loginEmailInput.value;
    const password = loginSenhaInput.value;
    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            loginError.textContent = '';
            formLogin.reset();
        })
        .catch(error => {
            loginError.textContent = 'E-mail ou senha incorretos.';
        });
});

btnLogout.addEventListener('click', () => {
    auth.signOut();
});


// --- LÓGICA DO FIRESTORE ---

function iniciarListenerFirestore() {
    // A query original, ordenada por nome, continua a mesma
    unsubscribeFirestore = insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        // Limpa as listas antes de qualquer coisa
        listaPermanente.innerHTML = '';
        listaVariavel.innerHTML = '';

        // **NOVA LÓGICA DE ORDENAÇÃO**
        // 1. Cria arrays para separar os itens por status
        const itemsPermanentes = {
            critico: [], // Vermelho
            alerta: [], // Amarelo
            ok: []      // Verde
        };
        const itemsVariaveis = [];

        // 2. Itera sobre os documentos e os distribui nos arrays corretos
        snapshot.docs.forEach(doc => {
            const item = doc.data();
            if (item.categoria === 'permanente') {
                if (item.quantidade <= 2) {
                    itemsPermanentes.critico.push(doc);
                } else if (item.quantidade <= 5) {
                    itemsPermanentes.alerta.push(doc);
                } else {
                    itemsPermanentes.ok.push(doc);
                }
            } else {
                itemsVariaveis.push(doc);
            }
        });
        
        // 3. Renderiza os itens na ordem desejada: Vermelho -> Amarelo -> Verde
        itemsPermanentes.critico.forEach(renderizarItem);
        itemsPermanentes.alerta.forEach(renderizarItem);
        itemsPermanentes.ok.forEach(renderizarItem);

        // 4. Renderiza os itens variáveis normalmente
        itemsVariaveis.forEach(renderizarItem);

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

function deletarItem(id) {
    if (confirm("Tem certeza que deseja excluir este item?")) {
        insumosCollection.doc(id).delete()
            .then(() => {
                console.log("Item deletado com sucesso!");
            })
            .catch(error => {
                console.error("Erro ao deletar item: ", error);
            });
    }
}

function renderizarItem(doc) {
    const item = doc.data();
    const itemId = doc.id;
    const itemLi = document.createElement('li');
    itemLi.className = 'item-insumo';
    itemLi.dataset.id = itemId;

    // A lógica de aplicar as classes de cor continua a mesma aqui
    if (item.categoria === 'permanente') {
        if (item.quantidade <= 2) {
            itemLi.classList.add('nivel-critico'); // Vermelho
        } else if (item.quantidade <= 5) {
            itemLi.classList.add('nivel-alerta'); // Amarelo
        } else {
            itemLi.classList.add('nivel-ok'); // Verde
        }
    }

    itemLi.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">Última alteração: ${formatarTimestamp(item.ultimaAlteracao)}</div>
        </div>
        <div class="item-controles">
            <button class="btn-menos">-</button>
            <input type="number" value="${item.quantidade}" min="0">
            <button class="btn-mais">+</button>
            <button class="btn-deletar">🗑️</button> 
        </div>
    `;

    const btnMenos = itemLi.querySelector('.btn-menos');
    const btnMais = itemLi.querySelector('.btn-mais');
    const inputQtde = itemLi.querySelector('input');
    const btnDeletar = itemLi.querySelector('.btn-deletar');

    btnMenos.addEventListener('click', () => {
        const valorAtual = parseInt(inputQtde.value, 10);
        if (valorAtual > 0) atualizarQuantidade(itemId, valorAtual - 1);
    });
    btnMais.addEventListener('click', () => {
        const valorAtual = parseInt(inputQtde.value, 10);
        atualizarQuantidade(itemId, valorAtual + 1);
    });
    inputQtde.addEventListener('change', () => atualizarQuantidade(itemId, inputQtde.value));

    btnDeletar.addEventListener('click', () => {
        deletarItem(itemId);
    });

    // A lógica de para qual lista o item vai continua a mesma
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
