import { openDatabase, saveData, getData, removeData } from './local_db.js';
import { renderFullSpellSheet } from './magic_renderer.js';

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
 * Função para renderizar as perícias no formulário de magia.
 * @param {Array} [selectedPericias] - Um array de objetos de perícias para pré-selecionar.
 */
export function populateSpellPericiasCheckboxes(selectedPericias = []) {
    const container = document.getElementById('spell-pericias-checkboxes-container');
    if (!container) return;
    container.innerHTML = '';
    
    // Referências para o display de descrição
    const periciaDescriptionDisplay = document.getElementById('spell-pericia-description-display');
    const periciaDescriptionTitle = document.getElementById('spellPericiaDescriptionTitle');
    const periciaDescriptionText = document.getElementById('spellPericiaDescriptionText');

    for (const attribute in PERICIAS_DATA) {
        const details = document.createElement('details');
        details.className = 'bg-gray-700 rounded-lg p-2 transition-all duration-300';
        details.innerHTML = `
            <summary class="flex items-center justify-between cursor-pointer font-semibold text-teal-200">
                <span>${attribute}</span>
                <svg class="w-4 h-4 transform transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
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
            const periciaId = `spell-pericia-${periciaName.replace(/\s+/g, '-')}`;
            
            const selectedPericia = selectedPericias.find(p => p.name === periciaName);
            const isChecked = selectedPericia ? 'checked' : '';
            const value = selectedPericia ? selectedPericia.value : '';

            periciaItem.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="${periciaId}" name="pericia" value="${periciaName}" class="form-checkbox h-4 w-4 text-teal-500 rounded border-gray-600 focus:ring-teal-500" ${isChecked}>
                    <label for="${periciaId}" class="ml-2 text-sm text-gray-200 cursor-pointer">${periciaName}</label>
                </div>
                <input type="number" id="${periciaId}-value" placeholder="0" value="${value}" class="w-16 px-2 py-1 bg-gray-800 text-white text-sm rounded-md border border-gray-600 focus:border-teal-500">
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
 * Salva ou atualiza uma magia/habilidade no IndexedDB.
 * @param {HTMLFormElement} spellForm - O formulário com os dados da magia.
 * @returns {Promise<void>}
 */
export async function saveSpellCard(spellForm) {
    const spellNameInput = document.getElementById('spellName');
    const spellExecutionInput = document.getElementById('spellExecution');
    const spellRangeInput = document.getElementById('spellRange');
    const spellTargetInput = document.getElementById('spellTarget');
    const spellDurationInput = document.getElementById('spellDuration');
    const spellResistenciaInput = document.getElementById('spellResistencia');
    const spellDescriptionInput = document.getElementById('spellDescription');
    const spellEnhanceInput = document.getElementById('spellEnhance');
    const spellTrueInput = document.getElementById('spellTrue');
    const vidaAumentoInput = document.getElementById('vida-aumento');
    const manaAumentoInput = document.getElementById('mana-aumento');
    const agilidadeAumentoInput = document.getElementById('agilidade-aumento');
    const carismaAumentoInput = document.getElementById('carisma-aumento');
    const forcaAumentoInput = document.getElementById('forca-aumento');
    const inteligenciaAumentoInput = document.getElementById('inteligencia-aumento');
    const sabedoriaAumentoInput = document.getElementById('sabedoria-aumento');
    const vigorAumentoInput = document.getElementById('vigor-aumento');
    const armaduraInput = document.getElementById('spell-armadura');
    const esquivaInput = document.getElementById('spell-esquiva');
    const bloqueioInput = document.getElementById('spell-bloqueio');
    const deslocamentoInput = document.getElementById('spell-deslocamento');

    const selectedPericias = [];
    document.querySelectorAll('#spell-pericias-checkboxes-container input[type="checkbox"]:checked').forEach(cb => {
        const periciaName = cb.value;
        const periciaId = `spell-pericia-${periciaName.replace(/\s+/g, '-')}`;
        const valueInput = document.getElementById(`${periciaId}-value`);
        selectedPericias.push({
            name: periciaName,
            value: parseInt(valueInput.value) || 0
        });
    });

    const attributesAumento = {
        vida: parseInt(vidaAumentoInput.value) || 0,
        mana: parseInt(manaAumentoInput.value) || 0,
        agilidade: parseInt(agilidadeAumentoInput.value) || 0,
        carisma: parseInt(carismaAumentoInput.value) || 0,
        forca: parseInt(forcaAumentoInput.value) || 0,
        inteligencia: parseInt(inteligenciaAumentoInput.value) || 0,
        sabedoria: parseInt(sabedoriaAumentoInput.value) || 0,
        vigor: parseInt(vigorAumentoInput.value) || 0,
        armadura: parseInt(armaduraInput.value) || 0,
        esquiva: parseInt(esquivaInput.value) || 0,
        bloqueio: parseInt(bloqueioInput.value) || 0,
        deslocamento: parseInt(deslocamentoInput.value) || 0,
        pericias: selectedPericias
    };
    
    const imageBuffer = spellImageFile ? await readFileAsArrayBuffer(spellImageFile) : null;
    
    let spellData;
    if (currentEditingSpellId) {
        spellData = await getData('rpgSpells', currentEditingSpellId);
        if (!spellData) return;
        Object.assign(spellData, {
            name: spellNameInput.value,
            execution: spellExecutionInput.value,
            range: spellRangeInput.value,
            target: spellTargetInput.value,
            duration: spellDurationInput.value,
            resistencia: spellResistenciaInput.value,
            description: spellDescriptionInput.value,
            enhance: spellEnhanceInput.value,
            true: spellTrueInput.value,
            aumentos: attributesAumento,
            image: imageBuffer || spellData.image,
            imageMimeType: spellImageFile ? spellImageFile.type : spellData.imageMimeType,
        });
    } else {
        spellData = {
            id: Date.now().toString(),
            name: spellNameInput.value,
            execution: spellExecutionInput.value,
            range: spellRangeInput.value,
            target: spellTargetInput.value,
            duration: spellDurationInput.value,
            resistencia: spellResistenciaInput.value,
            description: spellDescriptionInput.value,
            enhance: spellEnhanceInput.value,
            true: spellTrueInput.value,
            aumentos: attributesAumento,
            image: imageBuffer,
            imageMimeType: spellImageFile ? spellImageFile.type : null,
        };
    }

    await saveData('rpgSpells', spellData);
    spellForm.reset();
    spellImageFile = null;
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

    const spellFormTitle = document.getElementById('spell-form-title');
    const spellSubmitButton = document.getElementById('spellSubmitButton');
    const spellNameInput = document.getElementById('spellName');
    const spellExecutionInput = document.getElementById('spellExecution');
    const spellRangeInput = document.getElementById('spellRange');
    const spellTargetInput = document.getElementById('spellTarget');
    const spellDurationInput = document.getElementById('spellDuration');
    const spellResistenciaInput = document.getElementById('spellResistencia');
    const spellDescriptionInput = document.getElementById('spellDescription');
    const spellEnhanceInput = document.getElementById('spellEnhance');
    const spellTrueInput = document.getElementById('spellTrue');
    
    // Alinha os IDs com os nomes das variáveis
    const vidaAumentoInput = document.getElementById('vida-aumento');
    const manaAumentoInput = document.getElementById('mana-aumento');
    const agilidadeAumentoInput = document.getElementById('agilidade-aumento');
    const carismaAumentoInput = document.getElementById('carisma-aumento');
    const forcaAumentoInput = document.getElementById('forca-aumento');
    const inteligenciaAumentoInput = document.getElementById('inteligencia-aumento');
    const sabedoriaAumentoInput = document.getElementById('sabedoria-aumento');
    const vigorAumentoInput = document.getElementById('vigor-aumento');
    const armaduraInput = document.getElementById('spell-armadura');
    const esquivaInput = document.getElementById('spell-esquiva');
    const bloqueioInput = document.getElementById('spell-bloqueio');
    const deslocamentoInput = document.getElementById('spell-deslocamento');

    const spellImagePreview = document.getElementById('spellImagePreview');

    spellFormTitle.textContent = 'Editando: ' + spellData.name;
    spellSubmitButton.textContent = 'Salvar Edição';
    currentEditingSpellId = spellId;
    
    spellNameInput.value = spellData.name;
    spellExecutionInput.value = spellData.execution;
    spellRangeInput.value = spellData.range;
    spellTargetInput.value = spellData.target;
    spellDurationInput.value = spellData.duration;
    spellResistenciaInput.value = spellData.resistencia;
    spellDescriptionInput.value = spellData.description;
    spellEnhanceInput.value = spellData.enhance;
    spellTrueInput.value = spellData.true;
    
    // Agora os valores serão definidos corretamente
    if (vidaAumentoInput) vidaAumentoInput.value = spellData.aumentos?.vida || 0;
    if (manaAumentoInput) manaAumentoInput.value = spellData.aumentos?.mana || 0;
    if (agilidadeAumentoInput) agilidadeAumentoInput.value = spellData.aumentos?.agilidade || 0;
    if (carismaAumentoInput) carismaAumentoInput.value = spellData.aumentos?.carisma || 0;
    if (forcaAumentoInput) forcaAumentoInput.value = spellData.aumentos?.forca || 0;
    if (inteligenciaAumentoInput) inteligenciaAumentoInput.value = spellData.aumentos?.inteligencia || 0;
    if (sabedoriaAumentoInput) sabedoriaAumentoInput.value = spellData.aumentos?.sabedoria || 0;
    if (vigorAumentoInput) vigorAumentoInput.value = spellData.aumentos?.vigor || 0;
    if (armaduraInput) armaduraInput.value = spellData.aumentos?.armadura || 0;
    if (esquivaInput) esquivaInput.value = spellData.aumentos?.esquiva || 0;
    if (bloqueioInput) bloqueioInput.value = spellData.aumentos?.bloqueio || 0;
    if (deslocamentoInput) deslocamentoInput.value = spellData.aumentos?.deslocamento || 0;

    // AQUI: A chamada para popular as perícias com os dados da magia.
    populateSpellPericiasCheckboxes(spellData.aumentos?.pericias || []);

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
    if (window.confirm('Tem certeza que deseja excluir esta magia/habilidade?')) {
        await removeData('rpgSpells', spellId);
    }
}

/**
 * Renderiza a lista de miniaturas de magias na interface.
 */
/**
 * Renderiza a lista de miniaturas de magias na interface.
 */
export async function renderSpellList() {
    const contentDisplay = document.getElementById('content-display');
    contentDisplay.innerHTML = '';

    const allSpells = await getData('rpgSpells');

    // Gera as miniaturas de forma assíncrona
    const spellsHtmlArray = await Promise.all(allSpells.map(async (spell) => {
        const spellSheetHtml = await renderFullSpellSheet(spell, false);
        return `
            <div class="rpg-thumbnail bg-cover bg-center shadow-lg relative" data-action="viewSpell" data-type="spell" data-id="${spell.id}">
                <div class="miniCard absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2 rounded-lg">
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

    const spellsHtml = `
        <div class="grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0">
            <!-- Botão de Adicionar Magia -->
            <div class="relative w-full h-full aspect-square" style="aspect-ratio: 120 / 160;">
                <button class="add-card-button absolute inset-0" data-action="add-spell">
                    <i class="fas fa-plus text-2xl mb-2"></i>
                    <span class="text-sm font-semibold">Adicionar Magia</span>
                </button>
                <div class="absolute -bottom-3 w-full flex justify-center gap-2">
                    <button class="thumb-btn bg-indigo-500 hover:bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center" 
                            id="import-cards-spell-btn" title="Importar Magia (JSON)">
                        <i class="fas fa-upload text-xs"></i>
                    </button>
                    <input type="file" id="import-spell-json-input" accept=".json" class="hidden">
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
    document.getElementById('import-cards-spell-btn').addEventListener('click', () => {
        document.getElementById('import-spell-json-input').click();
    });

    // Listener para importar JSON
    document.getElementById('import-spell-json-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const importedSpell = await importSpell(file);
                if (importedSpell) {
                    showCustomAlert(`Magia '${importedSpell.name}' importada com sucesso!`);
                } else {
                    showCustomAlert('Nenhuma magia encontrada no arquivo.');
                }
                contentDisplay.innerHTML = '';
                renderSpellList();
            } catch (error) {
                showCustomAlert('Erro ao importar arquivo. Verifique se é um JSON de magia válido.');
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
        const safeName = (dataToExport.name || 'magia').replace(/\s+/g, '_');
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
 */
export async function importSpell(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedSpell = JSON.parse(e.target.result);
                if (!importedSpell || importedSpell.id === undefined) {
                    throw new Error("Formato de arquivo inválido. Esperado um único objeto de magia/habilidade com um ID.");
                }

                // Altera o ID da magia importada para garantir que ele seja único
                importedSpell.id = Date.now().toString();

                // Converte Base64 de volta para ArrayBuffer
                if (importedSpell.image) {
                    importedSpell.image = base64ToArrayBuffer(importedSpell.image);
                }
                
                await saveData('rpgSpells', importedSpell);
                resolve(importedSpell);
            } catch (error) {
                console.error("Erro ao importar magia/habilidade:", error);
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

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
