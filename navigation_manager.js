import { populatePericiasCheckboxes, saveCharacterCard, renderCharacterList, editCard, importCard } from './character_manager.js';
import { populateSpellPericiasCheckboxes, saveSpellCard, renderSpellList, editSpell, importSpell } from './magic_manager.js';
import { openDatabase, removeData, getData, saveData } from './local_db.js';
import { renderFullCharacterSheet } from './card-renderer.js';
import { renderFullSpellSheet } from './magic_renderer.js';


document.addEventListener('DOMContentLoaded', async () => {
    // Referências para os elementos do DOM
    const navButtons = document.querySelectorAll('.nav-button');
    const contentDisplay = document.getElementById('content-display');
    const creationSection = document.getElementById('creation-section');
    const spellCreationSection = document.getElementById('spell-creation-section');
    const selectCharacterModal = document.getElementById('select-character-modal');
    const selectCharacterList = document.getElementById('select-character-list');
    const selectCharacterCloseBtn = document.getElementById('select-character-close-btn');
    const closeFormBtn = document.getElementById('close-form-btn');
    const closeSpellFormBtn = document.getElementById('close-spell-form-btn');
    
    // Novo input de arquivo para importação
    const importJsonInput = document.getElementById('import-json-input');
    const importSpellJsonInput = document.getElementById('import-spell-json-input');

    // Referências para o formulário
    const cardForm = document.getElementById('cardForm');
    const formTitle = document.getElementById('form-title');
    const submitButton = document.getElementById('submitButton');
    const vidaInput = document.getElementById('vida');
    const manaInput = document.getElementById('mana');
    const vidaAtualInput = document.getElementById('vidaAtual');
    const manaAtualInput = document.getElementById('manaAtual');

    // Referências para o formulário de magia
    const spellForm = document.getElementById('spellForm');
    const spellFormTitle = document.getElementById('spell-form-title');
    const spellSubmitButton = document.getElementById('spellSubmitButton');

    // Variáveis globais de estado
    let characterInPlayId = null;

    // Funções de renderização de conteúdo
    const renderContent = async (target) => {
        contentDisplay.innerHTML = '';
        creationSection.classList.add('hidden'); // Esconde o formulário em cada troca de seção
        spellCreationSection.classList.add('hidden');

        const title = target.charAt(0).toUpperCase() + target.slice(1);
        const html = `
            <div class="w-full text-center mb-2 mt-2">
                <h2 class="text-3xl font-bold text-gray-200">${title}</h2>
            </div>
        `;
        contentDisplay.innerHTML = html;

        if (target === 'personagem') {
            renderCharacterList();
        } else if (target === 'magias' || target === 'habilidades') {
            renderSpellList();
        }
        else if (target === 'personagem-em-jogo') {
             await renderCharacterInGame();
        }
    };
    
    // Funções de salvamento e edição
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

    function showSpellCreationView(isEditing) {
        spellCreationSection.classList.remove('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.querySelector('nav').classList.remove('hidden');

        if (!isEditing) {
            spellForm.reset();
            spellFormTitle.textContent = 'Nova Magia';
            spellSubmitButton.textContent = 'Criar Magia';
            populateSpellPericiasCheckboxes();
        }
    }

    const renderCharacterInGame = async () => {
        const allCharacters = await getData('rpgCards');
        const characterInPlay = allCharacters.find(char => char.inPlay);
        const contentDisplay = document.getElementById('content-display');
        
        if (characterInPlay) {
            contentDisplay.innerHTML =renderFullCharacterSheet(characterInPlay, contentDisplay, false);
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
        const selectCharacterList = document.getElementById('select-character-list');
        const selectCharacterModal = document.getElementById('select-character-modal');
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
                        // Reseta o status 'inPlay' de todos os outros personagens
                        await Promise.all(allCharacters.map(c => {
                            if (c.id !== selectedChar.id && c.inPlay) {
                                c.inPlay = false;
                                return saveData('rpgCards', c);
                            }
                            return Promise.resolve();
                        }));

                        // Define o status 'inPlay' para o personagem selecionado
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

    // Gerencia a navegação
    const handleNavigation = (event) => {
        const target = event.currentTarget.dataset.target;
        navButtons.forEach(btn => btn.classList.remove('active'));
        event.currentTarget.classList.add('active');
        renderContent(target);
    };

    // Adiciona o ouvinte de evento de clique a cada botão de navegação
    navButtons.forEach(button => {
        button.addEventListener('click', handleNavigation);
    });

    // Eventos de clique para personagens e magias, tratados em seus respectivos arquivos
    document.addEventListener('click', (e) => {
        const addCharacterButton = e.target.closest('[data-action="add-character"]');
        const addSpellButton = e.target.closest('[data-action="add-spell"]');
        const selectCharacterButton = e.target.closest('#select-character-btn');

        if (addCharacterButton) {
            showCreationView(false);
        }
        if (addSpellButton) {
            showSpellCreationView(false);
        }
        if (selectCharacterButton) {
            showCharacterSelectionModal();
        }
    });

    // Fecha o formulário de criação de personagem
    closeFormBtn.addEventListener('click', () => {
        creationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(document.querySelector('.nav-button.active').dataset.target);
    });

    // Fecha o formulário de criação de magia
    closeSpellFormBtn.addEventListener('click', () => {
        spellCreationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent(document.querySelector('.nav-button.active').dataset.target);
    });

    // Fecha o modal de seleção de personagem
    selectCharacterCloseBtn.addEventListener('click', () => {
        selectCharacterModal.classList.add('hidden');
    });

    // Evento de submissão do formulário de personagem
    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const vidaMax = parseInt(vidaInput.value) || 0;
        const manaMax = parseInt(manaInput.value) || 0;
        const vidaAtual = parseInt(vidaAtualInput.value) || 0;
        const manaAtual = parseInt(manaAtualInput.value) || 0;

        // Note: I'm using `window.alert` to be consistent with the other parts of the original code, but a custom modal would be a better practice.
        if (vidaAtual > vidaMax) {
            window.alert('A Vida Atual não pode ser maior que a Vida Máxima.');
            return;
        }

        if (manaAtual > manaMax) {
            window.alert('A Mana Atual não pode ser maior que a Mana Máxima.');
            return;
        }

        await saveCharacterCard(cardForm);
        creationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent('personagem');
    });

    // Evento de submissão do formulário de magia
    spellForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSpellCard(spellForm);
        spellCreationSection.classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        renderContent('magias');
    });

    // Renderiza a tela inicial
    await openDatabase(); // Espera o banco de dados abrir antes de renderizar
    renderContent('personagem-em-jogo');

    // LÓGICA CONSOLIDADA PARA LIDAR COM CLIQUES NOS CARDS E MENUS
    document.addEventListener('click', async (e) => {
        const thumbCard = e.target.closest('.rpg-thumbnail');
        const menuBtn = e.target.closest('.thumb-btn-menu');
        const menuItem = e.target.closest('.thumbnail-menu .menu-item');

        // Lógica para expandir o card de personagem/magia
        if (thumbCard && !menuBtn && !menuItem) {
            const cardId = thumbCard.dataset.id;
            const cardType = thumbCard.dataset.type;
            
            if (cardType === 'character') {
                const cardData = await getData('rpgCards', cardId);
                if (cardData) {
                    renderFullCharacterSheet(cardData, null, true);
                }
            } else if (cardType === 'spell') {
                const spellData = await getData('rpgSpells', cardId);
                if (spellData) {
                    renderFullSpellSheet(spellData);
                }
            }
            return;
        }

        // Lógica para abrir/fechar o menu de ações
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
        
        // Lógica para as ações do menu (editar, remover, baixar)
        if (menuItem) {
            e.preventDefault();
            e.stopPropagation();
            const action = menuItem.dataset.action;
            const cardId = menuItem.dataset.id;
            const cardType = menuItem.closest('[data-type]').dataset.type;

            if (action === 'edit') {
                if (cardType === 'spell') {
                    showSpellCreationView(true);
                    await editSpell(cardId);
                } else {
                    showCreationView(true);
                    await editCard(cardId);
                }
            } else if (action === 'remove' || action === 'delete') {
                if (window.confirm('Tem certeza que deseja excluir?')) {
                    if (cardType === 'spell') {
                        await removeData('rpgSpells', cardId);
                        renderSpellList();
                    } else {
                        await removeData('rpgCards', cardId);
                        renderCharacterList();
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
                    // Reseta o status 'inPlay' de todos os outros personagens
                    await Promise.all(allCharacters.map(c => {
                        if (c.id !== selectedChar.id && c.inPlay) {
                            c.inPlay = false;
                            return saveData('rpgCards', c);
                        }
                        return Promise.resolve();
                    }));
                    // Define o status 'inPlay' para o personagem selecionado
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

        // Fecha menus se o clique for fora deles
        if (!e.target.closest('.thumbnail-menu')) {
            document.querySelectorAll('.thumbnail-menu.active').forEach(m => m.classList.remove('active'));
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
});
