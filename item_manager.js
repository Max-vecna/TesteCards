import { saveData, getData, removeData } from './local_db.js';
import { renderFullItemSheet } from './item_renderer.js';

// Lista de perícias
const PERICIAS_DATA = {
    "AGILIDADE": {
        "Acrobacia": "Capacidade de realizar manobras complexas no ar, saltos e se equilibrar em locais instáveis.",
        "Montaria": "Controle de veículos e montarias complexas...",
        "Furtividade": "A arte de mover-se sem ser notado...",
        "Prestidigitação": "Coordenação motora fina. Usada para abrir fechaduras, desarmar armadilhas e realizar truques com as mãos."
    },
    "CARISMA": {
        "Adestramento": "Habilidade de treinar, cuidar e se comunicar com animais. Permite entender as necessidades de uma criatura e comandá-la.",
        "Enganação": "Habilidade de mentir, blefar ou disfarçar-se para enganar outros. Usada em interações sociais para induzir ao erro.",
        "Intimidação": "Uso da força de personalidade para impor medo...",
        "Persuasão": "Habilidade de convencer, influenciar ou negociar com outros. Usada para testes de diplomacia, negociação ou argumentação."
    },
    "INTELIGÊNCIA": {
        "Arcanismo": "Conhecimento sobre magia, rituais, criaturas mágicas e mistérios arcanos.",
        "História": "Conhecimento sobre o passado, eventos históricos, figuras importantes, reinos e culturas.",
        "Investigação": "Capacidade de procurar por pistas e desvendar mistérios, como em uma cena de crime ou em uma busca por informações.",
        "Medicina": "Conhecimento para diagnosticar doenças, tratar ferimentos e conhecer a anatomia de seres vivos."
    },
    "FORÇA": {
        "Atletismo": "Habilidade atlética geral, incluindo correr, saltar, nadar e escalar. Usado para testes de esforço físico.",
        "Luta": "Combate corpo a corpo com armas simples ou improvisadas..."
    },
    "SABEDORIA": {
        "Intuição": "Percepção aguçada de situações e pessoas. Usada para identificar mentiras, prever perigos ou sentir a intenção dos outros.",
        "Percepção": "Capacidade de perceber o ambiente ao redor usando os cinco sentidos. Usada para encontrar objetos escondidos, armadilhas ou inimigos à espreita.",
        "Natureza": "Sabedoria sobre o mundo natural...",
        "Vontade": "Resistência mental. Usada para resistir a efeitos de medo, ilusões e controle mental."
    },
    "VIGOR": {
        "Sobrevivência": "Capacidade de encontrar recursos no ambiente natural, como comida e água, e resistir a condições extremas.",
        "Fortitude": "Resistência física e imunológica do personagem..."
    }
};

// Variáveis de estado
let currentEditingItemId = null;
let itemImageFile = null;

// Funções auxiliares para imagens (simplificadas para brevidade)
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

function getPredominantColor(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            try {
                const imageData = ctx.getImageData(0, 0, img.width, img.height).data;
                let r = 0, g = 0, b = 0;
                let count = 0;
                const step = 4 * 10;

                for (let i = 0; i < imageData.length; i += step) {
                    r += imageData[i];
                    g += imageData[i + 1];
                    b += imageData[i + 2];
                    count++;
                }

                const avgR = Math.floor(r / count);
                const avgG = Math.floor(g / count);
                const avgB = Math.floor(b / count);

                resolve(`rgb(${avgR}, ${avgG}, ${avgB})`);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = (e) => reject(e);
    });
}


/**
 * Popula os checkboxes de perícias no formulário de item.
 * @param {Array} [selectedPericias] - Perícias para pré-selecionar.
 */
export function populateItemPericiasCheckboxes(selectedPericias = []) {
    const container = document.getElementById('item-pericias-checkboxes-container');
    if (!container) return;
    container.innerHTML = '';
    
    const periciaDescriptionDisplay = document.getElementById('item-pericia-description-display');
    const periciaDescriptionTitle = document.getElementById('itemPericiaDescriptionTitle');
    const periciaDescriptionText = document.getElementById('itemPericiaDescriptionText');

    for (const attribute in PERICIAS_DATA) {
        const details = document.createElement('details');
        details.className = 'bg-gray-700 rounded-lg p-2 transition-all duration-300';
        details.innerHTML = `
            <summary class="flex items-center justify-between cursor-pointer font-semibold text-amber-200">
                <span>${attribute}</span>
                <svg class="w-4 h-4 transform transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </summary>
            <div class="mt-2 space-y-2 pl-4 border-l border-gray-600 pericias-list"></div>
        `;
        const periciasList = details.querySelector('.pericias-list');
        details.querySelector('summary').addEventListener('click', () => {
            setTimeout(() => {
                details.querySelector('svg').style.transform = details.open ? 'rotate(90deg)' : 'rotate(0deg)';
            }, 300);
        });

        for (const periciaName in PERICIAS_DATA[attribute]) {
            const periciaItem = document.createElement('div');
            periciaItem.className = 'flex items-center justify-between pericia-item rounded-md p-1';
            const periciaId = `item-pericia-${periciaName.replace(/\s+/g, '-')}`;
            
            const selectedPericia = selectedPericias.find(p => p.name === periciaName);
            const isChecked = selectedPericia ? 'checked' : '';
            const value = selectedPericia ? selectedPericia.value : '';

            periciaItem.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="${periciaId}" name="pericia" value="${periciaName}" class="form-checkbox h-4 w-4 text-amber-500 rounded border-gray-600 focus:ring-amber-500" ${isChecked}>
                    <label for="${periciaId}" class="ml-2 text-sm text-gray-200 cursor-pointer">${periciaName}</label>
                </div>
                <input type="number" id="${periciaId}-value" placeholder="0" value="${value}" class="w-16 px-2 py-1 bg-gray-800 text-white text-sm rounded-md border border-gray-600 focus:border-amber-500">
            `;
            periciasList.appendChild(periciaItem);

            periciaItem.querySelector('label').addEventListener('mouseenter', () => {
                periciaDescriptionTitle.textContent = periciaName;
                periciaDescriptionText.textContent = PERICIAS_DATA[attribute][periciaName];
                periciaDescriptionDisplay.classList.remove('hidden');
            });

            periciaItem.querySelector('label').addEventListener('mouseleave', () => {
                periciaDescriptionDisplay.classList.add('hidden');
            });
        }
        container.appendChild(details);
    }
}

/**
 * Salva ou atualiza um item no IndexedDB.
 * @param {HTMLFormElement} itemForm - O formulário com os dados do item.
 */
export async function saveItemCard(itemForm) {
    const itemNameInput = document.getElementById('itemName');
    const itemDescriptionInput = document.getElementById('itemDescription');
    const itemTypeInput = document.getElementById('item-type');
    const itemDamageInput = document.getElementById('item-damage');
    const itemChargeInput = document.getElementById('item-charge');
    const itemPrerequisiteInput = document.getElementById('item-prerequisite');
    const itemRestoreLifeInput = document.getElementById('item-restore-life');
    const itemRestoreManaInput = document.getElementById('item-restore-mana');
    const itemUsableInput = document.getElementById('item-usable');
    
    // Inputs de aumentos
    const agilidadeAumentoInput = document.getElementById('item-agilidade-aumento');
    const carismaAumentoInput = document.getElementById('item-carisma-aumento');
    const forcaAumentoInput = document.getElementById('item-forca-aumento');
    const inteligenciaAumentoInput = document.getElementById('item-inteligencia-aumento');
    const sabedoriaAumentoInput = document.getElementById('item-sabedoria-aumento');
    const vigorAumentoInput = document.getElementById('item-vigor-aumento');
    const armaduraAumentoInput = document.getElementById('item-armadura-aumento');
    const esquivaAumentoInput = document.getElementById('item-esquiva-aumento');
    const bloqueioAumentoInput = document.getElementById('item-bloqueio-aumento');
    const deslocamentoAumentoInput = document.getElementById('item-deslocamento-aumento');

    const selectedPericias = [];
    document.querySelectorAll('#item-pericias-checkboxes-container input[type="checkbox"]:checked').forEach(cb => {
        const periciaName = cb.value;
        const periciaId = `item-pericia-${periciaName.replace(/\s+/g, '-')}`;
        const valueInput = document.getElementById(`${periciaId}-value`);
        selectedPericias.push({
            name: periciaName,
            value: parseInt(valueInput.value) || 0
        });
    });

    const aumentos = {
        agilidade: parseInt(agilidadeAumentoInput.value) || 0,
        carisma: parseInt(carismaAumentoInput.value) || 0,
        forca: parseInt(forcaAumentoInput.value) || 0,
        inteligencia: parseInt(inteligenciaAumentoInput.value) || 0,
        sabedoria: parseInt(sabedoriaAumentoInput.value) || 0,
        vigor: parseInt(vigorAumentoInput.value) || 0,
        armadura: parseInt(armaduraAumentoInput.value) || 0,
        esquiva: parseInt(esquivaAumentoInput.value) || 0,
        bloqueio: parseInt(bloqueioAumentoInput.value) || 0,
        deslocamento: parseInt(deslocamentoAumentoInput.value) || 0,
        pericias: selectedPericias
    };
    
    const imageBuffer = itemImageFile ? await readFileAsArrayBuffer(itemImageFile) : null;
    
    let predominantColor = null;
    if (imageBuffer && itemImageFile) {
        const tempUrl = URL.createObjectURL(bufferToBlob(imageBuffer, itemImageFile.type));
        predominantColor = await getPredominantColor(tempUrl).catch(() => '#a0522d');
        URL.revokeObjectURL(tempUrl);
    }

    let itemData;
    if (currentEditingItemId) {
        itemData = await getData('rpgItems', currentEditingItemId);
        Object.assign(itemData, {
            name: itemNameInput.value,
            description: itemDescriptionInput.value,
            type: itemTypeInput.value,
            damage: itemDamageInput.value,
            charge: parseInt(itemChargeInput.value) || 0,
            prerequisite: itemPrerequisiteInput.value,
            restoreLife: parseInt(itemRestoreLifeInput.value) || 0,
            restoreMana: parseInt(itemRestoreManaInput.value) || 0,
            usable: itemUsableInput.checked,
            aumentos,
            image: imageBuffer || itemData.image,
            imageMimeType: itemImageFile ? itemImageFile.type : itemData.imageMimeType,
            predominantColor: predominantColor || itemData.predominantColor || '#a0522d'
        });
    } else {
        itemData = {
            id: Date.now().toString(),
            name: itemNameInput.value,
            description: itemDescriptionInput.value,
            type: itemTypeInput.value,
            damage: itemDamageInput.value,
            charge: parseInt(itemChargeInput.value) || 0,
            prerequisite: itemPrerequisiteInput.value,
            restoreLife: parseInt(itemRestoreLifeInput.value) || 0,
            restoreMana: parseInt(itemRestoreManaInput.value) || 0,
            usable: itemUsableInput.checked,
            aumentos,
            image: imageBuffer,
            imageMimeType: itemImageFile ? itemImageFile.type : null,
            predominantColor: predominantColor || '#a0522d'
        };
    }

    await saveData('rpgItems', itemData);
    itemForm.reset();
    itemImageFile = null;
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
    document.getElementById('itemDescription').value = itemData.description;
    document.getElementById('item-type').value = itemData.type || '';
    document.getElementById('item-damage').value = itemData.damage || '';
    document.getElementById('item-charge').value = itemData.charge || 0;
    document.getElementById('item-prerequisite').value = itemData.prerequisite || '';
    document.getElementById('item-restore-life').value = itemData.restoreLife || 0;
    document.getElementById('item-restore-mana').value = itemData.restoreMana || 0;
    document.getElementById('item-usable').checked = itemData.usable || false;

    // Preenche os aumentos
    const aumentos = itemData.aumentos || {};
    document.getElementById('item-agilidade-aumento').value = aumentos.agilidade || 0;
    document.getElementById('item-carisma-aumento').value = aumentos.carisma || 0;
    document.getElementById('item-forca-aumento').value = aumentos.forca || 0;
    document.getElementById('item-inteligencia-aumento').value = aumentos.inteligencia || 0;
    document.getElementById('item-sabedoria-aumento').value = aumentos.sabedoria || 0;
    document.getElementById('item-vigor-aumento').value = aumentos.vigor || 0;
    document.getElementById('item-armadura-aumento').value = aumentos.armadura || 0;
    document.getElementById('item-esquiva-aumento').value = aumentos.esquiva || 0;
    document.getElementById('item-bloqueio-aumento').value = aumentos.bloqueio || 0;
    document.getElementById('item-deslocamento-aumento').value = aumentos.deslocamento || 0;

    populateItemPericiasCheckboxes(aumentos.pericias || []);

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


document.getElementById('itemImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        itemImageFile = file;
        showImagePreview(document.getElementById('itemImagePreview'), URL.createObjectURL(file));
    }
});

