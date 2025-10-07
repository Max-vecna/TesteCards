import { openDatabase, saveData, getData, removeData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';

// Lista de perícias
const PERICIAS_DATA = {
    "AGILIDADE": {
        "Acrobacia": "Capacidade de realizar movimentos ágeis e controlados...",
        "Iniciativa": "Velocidade de reação quando o combate começa...",
        "Montaria": "Controle de veículos e montarias complexas...",
        "Furtividade": "A arte de mover-se sem ser notado...",
        "Pontaria": "Precisão com armas de longo alcance...",
        "Ladinagem": "Manipulação veloz e precisa com as mãos...",
        "Reflexos": "Rapidez em reagir a estímulos..."
    },
    "CARISMA": {
        "Adestramento": "Treinamento e comando de animais...",
        "Enganação": "A arte de manipular a verdade...",
        "Intimidação": "Uso da força de personalidade para impor medo...",
        "Persuasão": "A habilidade de influenciar e inspirar..."
    },
    "INTELIGÊNCIA": {
        "Arcanismo": "Conhecimento das artes místicas...",
        "História": "Memória de tempos antigos...",
        "Investigação": "Capacidade de analisar cenários e reunir pistas...",
        "Ofício": "Criação, manutenção e reparo de objetos...",
        "Religião": "Conhecimento sobre divindades e rituais...",
        "Tecnologia": "Compreensão de mecanismos e engenhocas..."
    },
    "FORÇA": {
        "Atletismo": "Medida da força bruta aplicada com técnica...",
        "Luta": "Combate corpo a corpo com armas simples ou improvisadas..."
    },
    "SABEDORIA": {
        "Intuição": "Habilidade de ler emoções e detectar mentiras...",
        "Percepção": "Capacidade de notar detalhes ao redor...",
        "Medicina": "Conhecimento de curas e tratamento de feridas...",
        "Natureza": "Sabedoria sobre o mundo natural...",
        "Sobrevivência": "A perícia de se adaptar ao mundo selvagem...",
        "Vontade": "Força interior e estabilidade emocional..."
    },
    "VIGOR": {
        "Fortitude": "Resistência física e imunológica do personagem..."
    }
};

// Variáveis de estado
let currentEditingCardId = null;
let characterImageFile = null;
let backgroundImageFile = null;

// Funções auxiliares para imagens
function showImagePreview(element, url, isImageElement) {
    if (url) {
        if (isImageElement) element.src = url;
        else element.style.backgroundImage = 'url(' + url + ')';
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
 * Cria o elemento visual para um item/magia selecionado no formulário.
 * @param {object} data - Os dados do item ou magia.
 * @param {string} type - 'item' ou 'magic'.
 */
function createSelectedItemElement(data, type) {
    const containerId = type === 'item' ? 'selected-items-container' : 'selected-magics-container';
    const container = document.getElementById(containerId);
    
    if (!container) return;
    
    if (container.querySelector(`[data-id="${data.id}"]`)) return;

    const itemElement = document.createElement('div');
    itemElement.className = 'flex items-center justify-between bg-gray-800 p-2 rounded';
    itemElement.dataset.id = data.id;
    
    let iconHtml = '';
    if (data.image) {
        const imageUrl = URL.createObjectURL(bufferToBlob(data.image, data.imageMimeType));
        iconHtml = `<img src="${imageUrl}" class="w-6 h-6 rounded-full mr-2 object-cover" style="image-rendering: pixelated;">`;
    } else {
        const iconClass = type === 'item' ? 'fa-box' : 'fa-magic';
        iconHtml = `<i class="fas ${iconClass} w-6 text-center mr-2"></i>`;
    }

    itemElement.innerHTML = `
        <div class="flex items-center">
            ${iconHtml}
            <span class="text-sm">${data.name}</span>
        </div>
        <button type="button" class="text-red-500 hover:text-red-400 remove-selection-btn text-xl leading-none">&times;</button>
    `;

    itemElement.querySelector('.remove-selection-btn').addEventListener('click', () => {
        itemElement.remove();
    });

    container.appendChild(itemElement);
}


/**
 * Função para renderizar as perícias no formulário.
 * @param {Array} [selectedPericias] - Um array de objetos de perícias para pré-selecionar.
 */
export function populatePericiasCheckboxes(selectedPericias = []) {
    const container = document.getElementById('pericias-checkboxes-container');
    if (!container) return;
    container.innerHTML = '';
    
    const periciaDescriptionDisplay = document.getElementById('pericia-description-display');
    const periciaDescriptionTitle = document.getElementById('periciaDescriptionTitle');
    const periciaDescriptionText = document.getElementById('periciaDescriptionText');

    for (const attribute in PERICIAS_DATA) {
        const details = document.createElement('details');
        details.className = 'bg-gray-700 rounded-lg p-2 transition-all duration-300';
        details.innerHTML = `
            <summary class="flex items-center justify-between cursor-pointer font-semibold text-indigo-200">
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
            const periciaId = `pericia-${periciaName.replace(/\s+/g, '-')}`;
            
            const selectedPericia = selectedPericias.find(p => p.name === periciaName);
            const isChecked = selectedPericia ? 'checked' : '';
            const value = selectedPericia ? selectedPericia.value : '';

            periciaItem.innerHTML = `
                <div class="flex items-center">
                    <input type="checkbox" id="${periciaId}" name="pericia" value="${periciaName}" class="form-checkbox h-4 w-4 text-indigo-500 rounded border-gray-600 focus:ring-indigo-500" ${isChecked}>
                    <label for="${periciaId}" class="ml-2 text-sm text-gray-200 cursor-pointer">${periciaName}</label>
                </div>
                <input type="number" id="${periciaId}-value" placeholder="0" value="${value}" class="w-16 px-2 py-1 bg-gray-800 text-white text-sm rounded-md border border-gray-600 focus:border-indigo-500">
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
 * Salva ou atualiza um cartão de personagem no IndexedDB.
 * @param {HTMLFormElement} cardForm - O formulário com os dados do personagem.
 * @returns {Promise<void>}
 */
export async function saveCharacterCard(cardForm) {
    const cardTitleInput = document.getElementById('cardTitle');
    const cardSubTitleInput = document.getElementById('cardSubTitle');
    const cardLevelInput = document.getElementById('cardLevel');
    const dinheiroInput = document.getElementById('dinheiro');
    const vidaInput = document.getElementById('vida');
    const manaInput = document.getElementById('mana');
    const vidaAtualInput = document.getElementById('vidaAtual');
    const manaAtualInput = document.getElementById('manaAtual');
    const armaduraInput = document.getElementById('armadura');
    const esquivaInput = document.getElementById('esquiva');
    const bloqueioInput = document.getElementById('bloqueio');
    const deslocamentoInput = document.getElementById('deslocamento');
    const agilidadeInput = document.getElementById('agilidade');
    const carismaInput = document.getElementById('carisma');
    const forcaInput = document.getElementById('forca');
    const inteligenciaInput = document.getElementById('inteligencia');
    const sabedoriaInput = document.getElementById('sabedoria');
    const vigorInput = document.getElementById('vigor');
    const historiaInput = document.getElementById('historia');
    const personalidadeInput = document.getElementById('personalidade');
    const motivacaoInput = document.getElementById('motivacao');

    const selectedPericias = [];
    document.querySelectorAll('#pericias-checkboxes-container input[type="checkbox"]:checked').forEach(cb => {
        const periciaName = cb.value;
        const periciaId = `pericia-${periciaName.replace(/\s+/g, '-')}`;
        const valueInput = document.getElementById(`${periciaId}-value`);
        selectedPericias.push({
            name: periciaName,
            value: parseInt(valueInput.value) || 0
        });
    });

    const attributes = {
        vida: parseInt(vidaInput.value) || 0,
        mana: parseInt(manaInput.value) || 0,
        vidaAtual: parseInt(vidaAtualInput.value) || 0,
        manaAtual: parseInt(manaAtualInput.value) || 0,
        armadura: parseInt(armaduraInput.value) || 0,
        esquiva: parseInt(esquivaInput.value) || 0,
        bloqueio: parseInt(bloqueioInput.value) || 0,
        deslocamento: parseInt(deslocamentoInput.value) || 0,
        agilidade: parseInt(agilidadeInput.value) || 0,
        carisma: parseInt(carismaInput.value) || 0,
        forca: parseInt(forcaInput.value) || 0,
        inteligencia: parseInt(inteligenciaInput.value) || 0,
        sabedoria: parseInt(sabedoriaInput.value) || 0,
        vigor: parseInt(vigorInput.value) || 0,
        pericias: selectedPericias
    };
    const lore = {
        historia: historiaInput.value,
        personalidade: personalidadeInput.value,
        motivacao: motivacaoInput.value,
    };

    const imageBuffer = characterImageFile ? await readFileAsArrayBuffer(characterImageFile) : null;
    const backgroundBuffer = backgroundImageFile ? await readFileAsArrayBuffer(backgroundImageFile) : null;

    const magicIds = Array.from(document.querySelectorAll('#selected-magics-container [data-id]')).map(el => el.dataset.id);
    
    let cardData;
    if (currentEditingCardId) {
        cardData = await getData('rpgCards', currentEditingCardId);
        if (!cardData) return;
        Object.assign(cardData, {
            title: cardTitleInput.value,
            subTitle: cardSubTitleInput.value,
            level: parseInt(cardLevelInput.value) || 1,
            dinheiro: parseInt(dinheiroInput.value) || 0,
            attributes,
            lore,
            spells: magicIds,
            image: imageBuffer || cardData.image,
            backgroundImage: backgroundBuffer || cardData.backgroundImage,
            imageMimeType: characterImageFile ? characterImageFile.type : cardData.imageMimeType,
            backgroundMimeType: backgroundImageFile ? backgroundImageFile.type : cardData.backgroundMimeType,
        });
    } else {
        cardData = {
            id: Date.now().toString(),
            title: cardTitleInput.value,
            subTitle: cardSubTitleInput.value,
            level: parseInt(cardLevelInput.value) || 1,
            dinheiro: parseInt(dinheiroInput.value) || 0,
            attributes,
            lore,
            items: [],
            spells: magicIds,
            image: imageBuffer,
            backgroundImage: backgroundBuffer,
            imageMimeType: characterImageFile ? characterImageFile.type : null,
            backgroundMimeType: backgroundImageFile ? backgroundImageFile.type : null,
            inPlay: false,
        };
    }

    await saveData('rpgCards', cardData);
    cardForm.reset();
    characterImageFile = null;
    backgroundImageFile = null;
    showImagePreview(document.getElementById('characterImagePreview'), null, true);
    showImagePreview(document.getElementById('backgroundImagePreview'), null, false);
    document.getElementById('selected-magics-container').innerHTML = '';
    currentEditingCardId = null;
}

/**
 * Carrega os dados de um personagem existente no formulário para edição.
 * @param {string} cardId - O ID do personagem a ser editado.
 */
export async function editCard(cardId) {
    const cardData = await getData('rpgCards', cardId);
    if (!cardData) return;

    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submitButton');
    const cardTitleInput = document.getElementById('cardTitle');
    const cardSubTitleInput = document.getElementById('cardSubTitle');
    const cardLevelInput = document.getElementById('cardLevel');
    const dinheiroInput = document.getElementById('dinheiro');
    const vidaInput = document.getElementById('vida');
    const manaInput = document.getElementById('mana');
    const vidaAtualInput = document.getElementById('vidaAtual');
    const manaAtualInput = document.getElementById('manaAtual');
    const armaduraInput = document.getElementById('armadura');
    const esquivaInput = document.getElementById('esquiva');
    const bloqueioInput = document.getElementById('bloqueio');
    const deslocamentoInput = document.getElementById('deslocamento');
    const agilidadeInput = document.getElementById('agilidade');
    const carismaInput = document.getElementById('carisma');
    const forcaInput = document.getElementById('forca');
    const inteligenciaInput = document.getElementById('inteligencia');
    const sabedoriaInput = document.getElementById('sabedoria');
    const vigorInput = document.getElementById('vigor');
    const historiaInput = document.getElementById('historia');
    const personalidadeInput = document.getElementById('personalidade');
    const motivacaoInput = document.getElementById('motivacao');
    const characterImagePreview = document.getElementById('characterImagePreview');
    const backgroundImagePreview = document.getElementById('backgroundImagePreview');
    
    formTitle.textContent = 'Editando: ' + cardData.title;
    submitButton.textContent = 'Salvar Edição';
    currentEditingCardId = cardId;
    
    cardTitleInput.value = cardData.title;
    cardSubTitleInput.value = cardData.subTitle;
    cardLevelInput.value = cardData.level;
    dinheiroInput.value = cardData.dinheiro || 0;
    vidaInput.value = cardData.attributes.vida;
    manaInput.value = cardData.attributes.mana;
    vidaAtualInput.value = cardData.attributes.vidaAtual;
    manaAtualInput.value = cardData.attributes.manaAtual;
    armaduraInput.value = cardData.attributes.armadura;
    esquivaInput.value = cardData.attributes.esquiva;
    bloqueioInput.value = cardData.attributes.bloqueio;
    deslocamentoInput.value = cardData.attributes.deslocamento;
    agilidadeInput.value = cardData.attributes.agilidade;
    carismaInput.value = cardData.attributes.carisma;
    forcaInput.value = cardData.attributes.forca;
    inteligenciaInput.value = cardData.attributes.inteligencia;
    sabedoriaInput.value = cardData.attributes.sabedoria;
    vigorInput.value = cardData.attributes.vigor;
    historiaInput.value = cardData.lore?.historia || '';
    personalidadeInput.value = cardData.lore?.personalidade || '';
    motivacaoInput.value = cardData.lore?.motivacao || '';

    populatePericiasCheckboxes(cardData.attributes.pericias);

    document.getElementById('selected-magics-container').innerHTML = '';
    if (cardData.spells && Array.isArray(cardData.spells)) {
        for (const magicId of cardData.spells) {
            const magicData = await getData('rpgSpells', magicId);
            if (magicData) createSelectedItemElement(magicData, 'magic');
        }
    }

    if (cardData.image) {
        const imageBlob = bufferToBlob(cardData.image, cardData.imageMimeType);
        showImagePreview(characterImagePreview, URL.createObjectURL(imageBlob), true);
    } else {
        showImagePreview(characterImagePreview, null, true);
    }
    if (cardData.backgroundImage) {
        const backgroundBlob = bufferToBlob(cardData.backgroundImage, cardData.backgroundMimeType);
        showImagePreview(backgroundImagePreview, URL.createObjectURL(backgroundBlob), false);
    } else {
        showImagePreview(backgroundImagePreview, null, false);
    }
    
    document.getElementById('manage-inventory-from-edit-btn').classList.remove('hidden');
}

/**
 * Exporta um único cartão de personagem para um arquivo JSON.
 * @param {string} cardId - O ID do personagem a ser exportado.
 */
export async function exportCard(cardId) {
    const cardData = await getData('rpgCards', cardId);
    if (cardData) {
        const dataToExport = { ...cardData };
        if (dataToExport.image) dataToExport.image = arrayBufferToBase64(dataToExport.image);
        if (dataToExport.backgroundImage) dataToExport.backgroundImage = arrayBufferToBase64(dataToExport.backgroundImage);
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeTitle = (dataToExport.title || 'card').replace(/\s+/g, '_');
        a.download = `${safeTitle}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

/**
 * Importa um único cartão de personagem a partir de um arquivo JSON.
 * @param {File} file - O arquivo JSON a ser importado.
 */
export async function importCard(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedCard = JSON.parse(e.target.result);
                if (!importedCard || importedCard.id === undefined) {
                    throw new Error("Formato de arquivo inválido. Esperado um único objeto de personagem com um ID.");
                }

                importedCard.id = Date.now().toString();
                importedCard.inPlay = false; 

                if (importedCard.image) {
                    importedCard.image = base64ToArrayBuffer(importedCard.image);
                }
                if (importedCard.backgroundImage) {
                    importedCard.backgroundImage = base64ToArrayBuffer(importedCard.backgroundImage);
                }
                
                await saveData('rpgCards', importedCard);
                resolve(importedCard);
            } catch (error) {
                console.error("Erro ao importar cartão:", error);
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

document.addEventListener('addItemToCharacter', (e) => {
    const { data, type } = e.detail;
    if (type === 'magic') {
        createSelectedItemElement(data, type);
    }
});

document.getElementById('characterImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        characterImageFile = file;
        showImagePreview(document.getElementById('characterImagePreview'), URL.createObjectURL(file), true);
    }
});

document.getElementById('backgroundImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        backgroundImageFile = file;
        showImagePreview(document.getElementById('backgroundImagePreview'), URL.createObjectURL(file), false);
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

export function getCurrentEditingCardId() {
    return currentEditingCardId;
}
