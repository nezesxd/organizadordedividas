import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

// Substitua pelas configurações do seu projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCORLSNDV-v9vbrVuaBJoie-rhhhu3YMo4",
  authDomain: "organiza-dd763.firebaseapp.com",
  projectId: "organiza-dd763",
  storageBucket: "organiza-dd763.firebasestorage.app",
  messagingSenderId: "322601953698",
  appId: "1:322601953698:web:bbb2e3b5e4b32a33096afb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referências UI
const selectMeses = document.getElementById('selectMeses');
const btnNovaDivida = document.getElementById('btnNovaDivida');
const btnExcluirMes = document.getElementById('btnExcluirMes');
const listaDividas = document.getElementById('listaDividas');
const totalMes = document.getElementById('totalMes');
const formMes = document.getElementById('formMes');
const formDivida = document.getElementById('formDivida');
const formEditarDivida = document.getElementById('formEditarDivida');
const mesDividaModal = document.getElementById('mesDividaModal');
const mesDividaModalEdit = document.getElementById('mesDividaModalEdit');
const listaMesesParcelamento = document.getElementById('listaMesesParcelamento');

// Função Global de Notificação
function mostrarNotificacao(mensagem, tipo = 'success') {
    const toastEl = document.getElementById('appToast');
    const toastMessage = document.getElementById('toastMessage');
    
    toastEl.classList.remove('bg-success', 'bg-danger', 'bg-warning');
    toastEl.classList.add(`bg-${tipo}`);
    toastMessage.innerHTML = mensagem;
    
    const toast = new bootstrap.Toast(toastEl, { delay: 3000 });
    toast.show();
}

// Lógica de UI - Data Limite e Parcelamento
document.getElementById('temDataLimite').addEventListener('change', (e) => {
    document.getElementById('divDataLimite').classList.toggle('d-none', !e.target.checked);
    document.getElementById('dataLimiteDivida').required = e.target.checked;
    if(!e.target.checked) document.getElementById('dataLimiteDivida').value = '';
});

document.getElementById('temDataLimiteEdit').addEventListener('change', (e) => {
    document.getElementById('divDataLimiteEdit').classList.toggle('d-none', !e.target.checked);
    document.getElementById('dataLimiteDividaEdit').required = e.target.checked;
    if(!e.target.checked) document.getElementById('dataLimiteDividaEdit').value = '';
});

document.getElementById('temParcelamento').addEventListener('change', (e) => {
    document.getElementById('divParcelamento').classList.toggle('d-none', !e.target.checked);
});

// 1. Carregar Meses
async function carregarMeses() {
    selectMeses.innerHTML = '<option value="">Carregando...</option>';
    mesDividaModal.innerHTML = ''; 
    mesDividaModalEdit.innerHTML = ''; 
    listaMesesParcelamento.innerHTML = ''; 

    const q = query(collection(db, "meses"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    selectMeses.innerHTML = '<option value="" disabled selected>Escolha um mês...</option>';
    
    querySnapshot.forEach((documento) => {
        const dados = documento.data();
        
        selectMeses.insertAdjacentHTML('beforeend', `<option value="${documento.id}">${dados.nome}</option>`);
        mesDividaModal.insertAdjacentHTML('beforeend', `<option value="${documento.id}">${dados.nome}</option>`);
        mesDividaModalEdit.insertAdjacentHTML('beforeend', `<option value="${documento.id}">${dados.nome}</option>`);
        
        listaMesesParcelamento.insertAdjacentHTML('beforeend', `
            <div class="form-check">
                <input class="form-check-input chk-mes-extra" type="checkbox" value="${documento.id}" id="chk_${documento.id}">
                <label class="form-check-label text-secondary" for="chk_${documento.id}">
                    ${dados.nome}
                </label>
            </div>
        `);
    });
}

// 2. Carregar Dívidas 
async function carregarDividas(mesId) {
    listaDividas.innerHTML = '<div class="col-12 text-center text-muted py-5"><div class="spinner-border text-primary"></div></div>';
    
    const q = query(collection(db, "dividas"), where("mesId", "==", mesId));
    const querySnapshot = await getDocs(q);
    
    listaDividas.innerHTML = '';
    
    let somaRestante = 0; 
    let totalDividas = 0;
    let dividasQuitadas = 0;

    const badgeQuitado = document.getElementById('badgeMesQuitado');
    const totalMesEl = document.getElementById('totalMes');

    if (querySnapshot.empty) {
        listaDividas.innerHTML = '<div class="col-12 text-center text-muted py-4">Nenhuma dívida cadastrada neste mês.</div>';
        badgeQuitado.classList.add('d-none');
        totalMesEl.className = 'fw-bold text-danger mb-0';
    } else {
        querySnapshot.forEach((documento) => {
            const div = documento.data();
            const divId = documento.id;
            
            totalDividas++;
            
            if (div.quitada) {
                dividasQuitadas++;
            } else {
                somaRestante += Number(div.valor);
            }
            
            const dataFormatada = div.temDataLimite ? new Date(div.dataLimite + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem limite';
            const badgeClass = div.temDataLimite ? 'bg-warning text-dark' : 'bg-light text-secondary border';
            const cardOpacity = div.quitada ? 'opacity-75 bg-light' : '';
            const textStrike = div.quitada ? 'text-decoration-line-through text-muted' : 'fw-bold';
            const valueColor = div.quitada ? 'text-success' : 'text-danger';

            listaDividas.innerHTML += `
                <div class="col-md-4 mb-4">
                    <div class="card divida-card border-0 shadow-sm rounded-4 h-100 ${cardOpacity}">
                        <div class="card-body position-relative">
                            
                            <div class="position-absolute top-0 end-0 mt-3 me-3">
                                <button class="btn btn-sm btn-light border btn-editar me-1" 
                                    data-id="${divId}" data-mes="${div.mesId}" 
                                    data-nome="${div.nome}" data-valor="${div.valor}" 
                                    data-tem-limite="${div.temDataLimite}" data-limite="${div.dataLimite || ''}"
                                    title="Editar Dívida">
                                    <i class="fa-solid fa-pen text-primary"></i>
                                </button>
                                <button class="btn btn-sm btn-light border btn-excluir" data-id="${divId}" title="Excluir Dívida">
                                    <i class="fa-solid fa-trash text-danger"></i>
                                </button>
                            </div>

                            <h5 class="${textStrike} mb-1 pe-5">${div.nome}</h5>
                            <span class="badge ${badgeClass} mb-3"><i class="fa-regular fa-clock me-1"></i> ${dataFormatada}</span>
                            <h3 class="${valueColor} fw-bold mb-3">R$ ${Number(div.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</h3>
                            
                            <div class="form-check form-switch pt-3 border-top">
                                <input class="form-check-input" type="checkbox" id="check_${divId}" onchange="toggleQuitada('${divId}', this.checked)" ${div.quitada ? 'checked' : ''}>
                                <label class="form-check-label small ${div.quitada ? 'text-success fw-bold' : 'text-muted'}" for="check_${divId}">
                                    ${div.quitada ? '<i class="fa-solid fa-check-double"></i> Dívida Quitada' : 'Marcar como paga'}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    const selectOption = selectMeses.options[selectMeses.selectedIndex];
    const nomeMesOriginal = selectOption.textContent.replace(' ✅', ''); 

    if (totalDividas > 0 && totalDividas === dividasQuitadas) {
        badgeQuitado.classList.remove('d-none');
        totalMesEl.className = 'fw-bold text-success mb-0';
        selectOption.textContent = nomeMesOriginal + ' ✅';
    } else {
        badgeQuitado.classList.add('d-none');
        totalMesEl.className = 'fw-bold text-danger mb-0';
        selectOption.textContent = nomeMesOriginal;
    }

    totalMesEl.textContent = `R$ ${somaRestante.toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
}

// 3. Atualizar Status (Quitada)
window.toggleQuitada = async (idDivida, novoStatus) => {
    try {
        await updateDoc(doc(db, "dividas", idDivida), { quitada: novoStatus });
        mostrarNotificacao(novoStatus ? 'Dívida abatida do valor total! 💸' : 'Status revertido.', 'success');
        carregarDividas(selectMeses.value); 
    } catch (error) {
        mostrarNotificacao('Erro ao alterar status da dívida.', 'danger');
    }
};

// 4. Excluir Mês Completo
btnExcluirMes.addEventListener('click', async () => {
    const mesId = selectMeses.value;
    const option = selectMeses.options[selectMeses.selectedIndex];
    const nomeMes = option.textContent.replace(' ✅', '');

    if (confirm(`ATENÇÃO: Deseja realmente excluir o mês "${nomeMes}"? \nTodas as dívidas cadastradas neste mês também serão apagadas. Esta ação não pode ser desfeita.`)) {
        btnExcluirMes.disabled = true;
        
        try {
            const q = query(collection(db, "dividas"), where("mesId", "==", mesId));
            const snapshot = await getDocs(q);
            
            const promessasExclusao = [];
            snapshot.forEach((documento) => {
                promessasExclusao.push(deleteDoc(doc(db, "dividas", documento.id)));
            });
            await Promise.all(promessasExclusao);

            await deleteDoc(doc(db, "meses", mesId));
            
            mostrarNotificacao(`<i class="fa-solid fa-trash me-2"></i> Mês "${nomeMes}" apagado.`, 'success');
            
            selectMeses.value = "";
            btnNovaDivida.disabled = true;
            btnExcluirMes.disabled = true;
            listaDividas.innerHTML = '';
            document.getElementById('totalMes').textContent = 'R$ 0,00';
            document.getElementById('badgeMesQuitado').classList.add('d-none');
            
            await carregarMeses();

        } catch (error) {
            console.error("Erro ao apagar o mês:", error);
            mostrarNotificacao('Erro ao excluir o mês.', 'danger');
            btnExcluirMes.disabled = false;
        }
    }
});

// 5. Delegação de Eventos (Ouvir cliques nos botões Editar e Excluir Dívida)
listaDividas.addEventListener('click', async (e) => {
    
    // EXCLUIR Dívida individual
    const btnExcluir = e.target.closest('.btn-excluir');
    if (btnExcluir) {
        if (confirm("Tem certeza que deseja excluir esta dívida de forma permanente?")) {
            try {
                await deleteDoc(doc(db, "dividas", btnExcluir.dataset.id));
                mostrarNotificacao('<i class="fa-solid fa-trash me-2"></i> Dívida excluída.', 'success');
                carregarDividas(selectMeses.value);
            } catch (error) {
                mostrarNotificacao('Erro ao excluir dívida.', 'danger');
            }
        }
    }

    // EDITAR (Preencher e abrir modal)
    const btnEditar = e.target.closest('.btn-editar');
    if (btnEditar) {
        document.getElementById('idDividaEdit').value = btnEditar.dataset.id;
        document.getElementById('mesDividaModalEdit').value = btnEditar.dataset.mes;
        document.getElementById('nomeDividaEdit').value = btnEditar.dataset.nome;
        document.getElementById('valorDividaEdit').value = btnEditar.dataset.valor;
        
        const temLimite = btnEditar.dataset.temLimite === 'true';
        document.getElementById('temDataLimiteEdit').checked = temLimite;
        
        const divDataEdit = document.getElementById('divDataLimiteEdit');
        const inputDataEdit = document.getElementById('dataLimiteDividaEdit');
        
        if (temLimite) {
            divDataEdit.classList.remove('d-none');
            inputDataEdit.required = true;
            inputDataEdit.value = btnEditar.dataset.limite;
        } else {
            divDataEdit.classList.add('d-none');
            inputDataEdit.required = false;
            inputDataEdit.value = '';
        }
        
        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarDivida'));
        modal.show();
    }
});

// 6. Formulários Submit
selectMeses.addEventListener('change', (e) => {
    if (e.target.value) {
        btnNovaDivida.disabled = false;
        btnExcluirMes.disabled = false;
        carregarDividas(e.target.value);
    } else {
        btnNovaDivida.disabled = true;
        btnExcluirMes.disabled = true;
        listaDividas.innerHTML = '';
        totalMes.textContent = 'R$ 0,00';
    }
});

btnNovaDivida.addEventListener('click', () => {
    if (selectMeses.value) mesDividaModal.value = selectMeses.value;
});

formMes.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formMes.querySelector('button');
    btn.disabled = true;
    try {
        await addDoc(collection(db, "meses"), { nome: document.getElementById('nomeMes').value, createdAt: serverTimestamp() });
        bootstrap.Modal.getInstance(document.getElementById('modalMes')).hide();
        formMes.reset();
        await carregarMeses();
        mostrarNotificacao('<i class="fa-solid fa-check-circle me-2"></i> Mês cadastrado!', 'success');
    } catch (error) {
        mostrarNotificacao('Erro ao salvar o mês.', 'danger');
    } finally { btn.disabled = false; }
});

formDivida.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formDivida.querySelector('button');
    btn.disabled = true;
    
    const mesesSelecionados = new Set([mesDividaModal.value]);
    
    if (document.getElementById('temParcelamento').checked) {
        const checkboxes = document.querySelectorAll('.chk-mes-extra:checked');
        checkboxes.forEach(chk => mesesSelecionados.add(chk.value));
    }
    
    const temLimite = document.getElementById('temDataLimite').checked;
    
    const dadosGerais = {
        nome: document.getElementById('nomeDivida').value,
        valor: parseFloat(document.getElementById('valorDivida').value),
        temDataLimite: temLimite,
        dataLimite: temLimite ? document.getElementById('dataLimiteDivida').value : null,
        quitada: false,
        createdAt: serverTimestamp()
    };
    
    try {
        const promessas = [];
        mesesSelecionados.forEach(mesId => {
            const dividaMes = { ...dadosGerais, mesId: mesId };
            promessas.push(addDoc(collection(db, "dividas"), dividaMes));
        });
        
        await Promise.all(promessas);
        
        bootstrap.Modal.getInstance(document.getElementById('modalDivida')).hide();
        formDivida.reset();
        document.getElementById('divDataLimite').classList.add('d-none');
        document.getElementById('divParcelamento').classList.add('d-none');
        
        if (mesesSelecionados.has(selectMeses.value)) {
            carregarDividas(selectMeses.value);
        }
        
        mostrarNotificacao(`<i class="fa-solid fa-check-circle me-2"></i> Dívida adicionada em ${mesesSelecionados.size} mês(es)!`, 'success');
    } catch (error) {
        mostrarNotificacao('Erro ao salvar dívida.', 'danger');
        console.error(error);
    } finally { 
        btn.disabled = false; 
    }
});

formEditarDivida.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formEditarDivida.querySelector('button');
    btn.disabled = true;
    
    const idDivida = document.getElementById('idDividaEdit').value;
    const mesIdEscolhido = document.getElementById('mesDividaModalEdit').value;
    const temLimite = document.getElementById('temDataLimiteEdit').checked;
    
    try {
        await updateDoc(doc(db, "dividas", idDivida), {
            mesId: mesIdEscolhido,
            nome: document.getElementById('nomeDividaEdit').value,
            valor: parseFloat(document.getElementById('valorDividaEdit').value),
            temDataLimite: temLimite,
            dataLimite: temLimite ? document.getElementById('dataLimiteDividaEdit').value : null
        });
        
        bootstrap.Modal.getInstance(document.getElementById('modalEditarDivida')).hide();
        carregarDividas(selectMeses.value); 
        mostrarNotificacao('<i class="fa-solid fa-pen-to-square me-2"></i> Dívida atualizada!', 'success');
    } catch (error) {
        mostrarNotificacao('Erro ao atualizar dívida.', 'danger');
    } finally { btn.disabled = false; }
});

// Inicialização automática ao abrir a tela
document.addEventListener('DOMContentLoaded', () => {
    carregarMeses();
});