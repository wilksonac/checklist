// Passo 1: Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCvF8SoA2YQrrNOmRFI_IOEiXpRu0ZYu6w",
  authDomain: "controle-insumos-fazenda.firebaseapp.com",
  projectId: "controle-insumos-fazenda",
  storageBucket: "controle-insumos-fazenda.firebasestorage.app",
  messagingSenderId: "458933835087",
  appId: "1:458933835087:web:f7762203b30550cfcfa13a"
};

// Inicialização
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const insumosCollection = db.collection('insumos');

let cooldowns = {};

// --- LÓGICA DE INTERFACE (A MAIS IMPORTANTE AGORA) ---

function gerenciarTelas(usuarioLogado) {
    const telaLogin = document.getElementById('tela-login');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    const emailExibicao = document.getElementById('user-email');

    console.log("Gerenciando telas... Usuário:", usuarioLogado ? "Sim" : "Não");

    if (usuarioLogado) {
        // 1. Mostra o conteúdo primeiro para dar velocidade
        if (conteudoPrincipal) conteudoPrincipal.setAttribute('style', 'display: block !important');
        if (telaLogin) telaLogin.setAttribute('style', 'display: none !important');
        
        // 2. Preenche os dados
        if (emailExibicao) emailExibicao.textContent = usuarioLogado.email;
        
        // 3. Inicia o banco de dados
        iniciarListener();
    } else {
        if (telaLogin) telaLogin.setAttribute('style', 'display: flex !important');
        if (conteudoPrincipal) conteudoPrincipal.setAttribute('style', 'display: none !important');
    }
}

// Ouvinte de autenticação do Firebase
auth.onAuthStateChanged(user => {
    gerenciarTelas(user);
});

// --- RESTANTE DAS FUNÇÕES (CORRIGIDAS) ---

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const target = document.getElementById(tabId);
    if (target) {
        target.classList.add('active');
        const buttons = document.querySelectorAll('.nav-item');
        if (tabId === 'view-permanente' && buttons[0]) buttons[0].classList.add('active');
        if (tabId === 'view-variavel' && buttons[1]) buttons[1].classList.add('active');
        if (tabId === 'view-adicionar' && buttons[2]) buttons[2].classList.add('active');
        window.scrollTo(0,0);
    }
}

function calcularStatus(quantidade) {
    if (quantidade <= 2) return 'critico';
    if (quantidade <= 5) return 'alerta';
    return 'ok';
}

function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        renderizarTudo(snapshot);
    }, error => {
        console.error("Erro no Listener:", error);
    });
}

function renderizarTudo(snapshot) {
    const listaPermanente = document.getElementById('lista-permanente');
    const listaVariavel = document.getElementById('lista-variavel');
    
    if (!listaPermanente || !listaVariavel) return;

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
            if (cooldowns[id] && agora < cooldowns[id].expiraEm) {
                statusEfetivo = cooldowns[id].status;
            } else {
                statusEfetivo = calcularStatus(data.quantidade);
                delete cooldowns[id];
            }
            perm[statusEfetivo].push(doc);
        } else {
            vars.push(doc);
        }
    });

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
    
    let statusCor;
    const agora = Date.now();
    if (cooldowns[id] && agora < cooldowns[id].expiraEm) {
        statusCor = cooldowns[id].status;
        li.style.opacity = "0.8";
    } else {
        statusCor = calcularStatus(item.quantidade);
    }

    if (item.categoria === 'permanente') {
        li.classList.add(`nivel-${statusCor}`);
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

window.handleUpdate = (id, qtdAtual, alteracao) => {
    const novaQtde = qtdAtual + alteracao;
    if (novaQtde < 0) return;

    if (!cooldowns[id]) {
        cooldowns[id] = {
            status: calcularStatus(qtdAtual),
            expiraEm: Date.now() + 60000 
        };
    }

    insumosCollection.doc(id).update({
        quantidade: novaQtde,
        ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
    });
};

window.deletar = (id) => {
    if (confirm("Excluir item?")) {
        delete cooldowns[id];
        insumosCollection.doc(id).delete();
    }
};

// Listeners de Formulário com proteção de erro
document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', e => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const senha = document.getElementById('login-senha').value;
            auth.signInWithEmailAndPassword(email, senha)
                .catch(err => alert("Erro ao entrar: " + err.message));
        });
    }

    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => auth.signOut());

    const formAdd = document.getElementById('form-adicionar-item');
    if (formAdd) {
        formAdd.addEventListener('submit', e => {
            e.preventDefault();
            const nome = document.getElementById('nome-item').value;
            const cat = document.getElementById('categoria-item').value;
            insumosCollection.add({
                nome: nome,
                categoria: cat,
                quantidade: 0,
                ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                formAdd.reset();
                switchTab(cat === 'permanente' ? 'view-permanente' : 'view-variavel');
            });
        });
    }
});
