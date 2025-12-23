// Passo 1: Configuração do Firebase (Mantendo suas chaves originais)
const firebaseConfig = {
  apiKey: "AIzaSyCvF8SoA2YQrrNOmRFI_IOEiXpRu0ZYu6w",
  authDomain: "controle-insumos-fazenda.firebaseapp.com",
  projectId: "controle-insumos-fazenda",
  storageBucket: "controle-insumos-fazenda.firebasestorage.app",
  messagingSenderId: "458933835087",
  appId: "1:458933835087:web:f7762203b30550cfcfa13a"
};

// Inicialização segura
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const insumosCollection = db.collection('insumos');

// Seletores de interface
const listaPermanente = document.getElementById('lista-permanente');
const listaVariavel = document.getElementById('lista-variavel');

// Controle de "congelamento" (cooldown) para evitar pulos na tela
let cooldowns = {};

// Função para alternar entre as abas (mobile)
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        const index = tabId === 'view-permanente' ? 0 : tabId === 'view-variavel' ? 1 : 2;
        const navItems = document.querySelectorAll('.nav-item');
        if (navItems[index]) navItems[index].classList.add('active');
        window.scrollTo(0,0);
    }
}

// Helper para calcular o status baseado na quantidade
function calcularStatus(quantidade) {
    if (quantidade <= 2) return 'critico'; // Vermelho
    if (quantidade <= 5) return 'alerta';  // Amarelo
    return 'ok';                           // Verde
}

// Gerenciamento de estado de login
auth.onAuthStateChanged(user => {
    const telaLogin = document.getElementById('tela-login');
    const conteudoPrincipal = document.getElementById('conteudo-principal');
    
    if (user) {
        if (telaLogin) telaLogin.style.display = 'none';
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'block';
        document.getElementById('user-email').textContent = user.email;
        iniciarListener();
    } else {
        if (telaLogin) telaLogin.style.display = 'flex';
        if (conteudoPrincipal) conteudoPrincipal.style.display = 'none';
    }
});

// Listener Principal do Banco de Dados
function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        renderizarTudo(snapshot);
    }, error => {
        console.error("Erro no listener:", error);
    });
}

// Renderização inteligente com suporte a Cooldown
function renderizarTudo(snapshot) {
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
            // Se estiver em cooldown, mantém o status antigo para não pular de posição
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

    // Renderiza respeitando a prioridade de cores
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
    
    // Aplicação visual do cooldown
    if (cooldowns[id] && agora < cooldowns[id].expiraEm) {
        statusCor = cooldowns[id].status;
        li.style.opacity = "0.85"; 
    } else {
        statusCor = calcularStatus(item.quantidade);
    }

    if (item.categoria === 'permanente') {
        li.classList.add(`nivel-${statusCor}`);
    }

    // PROTEÇÃO: Verifica se a data existe antes de formatar (evita crash no celular)
    const dataFormatada = item.ultimaAlteracao 
        ? item.ultimaAlteracao.toDate().toLocaleString('pt-BR') 
        : 'Sincronizando...';

    li.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">📅 ${dataFormatada}</div>
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

// Atualização de quantidade com ativação de Cooldown (1 minuto)
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

// Timer para reordenar itens após o fim do cooldown
setInterval(() => {
    if (auth.currentUser) {
        insumosCollection.orderBy('nome').get().then(snapshot => {
            renderizarTudo(snapshot);
        });
    }
}, 15000);

window.deletar = (id) => {
    if (confirm("Deseja realmente excluir este item?")) {
        delete cooldowns[id];
        insumosCollection.doc(id).delete();
    }
};

// Listener do Formulário de Login (Protegido contra erros de DOM)
const formLogin = document.getElementById('form-login');
if (formLogin) {
    formLogin.addEventListener('submit', e => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        
        auth.signInWithEmailAndPassword(email, senha)
            .catch(error => {
                console.error("Erro login:", error);
                alert("Erro ao entrar: Verifique e-mail e senha.");
            });
    });
}

// Botão Logout
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => auth.signOut());
}

// Formulário de Cadastro de novos itens
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
