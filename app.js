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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const insumosCollection = db.collection('insumos');

// Seletores
const listaPermanente = document.getElementById('lista-permanente');
const listaVariavel = document.getElementById('lista-variavel');

// FUNÇÃO PARA TROCAR ABAS
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    
    // Ativa o ícone correto na barra
    const index = tabId === 'view-permanente' ? 0 : tabId === 'view-variavel' ? 1 : 2;
    document.querySelectorAll('.nav-item')[index].classList.add('active');
    window.scrollTo(0,0);
}

// Escuta Autenticação
auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('tela-login').style.display = 'none';
        document.getElementById('conteudo-principal').style.display = 'block';
        document.getElementById('user-email').textContent = user.email;
        iniciarListener();
    } else {
        document.getElementById('tela-login').style.display = 'flex';
        document.getElementById('conteudo-principal').style.display = 'none';
    }
});

// Listener do Banco de Dados (Com ordenação por Status)
function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        listaPermanente.innerHTML = '';
        listaVariavel.innerHTML = '';

        const perm = { critico: [], alerta: [], ok: [] };
        const vars = [];

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.categoria === 'permanente') {
                if (data.quantidade <= 2) perm.critico.push(doc);
                else if (data.quantidade <= 5) perm.alerta.push(doc);
                else perm.ok.push(doc);
            } else {
                vars.push(doc);
            }
        });

        // Renderiza na ordem de prioridade
        perm.critico.forEach(d => renderItem(d, listaPermanente));
        perm.alerta.forEach(d => renderItem(d, listaPermanente));
        perm.ok.forEach(d => renderItem(d, listaPermanente));
        vars.forEach(d => renderItem(d, listaVariavel));
    });
}

function renderItem(doc, container) {
    const item = doc.data();
    const li = document.createElement('li');
    li.className = 'item-insumo';
    
    // Define classe de cor
    if (item.categoria === 'permanente') {
        if (item.quantidade <= 2) li.classList.add('nivel-critico');
        else if (item.quantidade <= 5) li.classList.add('nivel-alerta');
        else li.classList.add('nivel-ok');
    }

    const dataHora = item.ultimaAlteracao ? item.ultimaAlteracao.toDate().toLocaleString('pt-BR') : '---';

    li.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">📅 ${dataHora}</div>
        </div>
        <div class="item-controles">
            <button onclick="updateQtde('${doc.id}', ${item.quantidade - 1})">-</button>
            <input type="number" value="${item.quantidade}" readonly>
            <button onclick="updateQtde('${doc.id}', ${item.quantidade + 1})">+</button>
            <button class="btn-deletar" onclick="deletar('${doc.id}')">🗑️</button>
        </div>
    `;
    container.appendChild(li);
}

window.updateQtde = (id, novaQtde) => {
    if (novaQtde < 0) return;
    insumosCollection.doc(id).update({
        quantidade: novaQtde,
        ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
    });
};

window.deletar = (id) => {
    if (confirm("Excluir item?")) insumosCollection.doc(id).delete();
};

// Login e Cadastro
document.getElementById('form-login').addEventListener('submit', e => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-senha').value)
        .catch(() => alert("Erro no login"));
});

document.getElementById('btn-logout').addEventListener('click', () => auth.signOut());

document.getElementById('form-adicionar-item').addEventListener('submit', e => {
    e.preventDefault();
    const nome = document.getElementById('nome-item').value;
    const cat = document.getElementById('categoria-item').value;
    insumosCollection.add({
        nome: nome,
        categoria: cat,
        quantidade: 0,
        ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        document.getElementById('form-adicionar-item').reset();
        switchTab(cat === 'permanente' ? 'view-permanente' : 'view-variavel');
    });
});


