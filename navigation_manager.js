import { populatePericiasCheckboxes, saveCharacterCard, editCard, importCard } from './character_manager.js';
import { populateSpellPericiasCheckboxes, saveSpellCard, editSpell, importSpell } from './magic_manager.js';
import { populateItemPericiasCheckboxes, saveItemCard, editItem, importItem, removeItem, exportItem } from './item_manager.js';
import { openDatabase, removeData, getData, saveData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';
import { renderFullSpellSheet } from './magic_renderer.js';
import { renderFullItemSheet } from './item_renderer.js';


let renderContent; // Declarado no escopo do módulo para ser acessível globalmente

// Função auxiliar para converter buffer em Blob
function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

// --- Lógica de Centralização dos Mini Cards ---
function debounce(fn, wait = 100) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

function centerSheetInMiniCard(miniCard) {
    const sheet = miniCard.querySelector('#character-sheet, #spell-sheet, #item-sheet');
    if (!sheet) return;

    const thumbRect = miniCard.getBoundingClientRect();
    const sheetRect = sheet.getBoundingClientRect();

    if (!isFinite(thumbRect.width) || !isFinite(sheetRect.width) || thumbRect.width === 0) return;

    let left = (thumbRect.width - sheetRect.width) / 2;
    let top = (thumbRect.height - sheetRect.height) / 2;

    sheet.style.position = 'absolute';
    sheet.style.left = `${left}px`;
    sheet.style.top = `${top}px`;
}

function setupResizeCentering(gridContainer) {
    const centerAllSheets = () => {
        gridContainer.querySelectorAll('.miniCard').forEach(centerSheetInMiniCard);
    };
    const ro = new ResizeObserver(debounce(centerAllSheets, 150));
    ro.observe(gridContainer);
    window.addEventListener('resize', debounce(centerAllSheets, 150));
}

/**
 * Mostra um modal de confirmação customizado.
 * @param {string} message - A mensagem a ser exibida.
 * @returns {Promise<boolean>} Resolve para true se confirmado, false caso contrário.
 */
function showCustomConfirm(message) {
    return new Promise((resolve) => {
        const modalHtml = `
            <div id="custom-confirm-modal" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
                <div class="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-sm border border-gray-700">
                    <p class="text-center text-lg mb-6">${message}</p>
                    <div class="flex justify-end gap-4">
                        <button id="confirm-cancel-btn" class="py-2 px-4 rounded-lg bg-gray-600 hover:bg-gray-700 font-bold">Cancelar</button>
                        <button id="confirm-ok-btn" class="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-700 font-bold">Excluir</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('custom-confirm-modal');
        const confirmBtn = document.getElementById('confirm-ok-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        const cleanupAndResolve = (value) => {
            modal.remove();
            resolve(value);
        };

        confirmBtn.onclick = () => cleanupAndResolve(true);
        cancelBtn.onclick = () => cleanupAndResolve(false);
    });
}


/**
 * Renderiza a lista de miniaturas de personagens com animação otimizada.
 */
async function renderCharacterList() {
    const contentDisplay = document.getElementById('content-display');
    const allCharacters = await getData('rpgCards');

    const container = document.createElement('div');
    container.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0';
    
    const addButtonWrapper = document.createElement('div');
    addButtonWrapper.className = 'relative w-full h-full aspect-square';
    addButtonWrapper.style.aspectRatio = '120 / 160';
    addButtonWrapper.innerHTML = `
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
    `;
    container.appendChild(addButtonWrapper);
    
    const cardElements = await Promise.all(allCharacters.map(async (char) => {
        const characterSheetHtml = await renderFullCharacterSheet(char, false, 16/11, false);
        const backgroundImage = char.backgroundImage ? `url('${URL.createObjectURL(bufferToBlob(char.backgroundImage, char.backgroundMimeType))}')` : '#2d3748';

        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center shadow-lg relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "character";
        cardWrapper.dataset.id = char.id;
        cardWrapper.style.backgroundImage = backgroundImage;
        
        cardWrapper.innerHTML = `
            <div class="miniCard absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2 rounded-lg overflow-hidden">
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
        `;
        return cardWrapper;
    }));

    cardElements.forEach(el => container.appendChild(el));
    contentDisplay.appendChild(container);
    
    requestAnimationFrame(() => {
        container.querySelectorAll('.miniCard').forEach(centerSheetInMiniCard);
        cardElements.forEach((cardWrapper, index) => {
            setTimeout(() => {
                cardWrapper.classList.add('visible');
            }, index * 80);
        });
    });

    setupResizeCentering(container);

    document.getElementById('import-cards-btn').addEventListener('click', () => {
        document.getElementById('import-json-input').click();
    });

    document.getElementById('import-json-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importCard(file);
            renderContent('personagem');
        }
    });
}

/**
 * Renderiza a lista de magias/habilidades com animação otimizada.
 * @param {string} type - 'magias' ou 'habilidades'.
 */
async function renderSpellList(type = 'magias') {
    const contentDisplay = document.getElementById('content-display');
    let allSpells = await getData('rpgSpells');

    if (type === 'magias') {
        allSpells = allSpells.filter(spell => spell.type === 'magia' || !spell.type);
    } else if (type === 'habilidades') {
        allSpells = allSpells.filter(spell => spell.type === 'habilidade');
    }

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0';
    
    const buttonText = type === 'magias' ? 'Adicionar Magia' : 'Adicionar Habilidade';
    const buttonAction = type === 'magias' ? 'add-spell' : 'add-habilidade';
    const importBtnId = type === 'magias' ? 'import-cards-spell-btn' : 'import-cards-habilidade-btn';
    const importInputId = type === 'magias' ? 'import-spell-json-input' : 'import-habilidade-json-input';
    const importTitle = type === 'magias' ? 'Importar Magia (JSON)' : 'Importar Habilidade (JSON)';

    const addButtonWrapper = document.createElement('div');
    addButtonWrapper.className = 'relative w-full h-full aspect-square';
    addButtonWrapper.style.aspectRatio = '120 / 160';
    addButtonWrapper.innerHTML = `
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
    `;
    gridContainer.appendChild(addButtonWrapper);
    
    const cardElements = await Promise.all(allSpells.map(async (spell) => {
        const spellSheetHtml = await renderFullSpellSheet(spell, false, 16/11);
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center shadow-lg relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "spell";
        cardWrapper.dataset.id = spell.id;
        cardWrapper.innerHTML = `
            <div class="miniCard absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2 rounded-lg">
                ${spellSheetHtml}
            </div>
            <div class="thumbnail-actions absolute z-10">
                <button class="thumb-btn thumb-btn-menu">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
                <div class="thumbnail-menu" data-type="spell">
                    <button class="menu-item" data-action="edit" data-id="${spell.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="menu-item" data-action="remove" data-id="${spell.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                    <button class="menu-item" data-action="export-json" data-id="${spell.id}"><i class="fas fa-file-download"></i> Baixar</button>
                </div>
            </div>
        `;
        return cardWrapper;
    }));

    cardElements.forEach(el => gridContainer.appendChild(el));
    contentDisplay.appendChild(gridContainer);
    
    requestAnimationFrame(() => {
        gridContainer.querySelectorAll('.miniCard').forEach(centerSheetInMiniCard);
        
        cardElements.forEach((cardWrapper, index) => {
            setTimeout(() => {
                cardWrapper.classList.add('visible');
            }, index * 80);
        });
    });
    
    setupResizeCentering(gridContainer);

    document.getElementById(importBtnId).addEventListener('click', () => {
        document.getElementById(importInputId).click();
    });

    document.getElementById(importInputId).addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importSpell(file, type);
            renderContent(type);
        }
    });
}

/**
 * Renderiza a lista de miniaturas de itens com animação otimizada.
 */
async function renderItemList() {
    const contentDisplay = document.getElementById('content-display');
    const allItems = await getData('rpgItems');

    const container = document.createElement('div');
    container.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 overflow-y-auto p-6 pt-0';

    const addButtonWrapper = document.createElement('div');
    addButtonWrapper.className = 'relative w-full h-full aspect-square';
    addButtonWrapper.style.aspectRatio = '120 / 160';
    addButtonWrapper.innerHTML = `
        <button class="add-card-button absolute inset-0" data-action="add-item">
            <i class="fas fa-plus text-2xl mb-2"></i>
            <span class="text-sm font-semibold">Adicionar Item</span>
        </button>
        <div class="absolute -bottom-3 w-full flex justify-center gap-2">
            <button class="thumb-btn bg-amber-500 hover:bg-amber-600 rounded-full w-8 h-8 flex items-center justify-center" id="import-item-btn" title="Importar Item (JSON)">
                <i class="fas fa-upload text-xs"></i>
            </button>
            <input type="file" id="import-item-json-input" accept=".json" class="hidden">
        </div>
    `;
    container.appendChild(addButtonWrapper);

    const cardElements = await Promise.all(allItems.map(async (item) => {
        const itemSheetHtml = await renderFullItemSheet(item, false, 16/11);
        const cardWrapper = document.createElement('div');
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center shadow-lg relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "item";
        cardWrapper.dataset.id = item.id;
        cardWrapper.innerHTML = `
            <div class="miniCard absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white p-2 rounded-lg">
                ${itemSheetHtml}
            </div>
            <div class="thumbnail-actions absolute z-10">
                <button class="thumb-btn thumb-btn-menu"><i class="fas fa-ellipsis-v"></i></button>
                <div class="thumbnail-menu" data-type="item">
                    <button class="menu-item" data-action="edit" data-id="${item.id}"><i class="fas fa-edit"></i> Editar</button>
                    <button class="menu-item" data-action="remove" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Excluir</button>
                    <button class="menu-item" data-action="export-json" data-id="${item.id}"><i class="fas fa-file-download"></i> Baixar</button>
                </div>
            </div>
        `;
        return cardWrapper;
    }));

    cardElements.forEach(el => container.appendChild(el));
    contentDisplay.appendChild(container);

    requestAnimationFrame(() => {
        container.querySelectorAll('.miniCard').forEach(centerSheetInMiniCard);
        cardElements.forEach((cardWrapper, index) => {
            setTimeout(() => {
                cardWrapper.classList.add('visible');
            }, index * 80);
        });
    });

    setupResizeCentering(container);

    document.getElementById('import-item-btn').addEventListener('click', () => {
        document.getElementById('import-item-json-input').click();
    });

    document.getElementById('import-item-json-input').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importItem(file);
            renderContent('itens');
        }
    });
}


document.addEventListener('DOMContentLoaded', async () => {
    // Adiciona o estilo para a animação de entrada dos cards
    const style = document.createElement('style');
    style.innerHTML = `
        .rpg-thumbnail {
            opacity: 0;
            transform: translateY(15px);
            transition: opacity 0.4s ease-out, transform 0.4s ease-out, box-shadow 0.2s ease-in-out;
        }
        .rpg-thumbnail.visible {
            opacity: 1;
            transform: translateY(0);
        }
    `;
    document.head.appendChild(style);

    // Seletores de elementos do DOM
    const contentLoader = document.getElementById('content-loader');
    const navButtons = document.querySelectorAll('.nav-button');
    const contentDisplay = document.getElementById('content-display');
    const creationSection = document.getElementById('creation-section');
    const spellCreationSection = document.getElementById('spell-creation-section');
    const itemCreationSection = document.getElementById('item-creation-section');
    const selectCharacterModal = document.getElementById('select-character-modal');
    const selectCharacterList = document.getElementById('select-character-list');
    
    // Botões de fechar
    const selectCharacterCloseBtn = document.getElementById('select-character-close-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const closeSpellFormBtn = document.getElementById('close-spell-form-btn');
    const closeItemFormBtn = document.getElementById('close-item-form-btn');
    
    // Formulários e seus componentes
    const cardForm = document.getElementById('cardForm');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submitButton');
    const vidaInput = document.getElementById('vida');
    const manaInput = document.getElementById('mana');
    const vidaAtualInput = document.getElementById('vidaAtual');
    const manaAtualInput = document.getElementById('manaAtual');

    const spellForm = document.getElementById('spellForm');
    const spellFormTitle = document.getElementById('spell-form-title');
    const spellSubmitButton = document.getElementById('spellSubmitButton');
    const enhanceWrapper = document.getElementById('enhance-wrapper');
    const trueWrapper = document.getElementById('true-wrapper');
    const manaCostWrapper = document.getElementById('mana-cost-wrapper');

    const itemForm = document.getElementById('itemForm');
    const itemFormTitle = document.getElementById('item-form-title');
    const itemSubmitButton = document.getElementById('itemSubmitButton');
    
    // Função principal para renderizar o conteúdo da aba selecionada
    renderContent = async (target) => {
        contentDisplay.innerHTML = '';
        contentLoader.classList.remove('hidden');

        await new Promise(resolve => setTimeout(resolve, 50));

        creationSection.classList.add('hidden');
        spellCreationSection.classList.add('hidden');
        itemCreationSection.classList.add('hidden');

        const titleText = document.querySelector(`.nav-button[data-target="${target}"] .hidden`)?.textContent || target.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        contentDisplay.innerHTML = `<div class="w-full text-center mb-2 mt-2"><h2 class="text-3xl font-bold text-gray-200">${titleText}</h2></div>`;

        if (target === 'personagem') await renderCharacterList();
        else if (target === 'magias') await renderSpellList('magias');
        else if (target === 'habilidades') await renderSpellList('habilidades');
        else if (target === 'itens') await renderItemList();
        else if (target === 'personagem-em-jogo') await renderCharacterInGame();

        contentLoader.classList.add('hidden');
    };
    
    // Funções para mostrar formulários
    function showView(section, isEditing, setupFunction) {
        section.classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelector('nav').classList.add('hidden');
        if (!isEditing && setupFunction) setupFunction();
    }

    // Renderiza o personagem que está "em jogo"
    const renderCharacterInGame = async () => {
        const allCharacters = await getData('rpgCards');
        const characterInPlay = allCharacters.find(char => char.inPlay);
        const titleElement = contentDisplay.querySelector('h2');
        if(titleElement) titleElement.remove();

        if (characterInPlay) {
            contentDisplay.innerHTML = await renderFullCharacterSheet(characterInPlay, false, 16/9, true);
        } else {
            contentDisplay.innerHTML = `
                <div class="w-full h-full flex flex-col items-center justify-center">
                    <button id="select-character-btn" class="add-card-button p-10">
                        <i class="fas fa-dice-d20 text-4xl mb-2"></i>
                        <span class="text-lg font-semibold">Selecionar Personagem em Jogo</span>
                    </button>
                </div>
            `;
        }
    };
    
    // Mostra o modal para selecionar um personagem para colocar "em jogo"
    const showCharacterSelectionModal = async () => {
        selectCharacterList.innerHTML = '';
        const allCharacters = await getData('rpgCards');
        
        if (allCharacters.length === 0) {
            selectCharacterList.innerHTML = '<p class="text-gray-400">Nenhum personagem disponível.</p>';
        } else {
            allCharacters.forEach(char => {
                const charItem = document.createElement('button');
                charItem.className = 'w-full text-left p-2 rounded-lg hover:bg-gray-700 transition-colors';
                charItem.textContent = char.title;
                charItem.dataset.characterId = char.id;
                charItem.addEventListener('click', async () => {
                    const selectedChar = await getData('rpgCards', char.id);
                    if (selectedChar) {
                        await Promise.all(allCharacters.map(c => {
                            if (c.id !== selectedChar.id && c.inPlay) {
                                c.inPlay = false;
                                return saveData('rpgCards', c);
                            }
                            return Promise.resolve();
                        }));
                        selectedChar.inPlay = true;
                        await saveData('rpgCards', selectedChar);
                        renderContent('personagem-em-jogo');
                        selectCharacterModal.classList.add('hidden');
                    }
                });
                selectCharacterList.appendChild(charItem);
            });
        }
        selectCharacterModal.classList.remove('hidden');
    };
    
    // Gerencia a navegação entre as abas
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const target = event.currentTarget.dataset.target;
            navButtons.forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            renderContent(target);
        });
    });
    
    // Listener de cliques global para ações
    document.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        if (action === "add-character") showView(creationSection, false, () => {
            cardForm.reset();
            formTitle.textContent = 'Novo Personagem';
            submitButton.textContent = 'Criar Cartão';
            populatePericiasCheckboxes();
        });
        if (action === "add-spell" || action === "add-habilidade") showView(spellCreationSection, false, () => {
            const isHabilidade = action === "add-habilidade";
            spellForm.reset();
            spellForm.dataset.type = isHabilidade ? 'habilidade' : 'magia';
            spellFormTitle.textContent = isHabilidade ? 'Nova Habilidade' : 'Nova Magia';
            spellSubmitButton.textContent = isHabilidade ? 'Criar Habilidade' : 'Criar Magia';
            enhanceWrapper.classList.toggle('hidden', isHabilidade);
            trueWrapper.classList.toggle('hidden', isHabilidade);
            // manaCostWrapper.classList.toggle('hidden', isHabilidade); // Removido para mostrar sempre
            populateSpellPericiasCheckboxes();
        });
        if (action === "add-item") showView(itemCreationSection, false, () => {
            itemForm.reset();
            itemFormTitle.textContent = 'Novo Item';
            itemSubmitButton.textContent = 'Criar Item';
            populateItemPericiasCheckboxes();
        });
        if (e.target.closest('#select-character-btn')) showCharacterSelectionModal();
    });
    
    // Funções para fechar formulários
    const closeForm = (section, targetTab) => {
        section.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(targetTab);
    };

    closeFormBtn.addEventListener('click', () => closeForm(creationSection, 'personagem'));
    closeSpellFormBtn.addEventListener('click', () => closeForm(spellCreationSection, spellForm.dataset.type === 'habilidade' ? 'habilidades' : 'magias'));
    closeItemFormBtn.addEventListener('click', () => closeForm(itemCreationSection, 'itens'));
    selectCharacterCloseBtn.addEventListener('click', () => selectCharacterModal.classList.add('hidden'));

    // Submissão dos formulários
    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCharacterCard(cardForm);
        closeForm(creationSection, 'personagem');
    });

    spellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = e.currentTarget.dataset.type || 'magia';
        await saveSpellCard(spellForm, type);
        closeForm(spellCreationSection, type === 'magia' ? 'magias' : 'habilidades');
    });

    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveItemCard(itemForm);
        closeForm(itemCreationSection, 'itens');
    });


    // Abre o banco de dados e renderiza o conteúdo inicial
    await openDatabase();
    renderContent('personagem-em-jogo');
    
    // Listener de cliques global para ações nos cards
    document.addEventListener('click', async (e) => {
        const thumbCard = e.target.closest('.rpg-thumbnail');
        const menuBtn = e.target.closest('.thumb-btn-menu');
        const menuItem = e.target.closest('.thumbnail-menu .menu-item');

        if (thumbCard && !menuBtn && !menuItem) {
            const cardId = thumbCard.dataset.id;
            const cardType = thumbCard.dataset.type;
            if (cardType === 'character') await renderFullCharacterSheet(await getData('rpgCards', cardId), true, 16/9, false);
            if (cardType === 'spell') await renderFullSpellSheet(await getData('rpgSpells', cardId), true, 16/9);
            if (cardType === 'item') await renderFullItemSheet(await getData('rpgItems', cardId), true, 16/9);
            return;
        }
        
        if (menuBtn) {
            e.preventDefault();
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            
            document.querySelectorAll('.thumbnail-menu.active').forEach(m => {
                if (m !== menu) m.classList.remove('active', 'menu-left');
            });
            
            menu.classList.toggle('active');

            if (menu.classList.contains('active')) {
                const menuRect = menu.getBoundingClientRect();
                const bodyRect = document.body.getBoundingClientRect();

                if (menuRect.right > bodyRect.right - 10) { // 10px de margem
                    menu.classList.add('menu-left');
                } else {
                    menu.classList.remove('menu-left');
                }
            } else {
                 menu.classList.remove('menu-left');
            }

            return;
        }
        
        if (menuItem) {
            e.preventDefault();
            e.stopPropagation();
            const action = menuItem.dataset.action;
            const cardId = menuItem.dataset.id;
            const cardType = menuItem.closest('[data-type]').dataset.type;
            const activeNav = document.querySelector('.nav-button.active').dataset.target;

            if (action === 'edit') {
                if (cardType === 'character') {
                    showView(creationSection, true);
                    await editCard(cardId);
                } else if (cardType === 'spell') {
                    const spellData = await getData('rpgSpells', cardId);
                    if (spellData) {
                        const isHabilidade = spellData.type === 'habilidade';
                        // Atualiza a UI do formulário ANTES de mostrar
                        spellForm.dataset.type = spellData.type || 'magia';
                        spellFormTitle.textContent = isHabilidade ? 'Editando Habilidade' : 'Editando Magia';
                        spellSubmitButton.textContent = isHabilidade ? 'Salvar Habilidade' : 'Salvar Magia';
                        enhanceWrapper.classList.toggle('hidden', isHabilidade);
                        trueWrapper.classList.toggle('hidden', isHabilidade);
                        // manaCostWrapper.classList.toggle('hidden', isHabilidade); // Removido para mostrar sempre
                        
                        showView(spellCreationSection, true);
                        await editSpell(cardId);
                    }
                } else if (cardType === 'item') {
                    itemFormTitle.textContent = 'Editando Item';
                    itemSubmitButton.textContent = 'Salvar Item';
                    showView(itemCreationSection, true);
                    await editItem(cardId);
                }
            } else if (action === 'remove' || action === 'delete') {
                if (await showCustomConfirm('Tem certeza que deseja excluir?')) {
                    const storeName = cardType === 'character' ? 'rpgCards' : (cardType === 'spell' ? 'rpgSpells' : 'rpgItems');
                    await removeData(storeName, cardId);
                    renderContent(activeNav);
                }
            } else if (action === 'export-json') {
                 if (cardType === 'character') await (await import('./character_manager.js')).exportCard(cardId);
                 if (cardType === 'spell') await (await import('./magic_manager.js')).exportSpell(cardId);
                 if (cardType === 'item') await exportItem(cardId);
            } else if (action === 'set-in-play' || action === 'remove-from-play') {
                const isSettingInPlay = action === 'set-in-play';
                const allCharacters = await getData('rpgCards');
                if (isSettingInPlay) {
                    await Promise.all(allCharacters.map(c => {
                        if (c.inPlay) { c.inPlay = false; return saveData('rpgCards', c); }
                        return null;
                    }));
                }
                const charToUpdate = allCharacters.find(c => c.id === cardId);
                if (charToUpdate) {
                    charToUpdate.inPlay = isSettingInPlay;
                    await saveData('rpgCards', charToUpdate);
                }
                renderContent(activeNav);
            }
            menuItem.closest('.thumbnail-menu').classList.remove('active');
            return;
        }

        if (!e.target.closest('.thumbnail-menu')) {
            document.querySelectorAll('.thumbnail-menu.active').forEach(m => m.classList.remove('active', 'menu-left'));
        }
    });
});

