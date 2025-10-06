import { saveData, getData, removeData } from './local_db.js';
import { renderFullItemSheet } from './item_renderer.js';

// Lista de perícias e atributos para popular o seletor de aumentos
const AUMENTOS_DATA = {
    "Status": ["Vida", "Mana", "Armadura", "Esquiva", "Bloqueio", "Deslocamento"],
    "Atributos": ["Agilidade", "Carisma", "Força", "Inteligência", "Sabedoria", "Vigor"],
    "Perícias": {
        "AGILIDADE": ["Acrobacia", "Montaria", "Furtividade", "Prestidigitação"],
        "CARISMA": ["Adestramento", "Enganação", "Intimidação", "Persuasão"],
        "INTELIGÊNCIA": ["Arcanismo", "História", "Investigação", "Medicina"],
        "FORÇA": ["Atletismo", "Luta"],
        "SABEDORIA": ["Intuição", "Percepção", "Natureza", "Vontade"],
        "VIGOR": ["Sobrevivência", "Fortitude"]
    }
};

// Variáveis de estado
let currentEditingItemId = null;
let itemImageFile = null;

// Funções auxiliares para imagens
function showImagePreview(element, url) {
    if (url) {
        element.src = url;
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsArrayBuffer(file);
    });
}

function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

/**
 * Popula o select de aumentos no formulário de item.
 */
export function populateItemAumentosSelect() {
    const select = document.getElementById('item-aumento-select');
    if (!select) return;
    select.innerHTML = ''; // Limpa opções existentes

    // Adiciona Status
    const statusGroup = document.createElement('optgroup');
    statusGroup.label = 'Status';
    AUMENTOS_DATA.Status.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        option.textContent = stat;
        statusGroup.appendChild(option);
    });
    select.appendChild(statusGroup);

    // Adiciona Atributos
    const atributosGroup = document.createElement('optgroup');
    atributosGroup.label = 'Atributos';
    AUMENTOS_DATA.Atributos.forEach(attr => {
        const option = document.createElement('option');
        option.value = attr.toLowerCase();
        option.textContent = attr;
        atributosGroup.appendChild(option);
    });
    select.appendChild(atributosGroup);

    // Adiciona Perícias
    for (const attr in AUMENTOS_DATA.Perícias) {
        const periciasGroup = document.createElement('optgroup');
        periciasGroup.label = `Perícias (${attr})`;
        AUMENTOS_DATA.Perícias[attr].forEach(pericia => {
            const option = document.createElement('option');
            option.value = pericia;
            option.textContent = pericia;
            periciasGroup.appendChild(option);
        });
        select.appendChild(periciasGroup);
    }
}


/**
 * Adiciona um elemento visual de aumento à lista no formulário.
 * @param {object} aumento - O objeto de aumento a ser renderizado.
 */
function renderAumentoNaLista(aumento) {
    const list = document.getElementById('item-aumentos-list');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between bg-gray-800 p-2 rounded-lg';
    div.dataset.nome = aumento.nome;
    div.dataset.valor = aumento.valor;
    div.dataset.tipo = aumento.tipo;

    div.innerHTML = `
        <div>
            <span class="font-semibold text-amber-300">${aumento.nome}</span>
            <span class="text-white ml-2">${aumento.valor > 0 ? '+' : ''}${aumento.valor}</span>
            <span class="text-xs ${aumento.tipo === 'fixo' ? 'text-green-400' : 'text-blue-400'} ml-2 capitalize">(${aumento.tipo})</span>
        </div>
        <button type="button" class="text-red-500 hover:text-red-400 remove-aumento-btn text-xl leading-none">&times;</button>
    `;

    div.querySelector('.remove-aumento-btn').addEventListener('click', () => {
        div.remove();
    });

    list.appendChild(div);
}


/**
 * Salva ou atualiza um item no IndexedDB.
 * @param {HTMLFormElement} itemForm - O formulário com os dados do item.
 */
export async function saveItemCard(itemForm) {
    const itemNameInput = document.getElementById('itemName');
    const itemDescriptionInput = document.getElementById('itemDescription');
    
    // Coleta os aumentos da lista
    const aumentosList = document.getElementById('item-aumentos-list');
    const aumentos = [];
    aumentosList.querySelectorAll('div[data-nome]').forEach(el => {
        aumentos.push({
            nome: el.dataset.nome,
            valor: parseInt(el.dataset.valor, 10),
            tipo: el.dataset.tipo
        });
    });

    const imageBuffer = itemImageFile ? await readFileAsArrayBuffer(itemImageFile) : null;
    
    let itemData;
    if (currentEditingItemId) {
        itemData = await getData('rpgItems', currentEditingItemId);
        Object.assign(itemData, {
            name: itemNameInput.value,
            effect: itemDescriptionInput.value,
            aumentos,
            image: imageBuffer || itemData.image,
            imageMimeType: itemImageFile ? itemImageFile.type : itemData.imageMimeType,
        });
    } else {
        itemData = {
            id: Date.now().toString(),
            name: itemNameInput.value,
            effect: itemDescriptionInput.value,
            aumentos,
            image: imageBuffer,
            imageMimeType: itemImageFile ? itemImageFile.type : null,
        };
    }

    await saveData('rpgItems', itemData);
    itemForm.reset();
    itemImageFile = null;
    document.getElementById('item-aumentos-list').innerHTML = '';
    showImagePreview(document.getElementById('itemImagePreview'), null);
    currentEditingItemId = null;
}

/**
 * Carrega os dados de um item no formulário para edição.
 * @param {string} itemId - O ID do item a ser editado.
 */
export async function editItem(itemId) {
    const itemData = await getData('rpgItems', itemId);
    if (!itemData) return;

    currentEditingItemId = itemId;
    document.getElementById('itemName').value = itemData.name;
    document.getElementById('itemDescription').value = itemData.effect;

    // Limpa a lista de aumentos e a repopula
    const aumentosList = document.getElementById('item-aumentos-list');
    aumentosList.innerHTML = '';
    if (itemData.aumentos && Array.isArray(itemData.aumentos)) {
        itemData.aumentos.forEach(aumento => renderAumentoNaLista(aumento));
    }

    const itemImagePreview = document.getElementById('itemImagePreview');
    if (itemData.image) {
        const imageBlob = bufferToBlob(itemData.image, itemData.imageMimeType);
        showImagePreview(itemImagePreview, URL.createObjectURL(imageBlob));
    } else {
        showImagePreview(itemImagePreview, null);
    }
}

/**
 * Remove um item do IndexedDB.
 * @param {string} itemId - O ID do item a ser removido.
 */
export async function removeItem(itemId) {
    await removeData('rpgItems', itemId);
}

/**
 * Exporta um único item para um arquivo JSON.
 * @param {string} itemId - O ID do item a ser exportado.
 */
export async function exportItem(itemId) {
    const itemData = await getData('rpgItems', itemId);
    if (itemData) {
        const dataToExport = { ...itemData };
        if (dataToExport.image) dataToExport.image = arrayBufferToBase64(dataToExport.image);
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(dataToExport.name || 'item').replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

/**
 * Importa um único item de um arquivo JSON.
 * @param {File} file - O arquivo JSON a ser importado.
 */
export async function importItem(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedItem = JSON.parse(e.target.result);
                importedItem.id = Date.now().toString(); // Garante ID único
                if (importedItem.image) {
                    importedItem.image = base64ToArrayBuffer(importedItem.image);
                }
                await saveData('rpgItems', importedItem);
                resolve(importedItem);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

// Inicializa o select quando o DOM está pronto
document.addEventListener('DOMContentLoaded', () => {
    populateItemAumentosSelect();

    // Listener para o botão de adicionar aumento
    const addBtn = document.getElementById('add-item-aumento-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const select = document.getElementById('item-aumento-select');
            const valueInput = document.getElementById('item-aumento-value');
            const typeRadio = document.querySelector('input[name="item-aumento-type"]:checked');

            const nome = select.options[select.selectedIndex].text;
            const valor = parseInt(valueInput.value, 10) || 0;
            const tipo = typeRadio.value;
            
            if (!nome || valor === 0) {
                alert("Por favor, selecione um tipo de aumento e insira um valor diferente de zero.");
                return;
            }

            renderAumentoNaLista({ nome, valor, tipo });
            valueInput.value = '0';
        });
    }
});


document.getElementById('itemImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        itemImageFile = file;
        showImagePreview(document.getElementById('itemImagePreview'), URL.createObjectURL(file));
    }
});
