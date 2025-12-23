const firebaseConfig = {
    apiKey: "AIzaSyCvF8SoA2YQrrNOmRFI_IOEiXpRu0ZYu6w",
    authDomain: "controle-insumos-fazenda.firebaseapp.com",
    projectId: "controle-insumos-fazenda",
    storageBucket: "controle-insumos-fazenda.firebasestorage.app",
    messagingSenderId: "458933835087",
    appId: "1:458933835087:web:f7762203b30550cfcfa13a"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth();
const insumosCollection = db.collection('insumos');

let cooldowns = {};

function switchTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const viewAdd = document.getElementById('view-adicionar');
    const displayListas = document.getElementById('display-listas');
    const secPerm = document.getElementById('secao-permanente');
    const secVar = document.getElementById('secao-variavel');
    const navItems = document.querySelectorAll('.nav-item');

    if (tabId === 'view-tudo') {
        viewAdd.classList.remove('active');
        displayListas.style.display = 'block';
        secPerm.style.display = 'block';
        secVar.style.display = 'block';
        navItems[0].classList.add('active');
    } 
    else if (tabId === 'view-permanente') {
        viewAdd.classList.remove('active');
        displayListas.style.display = 'block';
        secPerm.style.display = 'block';
        secVar.style.display = 'none';
        navItems[1].classList.add('active');
    } 
    else if (tabId === 'view-variavel') {
        viewAdd.classList.remove('active');
        displayListas.style.display = 'block';
        secPerm.style.display = 'none';
        secVar.style.display = 'block';
        navItems[2].classList.add('active');
    } 
    else if (tabId === 'view-adicionar') {
        viewAdd.classList.add('active');
        displayListas.style.display = 'none';
    }
    window.scrollTo(0,0);
}

function calcularStatus(q) {
    if (q <= 2) return 'critico';
    if (q <= 5) return 'alerta';
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

function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        const lp = document.getElementById('lista-permanente');
        const lv = document.getElementById('lista-variavel');
        if (!lp || !lv) return;
        
        lp.innerHTML = ''; lv.innerHTML = '';
        const perm = { critico: [], alerta: [], ok: [] };
        const vars = [];
        const agora = Date.now();

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.categoria === 'permanente') {
                let status = (cooldowns[doc.id] && agora < cooldowns[doc.id].expiraEm) 
                    ? cooldowns[doc.id].status : calcularStatus(data.quantidade);
                perm[status].push(doc);
            } else { vars.push(doc); }
        });

        perm.critico.forEach(d => renderItem(d, lp));
        perm.alerta.forEach(d => renderItem(d, lp));
        perm.ok.forEach(d => renderItem(d, lp));
        vars.forEach(d => renderItem(d, lv));
    });
}

function renderItem(doc, container) {
    const item = doc.data();
    const li = document.createElement('li');
    li.className = 'item-insumo';
    
    let status = (cooldowns[doc.id] && Date.now() < cooldowns[doc.id].expiraEm) 
                 ? cooldowns[doc.id].status : calcularStatus(item.quantidade);

    if (item.categoria === 'permanente') li.classList.add(`nivel-${status}`);

    const dataHora = item.ultimaAlteracao ? item.ultimaAlteracao.toDate().toLocaleString('pt-BR') : '...';

    li.innerHTML = `
        <div class="item-info">
            <div class="nome">${item.nome}</div>
            <div class="log">📅 ${dataHora}</div>
        </div>
        <div class="item-controles">
            <button onclick="handleUpdate('${doc.id}', ${item.quantidade}, -1)">-</button>
            <input type="number" value="${item.quantidade}" readonly>
            <button onclick="handleUpdate('${doc.id}', ${item.quantidade}, 1)">+</button>
            <button class="btn-deletar" onclick="deletar('${doc.id}')">🗑️</button>
        </div>
    `;
    container.appendChild(li);
}

window.handleUpdate = (id, qtd, alt) => {
    const nova = qtd + alt;
    if (nova < 0) return;
    if (!cooldowns[id]) cooldowns[id] = { status: calcularStatus(qtd), expiraEm: Date.now() + 60000 };
    insumosCollection.doc(id).update({ quantidade: nova, ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp() });
};

window.deletar = (id) => { if (confirm("Excluir item?")) insumosCollection.doc(id).delete(); };

document.getElementById('form-login').addEventListener('submit', e => {
    e.preventDefault();
    auth.signInWithEmailAndPassword(document.getElementById('login-email').value, document.getElementById('login-senha').value)
        .catch(err => alert("Erro: " + err.message));
});

document.getElementById('btn-logout').addEventListener('click', () => auth.signOut());

document.getElementById('form-adicionar-item').addEventListener('submit', e => {
    e.preventDefault();
    const n = document.getElementById('nome-item').value;
    const c = document.getElementById('categoria-item').value;
    insumosCollection.add({ nome: n, categoria: c, quantidade: 0, ultimaAlteracao: firebase.firestore.FieldValue.serverTimestamp() })
        .then(() => { 
            document.getElementById('form-adicionar-item').reset(); 
            switchTab('view-tudo'); 
        });
});
