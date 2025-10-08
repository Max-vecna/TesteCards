import { populatePericiasCheckboxes, saveCharacterCard, editCard, importCard, getCurrentEditingCardId, exportCard } from './character_manager.js';
import { populateSpellAumentosSelect, saveSpellCard, editSpell, importSpell, exportSpell } from './magic_manager.js';
import { populateItemAumentosSelect, saveItemCard, editItem, importItem, removeItem, exportItem, renderInventoryManagement, cleanupInventoryManagementListeners } from './item_manager.js';
import { openDatabase, removeData, getData, saveData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';
import { renderFullSpellSheet } from './magic_renderer.js';
import { renderFullItemSheet } from './item_renderer.js';


let renderContent; 

function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

export async function openCharacterSelectionForRelationship() {
    const selectCharacterModal = document.getElementById('select-character-modal');
    const selectCharacterList = document.getElementById('select-character-list');
    const modalTitleEl = selectCharacterModal.querySelector('h3');

    modalTitleEl.textContent = 'Adicionar Relacionamento';
    selectCharacterList.innerHTML = '';
    const allCharacters = await getData('rpgCards');
    const currentCharacterId = getCurrentEditingCardId();

    const charactersToShow = allCharacters.filter(c => c.id !== currentCharacterId);

    if (charactersToShow.length === 0) {
        selectCharacterList.innerHTML = '<p class="text-gray-400 text-center p-4">Não há outros personagens para relacionar.</p>';
    } else {
        charactersToShow.forEach(char => {
            const charItem = document.createElement('button');
            charItem.className = 'w-full text-left p-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-3';
            
            let iconHtml = '';
             if (char.image) {
                const imageUrl = URL.createObjectURL(bufferToBlob(char.image, char.imageMimeType));
                iconHtml = `<img src="${imageUrl}" class="w-8 h-8 rounded-full object-cover flex-shrink-0">`;
            } else {
                iconHtml = `<div class="w-8 h-8 rounded-full bg-gray-600 flex-shrink-0 flex items-center justify-center"><i class="fas fa-user"></i></div>`;
            }

            charItem.innerHTML = `${iconHtml}<span>${char.title}</span>`;
            charItem.dataset.characterId = char.id;

            charItem.addEventListener('click', async () => {
                const selectedChar = await getData('rpgCards', char.id);
                if (selectedChar) {
                    document.dispatchEvent(new CustomEvent('addRelationshipToCharacter', { detail: { data: selectedChar } }));
                    selectCharacterModal.classList.add('hidden');
                }
            });
            selectCharacterList.appendChild(charItem);
        });
    }
    selectCharacterModal.classList.remove('hidden');
}

export async function openSelectionModal(type) {
    const selectionModal = document.getElementById('selection-modal');
    const selectionModalTitle = document.getElementById('selection-modal-title');
    const selectionModalList = document.getElementById('selection-modal-list');

    selectionModalList.innerHTML = '<div class="text-center p-4"><i class="fas fa-spinner fa-spin text-2xl text-gray-400"></i></div>';
    selectionModal.classList.remove('hidden');

    const isItem = type === 'item';
    const storeName = isItem ? 'rpgItems' : 'rpgSpells';
    const title = isItem ? 'Selecionar Item' : 'Selecionar Magia/Habilidade';
    const color = isItem ? 'text-amber-300' : 'text-teal-300';
    
    selectionModalTitle.className = `text-xl font-bold ${color}`;
    selectionModalTitle.textContent = title;
    
    const data = await getData(storeName);
    selectionModalList.innerHTML = '';

    if (!data || data.length === 0) {
        selectionModalList.innerHTML = `<p class="text-gray-400 text-center p-4">Nenhum ${isItem ? 'item' : 'conteúdo'} encontrado. Crie um primeiro!</p>`;
        return;
    }

    data.forEach(item => {
        const el = document.createElement('button');
        el.className = 'w-full text-left p-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-3';
        
        let iconHtml = '';
        if (item.image) {
            const imageUrl = URL.createObjectURL(bufferToBlob(item.image, item.imageMimeType));
            iconHtml = `<img src="${imageUrl}" class="w-8 h-8 rounded-full object-cover flex-shrink-0" style="image-rendering: pixelated;">`;
        } else {
            const iconClass = isItem ? 'fa-box' : 'fa-magic';
            iconHtml = `<i class="fas ${iconClass} w-8 text-center text-xl text-gray-400"></i>`;
        }

        el.innerHTML = `
            ${iconHtml}
            <div>
                <p class="font-semibold">${item.name}</p>
                ${!isItem && item.type ? `<p class="text-xs text-gray-400 capitalize">${item.type}</p>` : ''}
            </div>
        `;

        el.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('addItemToCharacter', { detail: { data: item, type: isItem ? 'item' : 'magic' } }));
            selectionModal.classList.add('hidden');
        });
        selectionModalList.appendChild(el);
    });
}

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

async function renderCharacterList() {
    const contentDisplay = document.getElementById('content-display');
    const allCharacters = await getData('rpgCards');

    const container = document.createElement('div');
    container.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-6 pt-0';
    
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
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "character";
        cardWrapper.dataset.id = char.id;
        
        cardWrapper.innerHTML = `
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

async function renderSpellList(type = 'magias') {
    const contentDisplay = document.getElementById('content-display');
    let allSpells = await getData('rpgSpells');

    if (type === 'magias') {
        allSpells = allSpells.filter(spell => spell.type === 'magia' || !spell.type);
    } else if (type === 'habilidades') {
        allSpells = allSpells.filter(spell => spell.type === 'habilidade');
    }

    const gridContainer = document.createElement('div');
    gridContainer.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-6 pt-0';
    
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
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "spell";
        cardWrapper.dataset.id = spell.id;
        cardWrapper.innerHTML = `
            <div class="miniCard absolute inset-0  flex flex-col items-center justify-center text-white p-2 rounded-lg">
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

async function renderItemList() {
    const contentDisplay = document.getElementById('content-display');
    const allItems = await getData('rpgItems');

    const container = document.createElement('div');
    container.className = 'grid gap-4 w-full justify-items-center grid-cols-3 md:grid-cols-4 lg:grid-cols-5 p-6 pt-0';

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
        cardWrapper.className = 'rpg-thumbnail bg-cover bg-center relative';
        cardWrapper.dataset.action = "view";
        cardWrapper.dataset.type = "item";
        cardWrapper.dataset.id = item.id;
        cardWrapper.innerHTML = `
            <div class="miniCard absolute inset-0  flex flex-col items-center justify-center text-white p-2 rounded-lg">
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

    const contentLoader = document.getElementById('content-loader');
    const navButtons = document.querySelectorAll('.nav-button');
    const contentDisplay = document.getElementById('content-display');
    const mainContainer = document.querySelector('main.max-w-6xl');
    const creationSection = document.getElementById('creation-section');
    const spellCreationSection = document.getElementById('spell-creation-section');
    const itemCreationSection = document.getElementById('item-creation-section');
    const inventoryManagementSection = document.getElementById('inventory-management-section');
    const selectCharacterModal = document.getElementById('select-character-modal');
    const selectCharacterList = document.getElementById('select-character-list');
    
    const selectCharacterCloseBtn = document.getElementById('select-character-close-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const closeSpellFormBtn = document.getElementById('close-spell-form-btn');
    const closeItemFormBtn = document.getElementById('close-item-form-btn');
    const closeInventoryBtn = document.getElementById('close-inventory-btn');
    
    const cardForm = document.getElementById('cardForm');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submitButton');

    const spellForm = document.getElementById('spellForm');
    const spellFormTitle = document.getElementById('spell-form-title');
    const spellSubmitButton = document.getElementById('spellSubmitButton');
    const enhanceWrapper = document.getElementById('enhance-wrapper');
    const trueWrapper = document.getElementById('true-wrapper');

    const itemForm = document.getElementById('itemForm');
    const itemFormTitle = document.getElementById('item-form-title');
    const itemSubmitButton = document.getElementById('itemSubmitButton');

    const selectionModal = document.getElementById('selection-modal');
    const selectionModalCloseBtn = document.getElementById('selection-modal-close-btn');
    
    renderContent = async (target) => {
        contentDisplay.innerHTML = '';
        contentLoader.classList.remove('hidden');

        await new Promise(resolve => setTimeout(resolve, 50));

        creationSection.classList.add('hidden');
        spellCreationSection.classList.add('hidden');
        itemCreationSection.classList.add('hidden');
        inventoryManagementSection.classList.add('hidden');

        if (target !== 'personagem-em-jogo') {
            const titleText = document.querySelector(`.nav-button[data-target="${target}"] .hidden`)?.textContent || target.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
            contentDisplay.innerHTML = `<div class="w-full text-center mb-2 mt-2"></div>`;
            contentDisplay.style.background = '';
            contentDisplay.style.boxShadow = '';
            if (mainContainer) mainContainer.style.overflowY = 'auto';
            contentDisplay.style.overflowY = 'visible';
        }

        if (target === 'personagem') await renderCharacterList();
        else if (target === 'magias') await renderSpellList('magias');
        else if (target === 'habilidades') await renderSpellList('habilidades');
        else if (target === 'itens') await renderItemList();
        else if (target === 'personagem-em-jogo') await renderCharacterInGame();

        contentLoader.classList.add('hidden');
    };
    
    function showView(section, isEditing, setupFunction) {
        section.classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelector('nav').classList.add('hidden');
        if (!isEditing && setupFunction) setupFunction();
    }

    const renderCharacterInGame = async () => {
        const allCharacters = await getData('rpgCards');
        const characterInPlay = allCharacters.find(char => char.inPlay);
        
        contentDisplay.innerHTML = '';
        contentDisplay.style.background = '';
        contentDisplay.style.boxShadow = '';
        if (mainContainer) mainContainer.style.overflowY = 'hidden';
        contentDisplay.style.overflowY = 'visible';

        if (characterInPlay) {
            await renderFullCharacterSheet(characterInPlay, false, null, true, contentDisplay);
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
    
    const showCharacterSelectionModalForPlay = async () => {
        const modalTitleEl = selectCharacterModal.querySelector('h3');
        modalTitleEl.textContent = 'Selecionar Personagem em Jogo';
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
    
    navButtons.forEach(button => {
        button.addEventListener('click', (event) => {
            const target = event.currentTarget.dataset.target;
            navButtons.forEach(btn => btn.classList.remove('active'));
            event.currentTarget.classList.add('active');
            renderContent(target);
        });
    });
    
    document.addEventListener('click', (e) => {
        const action = e.target.closest('[data-action]')?.dataset.action;
        if (!action) return;

        if (action === "add-character") showView(creationSection, false, () => {
            cardForm.reset();
            formTitle.textContent = 'Novo Personagem';
            submitButton.textContent = 'Criar Cartão';
            document.getElementById('selected-magics-container').innerHTML = '';
            document.getElementById('selected-relationships-container').innerHTML = '';
            populatePericiasCheckboxes();
            document.getElementById('manage-inventory-from-edit-btn').classList.add('hidden');
        });
         if (action === "add-spell" || action === "add-habilidade") showView(spellCreationSection, false, () => {
            const isHabilidade = action === "add-habilidade";
            spellForm.reset();
            spellForm.dataset.type = isHabilidade ? 'habilidade' : 'magia';
            spellFormTitle.textContent = isHabilidade ? 'Nova Habilidade' : 'Nova Magia';
            spellSubmitButton.textContent = isHabilidade ? 'Criar Habilidade' : 'Criar Magia';
            enhanceWrapper.classList.toggle('hidden', isHabilidade);
            trueWrapper.classList.toggle('hidden', isHabilidade);
            populateSpellAumentosSelect();
        });
        if (action === "add-item") showView(itemCreationSection, false, () => {
            itemForm.reset();
            itemFormTitle.textContent = 'Novo Item';
            itemSubmitButton.textContent = 'Criar Item';
            populateItemAumentosSelect();
        });
        if (e.target.closest('#select-character-btn')) showCharacterSelectionModalForPlay();
    });

    document.getElementById('manage-inventory-from-edit-btn').addEventListener('click', () => {
        const characterId = getCurrentEditingCardId();
        if (characterId) {
            creationSection.classList.add('hidden');
            inventoryManagementSection.classList.remove('hidden');
            renderInventoryManagement(characterId);
        }
    });
    
    const closeForm = (section, targetTab) => {
        section.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(targetTab);
    };

    closeFormBtn.addEventListener('click', () => closeForm(creationSection, 'personagem'));
    closeSpellFormBtn.addEventListener('click', () => closeForm(spellCreationSection, spellForm.dataset.type === 'habilidade' ? 'habilidades' : 'magias'));
    closeItemFormBtn.addEventListener('click', () => closeForm(itemCreationSection, 'itens'));
    closeInventoryBtn.addEventListener('click', () => {
        cleanupInventoryManagementListeners();
        inventoryManagementSection.classList.add('hidden');
        if (getCurrentEditingCardId()) {
            creationSection.classList.remove('hidden');
        } else {
            closeForm(inventoryManagementSection, 'personagem-em-jogo');
        }
    });
    selectCharacterCloseBtn.addEventListener('click', () => selectCharacterModal.classList.add('hidden'));

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

    document.getElementById('add-relationship-btn').addEventListener('click', () => {
        openCharacterSelectionForRelationship();
    });

    document.getElementById('add-magic-to-char-btn').addEventListener('click', () => openSelectionModal('magic'));
    selectionModalCloseBtn.addEventListener('click', () => selectionModal.classList.add('hidden'));

    document.addEventListener('openItemSelectionModal', () => openSelectionModal('item'));

    document.addEventListener('navigateHome', () => {
        const charactersButton = document.querySelector('.nav-button[data-target="personagem"]');
        if (charactersButton) {
            charactersButton.click();
        }
    });

    await openDatabase();
    renderContent('personagem-em-jogo');
    
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
            const parentThumbnail = menuBtn.closest('.rpg-thumbnail');

            document.querySelectorAll('.rpg-thumbnail.menu-active').forEach(activeThumb => {
                if (activeThumb !== parentThumbnail) {
                    activeThumb.classList.remove('menu-active');
                    activeThumb.style.zIndex = '';
                    const activeMenu = activeThumb.querySelector('.thumbnail-menu');
                    if (activeMenu) {
                        activeMenu.classList.remove('active', 'menu-left');
                    }
                }
            });
            
            const isActive = menu.classList.toggle('active');
            parentThumbnail.classList.toggle('menu-active', isActive);

            if (isActive) {
                parentThumbnail.style.zIndex = '100'; 
                const parentRect = parentThumbnail.getBoundingClientRect();
                const viewportMidpoint = window.innerWidth / 2;

                if ((parentRect.left + parentRect.width / 2) < viewportMidpoint) {
                    menu.classList.add('menu-left');
                } else {
                    menu.classList.remove('menu-left');
                }
            } else {
                 parentThumbnail.style.zIndex = ''; 
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
                        spellForm.dataset.type = spellData.type || 'magia';
                        spellFormTitle.textContent = isHabilidade ? 'Editando Habilidade' : 'Editando Magia';
                        spellSubmitButton.textContent = isHabilidade ? 'Salvar Habilidade' : 'Salvar Magia';
                        enhanceWrapper.classList.toggle('hidden', isHabilidade);
                        trueWrapper.classList.toggle('hidden', isHabilidade);
                        
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
                 if (cardType === 'character') await exportCard(cardId);
                 if (cardType === 'spell') await exportSpell(cardId);
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
            const parentThumbnail = menuItem.closest('.rpg-thumbnail');
            if(parentThumbnail){
                parentThumbnail.classList.remove('menu-active');
                parentThumbnail.style.zIndex = '';
            }
            const parentMenu = menuItem.closest('.thumbnail-menu');
            if(parentMenu){
                parentMenu.classList.remove('active', 'menu-left');
            }
            return;
        }

        if (!e.target.closest('.thumbnail-menu') && !e.target.closest('.thumb-btn-menu')) {
            document.querySelectorAll('.rpg-thumbnail.menu-active').forEach(activeThumb => {
                activeThumb.classList.remove('menu-active');
                activeThumb.style.zIndex = '';
                const activeMenu = activeThumb.querySelector('.thumbnail-menu');
                if (activeMenu) {
                    activeMenu.classList.remove('active', 'menu-left');
                }
            });
        }
    });
});

