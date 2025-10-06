import { openDatabase, saveData, getData, removeData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';

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
    
    // Evita adicionar duplicatas
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
    
    // Referências para o display de descrição
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

    const inventoryIds = Array.from(document.querySelectorAll('#selected-items-container [data-id]')).map(el => el.dataset.id);
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
            inventory: inventoryIds,
            magics: magicIds,
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
            inventory: inventoryIds,
            magics: magicIds,
            image: imageBuffer,
            backgroundImage: backgroundBuffer,
            imageMimeType: characterImageFile ? characterImageFile.type : null,
            backgroundMimeType: backgroundImageFile ? backgroundImageFile.type : null,
            inPlay: false, // Adiciona o novo status para controlar se está em jogo
        };
    }

    await saveData('rpgCards', cardData);
    cardForm.reset();
    characterImageFile = null;
    backgroundImageFile = null;
    showImagePreview(document.getElementById('characterImagePreview'), null, true);
    showImagePreview(document.getElementById('backgroundImagePreview'), null, false);
    document.getElementById('selected-items-container').innerHTML = '';
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
    dinheiroInput.value = cardData.dinheiro;
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

    // Limpa e preenche o inventário e magias
    document.getElementById('selected-items-container').innerHTML = '';
    document.getElementById('selected-magics-container').innerHTML = '';

    if (cardData.inventory && Array.isArray(cardData.inventory)) {
        for (const itemId of cardData.inventory) {
            const itemData = await getData('rpgItems', itemId);
            if (itemData) createSelectedItemElement(itemData, 'item');
        }
    }
    if (cardData.magics && Array.isArray(cardData.magics)) {
        for (const magicId of cardData.magics) {
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
}

/**
 * Remove um cartão de personagem do IndexedDB.
 * @param {string} cardId - O ID do personagem a ser removido.
 */
export async function removeCard(cardId) {
    if (window.confirm('Tem certeza que deseja excluir este personagem?')) {
        await removeData('rpgCards', cardId);
    }
}

/**
 * Renderiza a lista de miniaturas de personagens na interface.
 */
// Substitua a função renderCharacterList existente em character_manager.js por esta versão

export async function renderCharacterList() {
    const contentDisplay = document.getElementById('content-display');
    contentDisplay.innerHTML = ''; // Limpa o conteúdo anterior
    const allCharacters = await getData('rpgCards');

    // Gera as miniaturas de forma assíncrona, assim como em renderSpellList
    const charactersHtmlArray = await Promise.all(allCharacters.map(async (char) => {
        const characterSheetHtml = await renderFullCharacterSheet(char, false, 16/11, false);
        const backgroundImage = char.backgroundImage ? `url('${URL.createObjectURL(bufferToBlob(char.backgroundImage, char.backgroundMimeType))}')` : '#2d3748';

        return `
            <div class="rpg-thumbnail bg-cover bg-center relative" data-action="view" data-type="character" data-id="${char.id}" style="background-image: ${backgroundImage};">
                <div class="miniCard absolute inset-0  flex flex-col items-center justify-center text-white p-2 rounded-lg overflow-hidden">
                    ${characterSheetHtml}
                </div>
                <div class="thumbnail-actions absolute z-10">
                    <button class="thumb-btn thumb-btn-menu">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                    <div class="thumbnail-menu" data-type="character">
                        <button class="menu-item" data-action="edit" data-id="${char.id}"><i class="fas fa-edit"></i> Editar</button>
                        <button class="menu-item" data-action="remove" data-id="${char.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                        <button class="menu-item" data-action="export-json" data-id="${char.id}"><i class="fas fa-file-download"></i> Baixar</button>
                        ${char.inPlay 
                            ? `<button class="menu-item" data-action="remove-from-play" data-id="${char.id}"><i class="fas fa-sign-out-alt"></i> Remover de Jogo</button>` 
                            : `<button class="menu-item" data-action="set-in-play" data-id="${char.id}"><i class="fas fa-play-circle"></i> Usar em Jogo</button>`}
                    </div>
                </div>
            </div>
        `;
    }));

    const charactersHtml = `
        <div class="grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0">
            <div class="relative w-full h-full aspect-square" style="aspect-ratio: 120 / 160;">
                <button class="add-card-button absolute inset-0" data-action="add-character">
                    <i class="fas fa-plus text-2xl mb-2"></i>
                    <span class="text-sm font-semibold">Adicionar Personagem</span>
                </button>
                <div class="absolute -bottom-3 w-full flex justify-center gap-2">
                     <button class="thumb-btn bg-indigo-500 hover:bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center" id="import-cards-btn" title="Importar Personagem (JSON)">
                        <i class="fas fa-upload text-xs"></i>
                    </button>
                    <input type="file" id="import-json-input" accept=".json" class="hidden">
                </div>
            </div>
            ${charactersHtmlArray.join('')}
        </div>
    `;
    contentDisplay.innerHTML = charactersHtml;

    // -------- LÓGICA DE CENTRALIZAÇÃO DINÂMICA (COPIADA E ADAPTADA DE MAGIC_MANAGER.JS) --------
    function debounce(fn, wait = 100) {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), wait);
        };
    }

    function centerCharacterSheetInMiniCard(miniCard) {
        const sheet = miniCard.querySelector('#character-sheet'); // Alvo alterado para #character-sheet
        if (!sheet) return;

        const thumbRect = miniCard.getBoundingClientRect();
        const sheetRect = sheet.getBoundingClientRect();

        if (!isFinite(thumbRect.width) || !isFinite(sheetRect.width)) return;

        let left = (thumbRect.width - sheetRect.width) / 2;
        let top = (thumbRect.height - sheetRect.height) / 2;

        if (!isFinite(left)) left = 0;
        if (!isFinite(top)) top = 0;
        
        // Impede que a ficha saia dos limites da miniatura
        left = Math.max(left, 0);
        top = Math.max(top, 0);

        sheet.style.position = 'absolute';
        sheet.style.left = `${left}px`;
        sheet.style.top = `${top}px`;
    }

    function centerAllCharacterSheets() {
        document.querySelectorAll('.miniCard').forEach(centerCharacterSheetInMiniCard);
    }

    // Limpa observadores antigos se já existirem
    if (window.__characterCenterRO) {
        try { window.__characterCenterRO.disconnect(); } catch(e) {}
        try { window.__characterCenterMO.disconnect(); } catch(e) {}
        window.__characterCenterRO = null;
        window.__characterCenterMO = null;
    }

    const ro = new ResizeObserver(entries => {
        for (const entry of entries) {
            centerCharacterSheetInMiniCard(entry.target);
        }
    });
    window.__characterCenterRO = ro;

    const gridContainer = contentDisplay.querySelector('.grid') || contentDisplay;
    const mo = new MutationObserver(debounce(() => {
        ro.disconnect();
        document.querySelectorAll('.miniCard').forEach(el => ro.observe(el));
        centerAllCharacterSheets();
    }, 80));
    window.__characterCenterMO = mo;
    mo.observe(gridContainer, { childList: true, subtree: true });

    document.querySelectorAll('.miniCard').forEach(el => ro.observe(el));
    centerAllCharacterSheets();

    window.addEventListener('resize', debounce(centerAllCharacterSheets, 120));
    // -----------------------------------------------------------------------------------

    document.getElementById('import-cards-btn').addEventListener('click', () => {
        document.getElementById('import-json-input').click();
    });

    document.getElementById('import-json-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const importedCard = await importCard(file);
                if (importedCard) {
                     showCustomAlert(`Personagem '${importedCard.title}' importado com sucesso!`);
                } else {
                     showCustomAlert('Nenhum personagem encontrado no arquivo.');
                }
                contentDisplay.innerHTML = '';
                renderCharacterList();
            } catch (error) {
                showCustomAlert('Erro ao importar arquivo. Verifique se é um JSON de personagem válido.');
            } finally {
                e.target.value = '';
            }
        }
    });
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

                // Altera o ID do cartão importado para garantir que ele seja único
                importedCard.id = Date.now().toString();
                importedCard.inPlay = false; // Garante que o personagem importado não esteja em jogo

                // Converte Base64 de volta para ArrayBuffer
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

// Event listener para adicionar item/magia ao formulário do personagem
document.addEventListener('addItemToCharacter', (e) => {
    const { data, type } = e.detail;
    createSelectedItemElement(data, type);
});


// Funções para upload de imagem
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

 // Funções auxiliares para modais customizados
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
