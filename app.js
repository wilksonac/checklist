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

// OBJETO DE CONTROLE DE "CONGELAMENTO"
// Armazena: { idDoItem: { status: 'critico/alerta/ok', expiraEm: timestamp } }
let cooldowns = {};

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    const index = tabId === 'view-permanente' ? 0 : tabId === 'view-variavel' ? 1 : 2;
    document.querySelectorAll('.nav-item')[index].classList.add('active');
    window.scrollTo(0,0);
}

// Helper para calcular o status baseado na quantidade
function calcularStatus(quantidade) {
    if (quantidade <= 2) return 'critico';
    if (quantidade <= 5) return 'alerta';
    return 'ok';
}

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

// Listener Principal
function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        renderizarTudo(snapshot);
    });
}

// Função de Renderização Separada para permitir chamadas automáticas
function renderizarTudo(snapshot) {
    listaPermanente.innerHTML = '';
    listaVariavel.innerHTML = '';

    const perm = { critico: [], alerta: [], ok: [] };
    const vars = [];

    const agora = Date.now();

    snapshot.docs.forEach(doc => {
        const data = doc.data();
        const id = doc.id;

        if (data.categoria === 'permanente') {
            let statusEfetivo;

            // VERIFICA SE O ITEM ESTÁ CONGELADO (COOLDOWN)
            if (cooldowns[id] && agora < cooldowns[id].expiraEm) {
                statusEfetivo = cooldowns[id].status; // Usa o status de 1 min atrás
            } else {
                statusEfetivo = calcularStatus(data.quantidade); // Calcula o novo status real
                delete cooldowns[id]; // Limpa se expirou
            }

            perm[statusEfetivo].push(doc);
        } else {
            vars.push(doc);
        }
    });

    // Renderiza respeitando a ordem de status (congelado ou real)
    perm.critico.forEach(d => renderItem(d, listaPermanente));
    perm.alerta.forEach(d => renderItem(d, listaPermanente));
    perm.ok.forEach(d => renderItem(d, listaPermanente));
    vars.forEach(d => renderItem(d, listaVariavel));
}

function renderItem(doc, container) {
    const item = doc.data();
    const id = doc.id;
    const li = document.createElement('li');
    li.className = 'item-insumo';
    
    // Determina a cor visual
    let statusCor;
    const agora = Date.now();
    if (cooldowns[id] && agora < cooldowns[id].expiraEm) {
        statusCor = cooldowns[id].status;
        li.style.opacity = "0.8"; // Opcional: deixa o item levemente transparente enquanto "congelado"
    } else {
        statusCor = calcularStatus(item.quantidade);
    }

    if (item.categoria === 'permanente') {
        if (statusCor === 'critico') li.classList.add('nivel-critico');
        else if (statusCor === 'alerta') li.classList.add('nivel-alerta');
        else li.classList.add('nivel-ok');
    }

    const dataHora = item.ultimaAlteracao ? item.ultimaAlteracao.toDate().toLocaleString('pt-BR') : '---';

    li.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">📅 ${dataHora}</div>
        </div>
        <div class="item-controles">
            <button onclick="handleUpdate('${id}', ${item.quantidade}, -1)">-</button>
            <input type="number" value="${item.quantidade}" readonly>
            <button onclick="handleUpdate('${id}', ${item.quantidade}, 1)">+</button>
            <button class="btn-deletar" onclick="deletar('${id}')">🗑️</button>
        </div>
    `;
    container.appendChild(li);
}

// FUNÇÃO PARA GERENCIAR O CLIQUE E O COOLDOWN
window.handleUpdate = (id, qtdAtual, alteracao) => {
    const novaQtde = qtdAtual + alteracao;
    if (novaQtde < 0) return;

    // Se o item ainda não está em cooldown, salvamos o status ATUAL dele antes de mudar
    if (!cooldowns[id]) {
        cooldowns[id] = {
            status: calcularStatus(qtdAtual), // Status de agora (antes do clique)
            expiraEm: Date.now() + 60000     // Congela por 60 segundos
        };
    }

    // Atualiza o Firebase (isso vai disparar o onSnapshot para todos)
    insumosCollection.doc(id).update({
        quantidade: novaQtde,
        ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
    });
};

// Timer para "destravar" itens automaticamente mesmo se ninguém mexer no banco
setInterval(() => {
    insumosCollection.orderBy('nome').get().then(snapshot => {
        renderizarTudo(snapshot);
    });
}, 10000); // Verifica a cada 10 segundos se algum cooldown expirou para mover o item

window.deletar = (id) => {
    if (confirm("Excluir item?")) {
        delete cooldowns[id];
        insumosCollection.doc(id).delete();
    }
};

// Login
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


