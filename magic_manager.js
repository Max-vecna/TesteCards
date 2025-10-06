import { openDatabase, saveData, getData, removeData } from './local_db.js';
import { renderFullSpellSheet } from './magic_renderer.js';

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
let currentEditingSpellId = null;
let spellImageFile = null;

// Funções auxiliares para imagens
function showImagePreview(element, url, isImageElement) {
    if (url) {
        if (isImageElement) element.src = url;
        else element.style.backgroundImage = `url('${url}')`;
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        if (!file) {
            resolve(null);
            return;
        }
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
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
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
 * Popula o select de aumentos no formulário de magia/habilidade.
 */
export function populateSpellAumentosSelect() {
    const select = document.getElementById('spell-aumento-select');
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
    const list = document.getElementById('spell-aumentos-list');
    if (!list) return;

    const div = document.createElement('div');
    div.className = 'flex items-center justify-between bg-gray-800 p-2 rounded-lg';
    div.dataset.nome = aumento.nome;
    div.dataset.valor = aumento.valor;
    div.dataset.tipo = aumento.tipo;

    div.innerHTML = `
        <div>
            <span class="font-semibold text-teal-300">${aumento.nome}</span>
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
 * Salva ou atualiza uma magia/habilidade no IndexedDB.
 * @param {HTMLFormElement} spellForm - O formulário com os dados da magia.
 * @param {string} type - O tipo de item a ser salvo ('magia' ou 'habilidade').
 * @returns {Promise<void>}
 */
export async function saveSpellCard(spellForm, type) {
    const spellNameInput = document.getElementById('spellName');
    const spellCircleInput = document.getElementById('spellCircle');
    const spellExecutionInput = document.getElementById('spellExecution');
    const spellManaCostInput = document.getElementById('spellManaCost');
    const spellRangeInput = document.getElementById('spellRange');
    const spellTargetInput = document.getElementById('spellTarget');
    const spellDurationInput = document.getElementById('spellDuration');
    const spellResistenciaInput = document.getElementById('spellResistencia');
    const spellDescriptionInput = document.getElementById('spellDescription');
    const spellEnhanceInput = document.getElementById('spellEnhance');
    const spellTrueInput = document.getElementById('spellTrue');

    // Coleta os aumentos da lista
    const aumentosList = document.getElementById('spell-aumentos-list');
    const aumentos = [];
    aumentosList.querySelectorAll('div[data-nome]').forEach(el => {
        aumentos.push({
            nome: el.dataset.nome,
            valor: parseInt(el.dataset.valor, 10),
            tipo: el.dataset.tipo
        });
    });
    
    const imageBuffer = spellImageFile ? await readFileAsArrayBuffer(spellImageFile) : null;
    
    let spellData;
    if (currentEditingSpellId) {
        spellData = await getData('rpgSpells', currentEditingSpellId);
        if (!spellData) return;
        Object.assign(spellData, {
            name: spellNameInput.value,
            circle: parseInt(spellCircleInput.value) || 0,
            execution: spellExecutionInput.value,
            manaCost: parseInt(spellManaCostInput.value) || 0,
            range: spellRangeInput.value,
            target: spellTargetInput.value,
            duration: spellDurationInput.value,
            resistencia: spellResistenciaInput.value,
            description: spellDescriptionInput.value,
            enhance: spellEnhanceInput.value,
            true: spellTrueInput.value,
            aumentos: aumentos,
            type: type,
            image: imageBuffer || spellData.image,
            imageMimeType: spellImageFile ? spellImageFile.type : spellData.imageMimeType,
        });
    } else {
        spellData = {
            id: Date.now().toString(),
            name: spellNameInput.value,
            circle: parseInt(spellCircleInput.value) || 0,
            execution: spellExecutionInput.value,
            manaCost: parseInt(spellManaCostInput.value) || 0,
            range: spellRangeInput.value,
            target: spellTargetInput.value,
            duration: spellDurationInput.value,
            resistencia: spellResistenciaInput.value,
            description: spellDescriptionInput.value,
            enhance: spellEnhanceInput.value,
            true: spellTrueInput.value,
            aumentos: aumentos,
            type: type,
            image: imageBuffer,
            imageMimeType: spellImageFile ? spellImageFile.type : null,
        };
    }

    await saveData('rpgSpells', spellData);
    spellForm.reset();
    spellImageFile = null;
    document.getElementById('spell-aumentos-list').innerHTML = '';
    showImagePreview(document.getElementById('spellImagePreview'), null, true);
    currentEditingSpellId = null;
}

/**
 * Carrega os dados de uma magia/habilidade existente no formulário para edição.
 * @param {string} spellId - O ID da magia a ser editada.
 */
export async function editSpell(spellId) {
    const spellData = await getData('rpgSpells', spellId);
    if (!spellData) return;

    currentEditingSpellId = spellId;
    
    document.getElementById('spellName').value = spellData.name;
    document.getElementById('spellCircle').value = spellData.circle || '';
    document.getElementById('spellExecution').value = spellData.execution;
    document.getElementById('spellManaCost').value = spellData.manaCost || '';
    document.getElementById('spellRange').value = spellData.range;
    document.getElementById('spellTarget').value = spellData.target;
    document.getElementById('spellDuration').value = spellData.duration;
    document.getElementById('spellResistencia').value = spellData.resistencia;
    document.getElementById('spellDescription').value = spellData.description;
    document.getElementById('spellEnhance').value = spellData.enhance;
    document.getElementById('spellTrue').value = spellData.true;
    
    // Limpa a lista de aumentos e a repopula
    const aumentosList = document.getElementById('spell-aumentos-list');
    aumentosList.innerHTML = '';
    if (spellData.aumentos && Array.isArray(spellData.aumentos)) {
        spellData.aumentos.forEach(aumento => renderAumentoNaLista(aumento));
    }

    const spellImagePreview = document.getElementById('spellImagePreview');
    if (spellData.image) {
        const imageBlob = bufferToBlob(spellData.image, spellData.imageMimeType);
        showImagePreview(spellImagePreview, URL.createObjectURL(imageBlob), true);
    } else {
        showImagePreview(spellImagePreview, null, true);
    }
}

/**
 * Remove uma magia/habilidade do IndexedDB.
 * @param {string} spellId - O ID da magia a ser removida.
 */
export async function removeSpell(spellId) {
    if (window.confirm('Tem certeza que deseja excluir este item?')) {
        await removeData('rpgSpells', spellId);
    }
}

/**
 * Renderiza a lista de miniaturas de magias/habilidades na interface.
 * @param {string} type - 'magias' ou 'habilidades' para filtrar a lista.
 */
export async function renderSpellList(type = 'magias') {
    const contentDisplay = document.getElementById('content-display');
    contentDisplay.innerHTML = '';

    let allSpells = await getData('rpgSpells');

    // Filtra os itens com base no tipo
    if (type === 'magias') {
        allSpells = allSpells.filter(spell => spell.type === 'magia' || !spell.type); // Mantém dados antigos como magias
    } else if (type === 'habilidades') {
        allSpells = allSpells.filter(spell => spell.type === 'habilidade');
    }

    // Gera as miniaturas de forma assíncrona
    const spellsHtmlArray = await Promise.all(allSpells.map(async (spell) => {
        const spellSheetHtml = await renderFullSpellSheet(spell, false, 16/11);
        
        return `
            <div class="rpg-thumbnail bg-cover bg-center relative " data-action="viewSpell" data-type="spell" data-id="${spell.id}">
                <div class="miniCard absolute inset-0  flex flex-col items-center justify-center text-white p-2 rounded-lg">
                    ${spellSheetHtml}
                </div>
                <div class="thumbnail-actions absolute z-10">
                    <button class="thumb-btn thumb-btn-menu">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="thumbnail-menu" data-type="spell">
                        <button class="menu-item" data-action="edit" data-id="${spell.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="menu-item" data-action="remove" data-id="${spell.id}">
                            <i class="fas fa-trash-alt"></i> Excluir
                        </button>
                        <button class="menu-item" data-action="export-json" data-id="${spell.id}">
                            <i class="fas fa-file-download"></i> Baixar
                        </button>
                    </div>
                </div>
            </div>
        `;
    }));

    const buttonText = type === 'magias' ? 'Adicionar Magia' : 'Adicionar Habilidade';
    const buttonAction = type === 'magias' ? 'add-spell' : 'add-habilidade';
    const importBtnId = type === 'magias' ? 'import-cards-spell-btn' : 'import-cards-habilidade-btn';
    const importInputId = type === 'magias' ? 'import-spell-json-input' : 'import-habilidade-json-input';
    const importTitle = type === 'magias' ? 'Importar Magia (JSON)' : 'Importar Habilidade (JSON)';


    const spellsHtml = `
        <div class="grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0">
            <!-- Botão de Adicionar dinâmico -->
            <div class="relative w-full h-full aspect-square" style="aspect-ratio: 120 / 160;">
                <button class="add-card-button absolute inset-0" data-action="${buttonAction}">
                    <i class="fas fa-plus text-2xl mb-2"></i>
                    <span class="text-sm font-semibold">${buttonText}</span>
                </button>
                <div class="absolute -bottom-3 w-full flex justify-center gap-2">
                    <button class="thumb-btn bg-indigo-500 hover:bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center" 
                            id="${importBtnId}" title="${importTitle}">
                        <i class="fas fa-upload text-xs"></i>
                    </button>
                    <input type="file" id="${importInputId}" accept=".json" class="hidden">
                </div>
            </div>

            ${spellsHtmlArray.join('')}
        </div>
    `;

    contentDisplay.innerHTML += spellsHtml;

    // -------- Centralização dinâmica do spell-sheet --------
    function debounce(fn, wait = 100) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    function centerSpellSheetInMiniCard(miniCard) {
        const sheet = miniCard.querySelector('#spell-sheet');
        if (!sheet) return;

        const thumbRect = miniCard.getBoundingClientRect();
        const sheetRect = sheet.getBoundingClientRect();

        if (!isFinite(thumbRect.width) || !isFinite(sheetRect.width)) return;

        let left = (thumbRect.width - sheetRect.width) / 2;
        let top = (thumbRect.height - sheetRect.height) / 2;

        if (!isFinite(left)) left = 0;
        if (!isFinite(top)) top = 0;

        left = Math.max(left, 0);
        top = Math.max(top, 0);

        sheet.style.position = 'absolute';
        sheet.style.left = `${left}px`;
        sheet.style.top = `${top}px`;
    }

    function centerAllSpellSheets() {
        document.querySelectorAll('.miniCard').forEach(centerSpellSheetInMiniCard);
    }

    // limpa observadores antigos se já existirem
    if (window.__spellCenterRO) {
        try { window.__spellCenterRO.disconnect(); } catch(e) {}
        try { window.__spellCenterMO.disconnect(); } catch(e) {}
        window.__spellCenterRO = null;
        window.__spellCenterMO = null;
    }

    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            centerSpellSheetInMiniCard(entry.target);
        }
    });
    window.__spellCenterRO = ro;

    const gridContainer = contentDisplay.querySelector('.grid') || contentDisplay;
    const mo = new MutationObserver(debounce(() => {
        ro.disconnect();
        document.querySelectorAll('.miniCard').forEach(el => ro.observe(el));
        centerAllSpellSheets();
    }, 80));
    window.__spellCenterMO = mo;
    mo.observe(gridContainer, { childList: true, subtree: true });

    document.querySelectorAll('.miniCard').forEach(el => ro.observe(el));
    centerAllSpellSheets();

    window.addEventListener('resize', debounce(centerAllSpellSheets, 120));
    // ------------------------------------------------------

    // Adiciona o listener para o botão de importação
    document.getElementById(importBtnId).addEventListener('click', () => {
        document.getElementById(importInputId).click();
    });

    // Listener para importar JSON
    document.getElementById(importInputId).addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const importedItem = await importSpell(file, type);
                const itemTypeName = type === 'magias' ? 'Magia' : 'Habilidade';
                if (importedItem) {
                    showCustomAlert(`${itemTypeName} '${importedItem.name}' importada com sucesso!`);
                } else {
                    showCustomAlert(`Nenhum item encontrado no arquivo.`);
                }
                contentDisplay.innerHTML = '';
                renderSpellList(type);
            } catch (error) {
                showCustomAlert(`Erro ao importar arquivo. Verifique se é um JSON válido.`);
            } finally {
                e.target.value = '';
            }
        }
    });
}

/**
 * Exporta uma única magia/habilidade para um arquivo JSON.
 * @param {string} spellId - O ID da magia a ser exportada.
 */
export async function exportSpell(spellId) {
    const spellData = await getData('rpgSpells', spellId);
    if (spellData) {
        const dataToExport = { ...spellData };
        if (dataToExport.image) dataToExport.image = arrayBufferToBase64(dataToExport.image);
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeName = (dataToExport.name || 'item').replace(/\s+/g, '_');
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

/**
 * Importa uma única magia/habilidade a partir de um arquivo JSON.
 * @param {File} file - O arquivo JSON a ser importado.
 * @param {string} type - 'magias' ou 'habilidades' para definir o tipo do item importado.
 */
export async function importSpell(file, type) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedSpell = JSON.parse(e.target.result);
                if (!importedSpell || importedSpell.id === undefined) {
                    throw new Error("Formato de arquivo inválido. Esperado um único objeto com um ID.");
                }

                importedSpell.id = Date.now().toString();
                importedSpell.type = type === 'habilidades' ? 'habilidade' : 'magia';

                if (importedSpell.image) {
                    importedSpell.image = base64ToArrayBuffer(importedSpell.image);
                }
                
                await saveData('rpgSpells', importedSpell);
                resolve(importedSpell);
            } catch (error) {
                console.error("Erro ao importar item:", error);
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    populateSpellAumentosSelect();

    // Listener para o botão de adicionar aumento
    const addBtn = document.getElementById('add-spell-aumento-btn');
    if (addBtn) {
        addBtn.addEventListener('click', () => {
            const select = document.getElementById('spell-aumento-select');
            const valueInput = document.getElementById('spell-aumento-value');
            const typeRadio = document.querySelector('input[name="spell-aumento-type"]:checked');

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


document.getElementById('spellImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        spellImageFile = file;
        showImagePreview(document.getElementById('spellImagePreview'), URL.createObjectURL(file), true);
    }
});

function showCustomAlert(message) {
        const modalHtml = `
            <div id="custom-alert-modal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-sm border border-gray-700">
                    <p class="text-center text-lg mb-4">${message}</p>
                    <button id="close-alert-btn" class="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold">OK</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        document.getElementById('close-alert-btn').addEventListener('click', () => {
            document.getElementById('custom-alert-modal').remove();
        });
    }
