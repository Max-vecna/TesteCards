import { populatePericiasCheckboxes, saveCharacterCard, editCard, importCard } from './character_manager.js';
import { populateSpellPericiasCheckboxes, saveSpellCard, editSpell, importSpell } from './magic_manager.js';
import { openDatabase, removeData, getData, saveData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';
import { renderFullSpellSheet } from './magic_renderer.js';

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
    const sheet = miniCard.querySelector('#character-sheet, #spell-sheet');
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

    // Observa o container do grid para recentralizar os cards se o tamanho do grid mudar.
    const ro = new ResizeObserver(debounce(() => {
        centerAllSheets();
    }, 150));
    
    ro.observe(gridContainer);
}


/**
 * Renderiza a lista de miniaturas de personagens com animação.
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
    contentDisplay.appendChild(container);

    allCharacters.forEach((char, index) => {
        setTimeout(async () => {
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
            container.appendChild(cardWrapper);
            
            // Centraliza o card e depois o torna visível
            requestAnimationFrame(() => {
                centerSheetInMiniCard(cardWrapper.querySelector('.miniCard'));
                cardWrapper.classList.add('visible');
            });
        }, index * 100);
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
 * Renderiza a lista de magias/habilidades com animação.
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
    contentDisplay.appendChild(gridContainer);
    
    allSpells.forEach((spell, index) => {
        setTimeout(async () => {
            const spellSheetHtml = await renderFullSpellSheet(spell, false, 16/11);
            const cardWrapper = document.createElement('div');
            cardWrapper.className = 'rpg-thumbnail bg-cover bg-center shadow-lg relative';
            cardWrapper.dataset.action = "viewSpell";
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
            gridContainer.appendChild(cardWrapper);

            // Centraliza o card e depois o torna visível
            requestAnimationFrame(() => {
                centerSheetInMiniCard(cardWrapper.querySelector('.miniCard'));
                cardWrapper.classList.add('visible');
            });
        }, index * 100);
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

    const navButtons = document.querySelectorAll('.nav-button');
    const contentDisplay = document.getElementById('content-display');
    const creationSection = document.getElementById('creation-section');
    const spellCreationSection = document.getElementById('spell-creation-section');
    const selectCharacterModal = document.getElementById('select-character-modal');
    const selectCharacterList = document.getElementById('select-character-list');
    const selectCharacterCloseBtn = document.getElementById('select-character-close-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const closeSpellFormBtn = document.getElementById('close-spell-form-btn');
    
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

    const renderContent = async (target) => {
        contentDisplay.innerHTML = '';
        creationSection.classList.add('hidden');
        spellCreationSection.classList.add('hidden');

        const titleText = document.querySelector(`.nav-button[data-target="${target}"] .hidden`)?.textContent || target.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
        const html = `
            <div class="w-full text-center mb-2 mt-2">
                <h2 class="text-3xl font-bold text-gray-200">${titleText}</h2>
            </div>
        `;
        contentDisplay.innerHTML = html;

        if (target === 'personagem') {
            await renderCharacterList();
        } else if (target === 'magias') {
            await renderSpellList('magias');
        } else if (target === 'habilidades') {
            await renderSpellList('habilidades');
        } else if (target === 'personagem-em-jogo') {
            await renderCharacterInGame();
        }
    };
    
    function showCreationView(isEditing) {
        creationSection.classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelector('nav').classList.add('hidden');
        
        if (!isEditing) {
            cardForm.reset();
            formTitle.textContent = 'Novo Cartão de Personagem';
            submitButton.textContent = 'Criar Cartão';
            populatePericiasCheckboxes();
        }
    }

    function showSpellCreationView(isEditing, type = 'magia') {
        spellCreationSection.classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelector('nav').classList.add('hidden');

        spellForm.dataset.type = type;

        if (type === 'habilidade') {
            spellFormTitle.textContent = isEditing ? 'Editando Habilidade' : 'Nova Habilidade';
            spellSubmitButton.textContent = isEditing ? 'Salvar Edição' : 'Criar Habilidade';
            enhanceWrapper.classList.add('hidden');
            trueWrapper.classList.add('hidden');
        } else {
            spellFormTitle.textContent = isEditing ? 'Editando Magia' : 'Nova Magia';
            spellSubmitButton.textContent = isEditing ? 'Salvar Edição' : 'Criar Magia';
            enhanceWrapper.classList.remove('hidden');
            trueWrapper.classList.remove('hidden');
        }

        if (!isEditing) {
            spellForm.reset();
            populateSpellPericiasCheckboxes();
        }
    }

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

    const handleNavigation = (event) => {
        const target = event.currentTarget.dataset.target;
        navButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        renderContent(target);
    };

    navButtons.forEach(button => {
        button.addEventListener('click', handleNavigation);
    });

    document.addEventListener('click', (e) => {
        const addCharacterButton = e.target.closest('[data-action="add-character"]');
        const addSpellButton = e.target.closest('[data-action="add-spell"]');
        const addHabilidadeButton = e.target.closest('[data-action="add-habilidade"]');
        const selectCharacterButton = e.target.closest('#select-character-btn');

        if (addCharacterButton) showCreationView(false);
        if (addSpellButton) showSpellCreationView(false, 'magia');
        if (addHabilidadeButton) showSpellCreationView(false, 'habilidade');
        if (selectCharacterButton) showCharacterSelectionModal();
    });

    closeFormBtn.addEventListener('click', () => {
        creationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(document.querySelector('.nav-button.active').dataset.target);
    });

    closeSpellFormBtn.addEventListener('click', () => {
        spellCreationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(document.querySelector('.nav-button.active').dataset.target);
    });

    selectCharacterCloseBtn.addEventListener('click', () => {
        selectCharacterModal.classList.add('hidden');
    });

    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const vidaMax = parseInt(vidaInput.value) || 0;
        const manaMax = parseInt(manaInput.value) || 0;
        const vidaAtual = parseInt(vidaAtualInput.value) || 0;
        const manaAtual = parseInt(manaAtualInput.value) || 0;

        if (vidaAtual > vidaMax) return alert('A Vida Atual não pode ser maior que a Vida Máxima.');
        if (manaAtual > manaMax) return alert('A Mana Atual não pode ser maior que a Mana Máxima.');

        await saveCharacterCard(cardForm);
        creationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent('personagem');
    });

    spellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const type = e.currentTarget.dataset.type || 'magia';
        await saveSpellCard(spellForm, type);
        spellCreationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(type === 'magia' ? 'magias' : 'habilidades');
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
            if (cardType === 'character') {
                const cardData = await getData('rpgCards', cardId);
                if (cardData) await renderFullCharacterSheet(cardData, true, 16 / 9, false);
            } else if (cardType === 'spell') {
                const spellData = await getData('rpgSpells', cardId);
                if (spellData) renderFullSpellSheet(spellData, true, 16/9);
            }
            return;
        }

        if (menuBtn) {
            e.preventDefault();
            e.stopPropagation();
            const menu = menuBtn.nextElementSibling;
            document.querySelectorAll('.thumbnail-menu.active').forEach(m => {
                if (m !== menu) m.classList.remove('active');
            });
            menu.classList.toggle('active');
            return;
        }
        
        if (menuItem) {
            e.preventDefault();
            e.stopPropagation();
            const action = menuItem.dataset.action;
            const cardId = menuItem.dataset.id;
            const cardType = menuItem.closest('[data-type]').dataset.type;

            if (action === 'edit') {
                if (cardType === 'spell') {
                    const spellData = await getData('rpgSpells', cardId);
                    if (spellData) {
                        showSpellCreationView(true, spellData.type || 'magia');
                        await editSpell(cardId);
                    }
                } else {
                    showCreationView(true);
                    await editCard(cardId);
                }
            } else if (action === 'remove' || action === 'delete') {
                if (confirm('Tem certeza que deseja excluir?')) {
                    if (cardType === 'spell') {
                        const activeNav = document.querySelector('.nav-button.active').dataset.target;
                        await removeData('rpgSpells', cardId);
                        renderContent(activeNav);
                    } else {
                        await removeData('rpgCards', cardId);
                        renderContent('personagem');
                    }
                }
            } else if (action === 'export-json') {
                 if (cardType === 'spell') {
                    const { exportSpell } = await import('./magic_manager.js');
                    await exportSpell(cardId);
                } else {
                    const { exportCard } = await import('./character_manager.js');
                    await exportCard(cardId);
                }
            } else if (action === 'set-in-play') {
                const allCharacters = await getData('rpgCards');
                const selectedChar = allCharacters.find(char => char.id === cardId);
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
                }
                renderContent('personagem');
            } else if (action === 'remove-from-play') {
                 const selectedChar = await getData('rpgCards', cardId);
                 if (selectedChar) {
                     selectedChar.inPlay = false;
                     await saveData('rpgCards', selectedChar);
                 }
                 renderContent('personagem');
            }
            menuItem.closest('.thumbnail-menu').classList.remove('active');
            return;
        }

        if (!e.target.closest('.thumbnail-menu')) {
            document.querySelectorAll('.thumbnail-menu.active').forEach(m => m.classList.remove('active'));
        }
    });
});

