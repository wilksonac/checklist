function switchTab(tabId) {
    // 1. Gerencia visibilidade das seções
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    // 2. Gerencia estado ativo dos botões (cor cinza vs escuro)
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    // Mapeamento de qual botão destacar
    const navItems = document.querySelectorAll('.nav-item');
    if (tabId === 'view-tudo') navItems[0].classList.add('active');
    if (tabId === 'view-permanente') navItems[1].classList.add('active');
    if (tabId === 'view-variavel') navItems[2].classList.add('active');

    // 3. Lógica Especial para "Visualizar Tudo"
    const containerTudo = document.getElementById('container-tudo');
    const lp = document.getElementById('lista-permanente');
    const lv = document.getElementById('lista-variavel');

    if (tabId === 'view-tudo') {
        // Move as listas para dentro da aba Tudo
        containerTudo.appendChild(lp.parentElement);
        containerTudo.appendChild(lv.parentElement);
    } else if (tabId === 'view-permanente') {
        // Devolve a lista para sua aba original
        document.querySelector('#view-permanente .lista-card').appendChild(lp);
    } else if (tabId === 'view-variavel') {
        // Devolve a lista para sua aba original
        document.querySelector('#view-variavel .lista-card').appendChild(lv);
    }

    window.scrollTo(0, 0);
}

// ATUALIZAÇÃO NO LISTENER PARA SUPORTAR A ABA "TUDO"
function iniciarListener() {
    insumosCollection.orderBy('nome').onSnapshot(snapshot => {
        // Limpa apenas o conteúdo das listas, não os elementos pai
        document.getElementById('lista-permanente').innerHTML = '';
        document.getElementById('lista-variavel').innerHTML = '';
        
        renderizarTudo(snapshot);
    });
}
