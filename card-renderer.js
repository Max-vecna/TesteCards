import { saveData, getData } from './local_db.js'; // Adicionado para a funcionalidade de dinheiro

function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

/**
 * Extrai a cor média de uma imagem.
 * @param {string} imageUrl - URL da imagem.
 * @returns {Promise<string>} Uma promessa que resolve com a cor média em formato rgb().
 */
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
                const step = 4 * 10; // Pula alguns pixels para otimização

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


export async function renderFullCharacterSheet(characterData, isModal, aspect, isInPlay) {
    const sheetContainer = document.getElementById('character-sheet-container');
    // Se o container não existir e estivermos em modo modal, não faz nada.
    if (!sheetContainer) return;

    // Proporção base 248x346
    const aspectRatio = aspect || 16 / 9;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalWidth;
    let finalHeight;

    // Calcular a largura e altura máximas, mantendo a proporção de 248x346
    if ((windowWidth * aspectRatio) > windowHeight) {
        finalHeight = windowHeight * 0.9;
        finalWidth = finalHeight / aspectRatio;
    } else {
        finalWidth = windowWidth * 0.9;
        finalHeight = finalWidth * aspectRatio;
    }
    
    const imageUrl = characterData.image ? URL.createObjectURL(bufferToBlob(characterData.image, characterData.imageMimeType)) : 'https://placehold.co/800x600/4a5568/a0aec0?text=Personagem';
    const imageBack = characterData.backgroundImage ? URL.createObjectURL(bufferToBlob(characterData.backgroundImage, characterData.backgroundMimeType)) : 'https://placehold.co/800x600/4a5568/a0aec0?text=Personagem';
    
    // Gerar um ID dinâmico para evitar conflitos se houver vários cards
    const uniqueId = Date.now();

    // Extrai a cor média da imagem de fundo
    const predominantColor = await getPredominantColor(imageBack).catch(e => {
        console.error("Erro ao extrair cor média:", e);
        return '#4a5568'; // Cor de fallback
    });

    const mainAttributes = ['agilidade', 'carisma', 'forca', 'inteligencia', 'sabedoria', 'vigor'];
    characterData.attributes = characterData.attributes || {
        agilidade: 0,
        carisma: 0,
        forca: 0,
        inteligencia: 0,
        sabedoria: 0,
        vigor: 0,
        vida: 0,
        vidaAtual: 0,
        mana: 0,
        manaAtual: 0,
        armadura: 0,
        esquiva: 0,
        bloqueio: 0,
        deslocamento: 0
    };

    const attributeValues = mainAttributes.map(attr => parseInt(characterData.attributes[attr]) || 0);
    const maxAttributeValue = Math.max(...attributeValues, 1);
    const cdValue = 10 + (parseInt(characterData.level) || 0) + (parseInt(characterData.attributes.sabedoria) || 0);
    const palette = { borderColor: predominantColor };

    var scale = isModal ? 1 : .17;
    if(isInPlay) scale = 1;

    var origin = isModal ?  "" : "transform-origin: top left";

    const sheetHtml = `
            <button id="close-sheet-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:text-white z-10 thumb-btn" style="display: ${isModal ? 'block' : 'none'}"><i class="fa-solid fa-xmark"></i></button>
            <div id="character-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; border: 1px solid ${predominantColor}; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
                <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="absolute top-4 right-2 p-2 rounded-full text-center">
                <i class="fas fa-heart text-red-500 text-5xl"></i>
                <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                    <span>${characterData.attributes.vidaAtual || 0}</span>
                    <hr style="width: 15px;">
                    <span>${characterData.attributes.vida || 0}</span>
                </div>
            </div>

            <div class="absolute top-4 left-2 p-2 rounded-full text-center">
                <div class="icon-container mana-icon-container">
                    <i class="fas fa-fire text-blue-500 text-5xl"></i>
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                        <span>${characterData.attributes.manaAtual || 0}</span>
                        <hr style="width: 15px;">
                        <span>${characterData.attributes.mana || 0}</span>
                    </div>
                </div>
            </div>

            <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10">
                <h3 class="text-2xl font-bold">${characterData.title}</h3>
                <p class="text-md italic text-gray-300">${characterData.subTitle}</p>
            </div>

             <div class="absolute top-20 right-4 p-2 grid grid-row-8 md:grid-cols-10 gap-2 mb-4" style="background: #0000008f; border-radius: 12px;">
                <div id="elmo-icon" class="w-8 h-8 mx-auto" style="background: url(icons/spartan.png); background-size: contain;"></div>
                <div id="escudo-icon" class="w-8 h-8 mx-auto" style="background: url(icons/token.png); background-size: contain;"></div>
                <div id="espada-icon" class="w-8 h-8 mx-auto" style="background: url(icons/sword.png); background-size: contain;"></div>
                <div id="capa-icon" class="w-8 h-8 mx-auto" style="background: url(icons/coat.png); background-size: contain;"></div>
                <div id="luvas-icon" class="w-8 h-8 mx-auto" style="background: url(icons/racing-gloves.png); background-size: contain;"></div>
                <div id="bota-icon" class="w-8 h-8 mx-auto" style="background: url(icons/boot.png); background-size: contain;"></div>
                <div id="cajado-icon" class="w-8 h-8 mx-auto" style="background: url(icons/sceptre.png); background-size: contain;"></div>
                <div id="anel-icon" class="w-8 h-8 mx-auto" style="background: url(icons/aim.png); background-size: contain;"></div>
            </div>

            <div id="lore-icon-${uniqueId}" class="absolute top-20 left-4 rounded-full p-3 bg-black/50 flex items-center justify-center text-lg text-yellow-200 cursor-pointer" data-action="toggle-lore">
                <i class="fas fa-book"></i>
            </div>
            <div id="money-icon" class="absolute money-container top-32 left-4 rounded-full p-2 bg-black/50 flex items-center justify-center text-sm text-amber-300 font-bold" data-action="open-money-modal" title="Alterar Dinheiro" style="writing-mode: vertical-rl; text-orientation: upright;">
                💰$<span data-status="money">${characterData.dinheiro || 0}</span>
            </div>
            
            <div id="lore-modal-${uniqueId}" class="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 hidden transition-opacity duration-300">
                <div class="bg-gray-800 p-8 rounded-lg max-w-xl w-full text-white shadow-lg relative">
                    <button id="close-lore-modal-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full leading-none w-8 h-8 flex items-center justify-center">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                    <h2 class="text-2xl font-bold mb-4 border-b pb-2">Lore do Personagem</h2>
                    <div id="lore-content" class="text-sm leading-relaxed overflow-y-auto max-h-96">
                        <h4>História</h4>
                        <p class="mb-4">${characterData.lore?.historia || "Nenhuma história definida."}</p>
                        <h4>Personalidade</h4>
                        <p class="mb-4">${characterData.lore?.personalidade || "Nenhuma personalidade definida."}</p>
                        <h4>Motivação</h4>
                        <p>${characterData.lore?.motivacao || "Nenhuma motivação definida."}</p>
                    </div>
                </div>
            </div>

            <div class="absolute bottom-0 w-full p-4">               
                <div class="pb-4 scrollable-content text-sm text-left" style="display: flex; flex-direction: row; overflow-y: scroll;gap: 12px; scroll-snap-type: x mandatory;">
                    <div class="rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; border-color: ${palette.borderColor}; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div class="grid grid-cols-6 gap-x-4 gap-y-1 text-xs my-2 mb-4">
                            <div class="text-center font-bold" style="color: rgb(0 247 85);">LV<br>${characterData.level || 0}</div>
                            <div class="text-center">CA<br>${characterData.attributes.armadura || 0}</div>
                            <div class="text-center">ES<br>${characterData.attributes.esquiva || 0}</div>
                            <div class="text-center">BL<br>${characterData.attributes.bloqueio || 0}</div>
                            <div class="text-center">DL<br>${characterData.attributes.deslocamento || 0}m</div>                            
                            <div class="text-center">CD<br>${cdValue}</div>                            
                        </div>
                        ${mainAttributes.map(key => {
                        const value = parseInt(characterData.attributes[key]) || 0; 
                        const percentage = maxAttributeValue > 0 ? (value * 100) / maxAttributeValue : 0;
                        return `
                        <div class="mt-2 flex items-center space-x-2 text-xs">
                            <span class="font-bold w-8">${key.slice(0, 3).toUpperCase()}</span>
                            <div class="stat-bar flex-grow rounded-3xl" style="margin-top: 0">
                                <div class="stat-fill h-full rounded-3xl" style="width: ${percentage}%; background: ${palette.borderColor}"></div>
                            </div>
                            <span class="text-xs font-bold ml-auto">${value} / ${maxAttributeValue}</span>
                        </div>
                        `;
                        }).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;

    if (!isModal) {
        
        return sheetHtml;
    }

    sheetContainer.style.background = `url('${imageBack}')`;
    sheetContainer.style.backgroundSize = 'cover';
    sheetContainer.style.backgroundPosition = 'center';
    sheetContainer.style.boxShadow = 'inset 0px 0px 10px 0px black';
    sheetContainer.innerHTML = sheetHtml;
    sheetContainer.classList.remove('hidden');

    const loreIcon = sheetContainer.querySelector(`#lore-icon-${uniqueId}`);
    const loreModal = sheetContainer.querySelector(`#lore-modal-${uniqueId}`);
    const closeLoreModalBtn = sheetContainer.querySelector(`#close-lore-modal-btn-${uniqueId}`);
    const closeSheetBtn = sheetContainer.querySelector(`#close-sheet-btn-${uniqueId}`); // <-- ALTERADO

    const closeSheet = () => {
        sheetContainer.classList.add('hidden');
        sheetContainer.innerHTML = '';
        if (imageUrl.startsWith('blob:')) URL.revokeObjectURL(imageUrl);
        if (imageBack.startsWith('blob:')) URL.revokeObjectURL(imageBack);
    };

    if (loreIcon && loreModal && closeLoreModalBtn) {
        loreIcon.addEventListener('click', () => loreModal.classList.remove('hidden'));
        closeLoreModalBtn.addEventListener('click', () => loreModal.classList.add('hidden'));
    }

    // LÓGICA CORRIGIDA E MAIS ROBUSTA
    if (closeSheetBtn) {
        // Clonar o botão remove event listeners antigos e garante que o novo será adicionado
        const newBtn = closeSheetBtn.cloneNode(true);
        closeSheetBtn.parentNode.replaceChild(newBtn, closeSheetBtn);
        newBtn.addEventListener('click', closeSheet);
    }
    
    sheetContainer.addEventListener('click', (e) => {
        if (e.target === sheetContainer) {
            closeSheet();
        }
    });
}