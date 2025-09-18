function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

export async function renderFullSpellSheet(spellData, isModal, aspect) {
    const sheetContainer = document.getElementById('spell-sheet-container');
    if (!sheetContainer) return;

    // Proporção base 16x10
    const aspectRatio = aspect || (16 / 10);

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalWidth;
    let finalHeight;

    // Calcular a largura e altura máximas, mantendo a proporção de 16x10
    if ((windowWidth * aspectRatio) > windowHeight) {
        finalHeight = windowHeight * 0.9;
        finalWidth = finalHeight / aspectRatio;
    } else {
        finalWidth = windowWidth * 0.9;
        finalHeight = finalWidth * aspectRatio;
    }

    // Criar objectURL apenas quando houver imagem e guardar para revogar depois
    let imageUrl;
    let createdObjectUrl = null;
    if (spellData.image) {
        createdObjectUrl = URL.createObjectURL(bufferToBlob(spellData.image, spellData.imageMimeType));
        imageUrl = createdObjectUrl;
    } else {
        imageUrl = 'https://placehold.co/400x400/00796B/B2DFDB?text=Magia';
    }

    // Otimização: Usa a cor pré-calculada e armazenada no banco de dados.
    const predominantColor = spellData.predominantColor || '#00796B';

    // Obter as classes de ícones para os atributos de combate
    const attributeIcons = {
        'vida': 'fa-solid fa-heart text-red-500',
        'mana': 'fa-solid fa-fire text-blue-500',
        'armadura': 'fa-solid fa-shield-halved text-gray-400',
        'esquiva': 'fa-solid fa-person-running text-teal-400',
        'bloqueio': 'fa-solid fa-hand-fist text-orange-400',
        'deslocamento': 'fa-solid fa-shoe-prints text-lime-400',
    };
    
    var scale = isModal? 1 : .17;
    var origin = isModal?  "" : "transform-origin: top left";
    
    // Verifica se existe algum aumento de combate ou de atributo para exibir
    const hasCombatBoosts = spellData.aumentos && (
        (spellData.aumentos.armadura || 0) > 0 ||
        (spellData.aumentos.esquiva || 0) > 0 ||
        (spellData.aumentos.bloqueio || 0) > 0 ||
        (spellData.aumentos.deslocamento || 0) > 0
    );

    const hasAttributeBoosts = spellData.aumentos && (
        (spellData.aumentos.agilidade || 0) > 0 ||
        (spellData.aumentos.carisma || 0) > 0 ||
        (spellData.aumentos.forca || 0) > 0 ||
        (spellData.aumentos.inteligencia || 0) > 0 ||
        (spellData.aumentos.sabedoria || 0) > 0 ||
        (spellData.aumentos.vigor || 0) > 0
    );

    const hasPericiasBoosts = spellData.aumentos?.pericias?.some(p => p.value !== 0);
    
    const sheetHtml = `
        <button id="close-spell-sheet-btn" class="absolute top-4 right-4 bg-red-600 hover:text-white z-10 thumb-btn" style="display:${isModal? "block": "none"}"><i class="fa-solid fa-xmark"></i></button>
        <div id="spell-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; border: 1px solid ${predominantColor}; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000, hwb(0deg 0% 100% / 50%), transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10 w-full flex-max">
                <h3 class="text-2xl font-bold" style="color: ${predominantColor}">${spellData.name}</h3>
                <div class="rpg-card-title-divider" style="background: linear-gradient(to right, transparent, ${predominantColor}, transparent); width: 60%"> </div>
            </div>

            ${(spellData.aumentos?.vida > 0) ? `
                <div class="absolute top-2 right-2 p-2 rounded-full text-center">
                    <i class="fas fa-heart text-red-500 text-4xl"></i>
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white">
                        <span>${spellData.aumentos.vida}</span>
                    </div>
                </div>
            ` : ''}

            ${(spellData.aumentos?.mana > 0) ? `
                <div class="absolute top-2 left-2 p-2 rounded-full text-center">
                    <div class="icon-container mana-icon-container">
                        <i class="fas fa-fire text-blue-500 text-4xl"></i>
                        <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white">
                            <span>${spellData.aumentos.mana}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
             <div class="absolute top-16 left-4 grid grid-row-8 md:grid-cols-10 gap-2 mb-4" style="border-radius: 12px;">
                ${hasCombatBoosts ? `        
                <div style="border-radius: 12px">
                    ${(spellData.aumentos?.agilidade > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-020.png); background-size: contain;">
                            ${spellData.aumentos.agilidade}                            
                        </div>` 
                    : ''}

                    ${(spellData.aumentos?.carisma > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-027.png); background-size: contain;">
                            ${spellData.aumentos.carisma}                            
                        </div>`
                    : ''}

                    ${(spellData.aumentos?.forca > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-028.png); background-size: contain;">
                            ${spellData.aumentos.forca}                            
                        </div>`
                    : ''}
                    
                    ${(spellData.aumentos?.inteligencia > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-029.png); background-size: contain;">
                            ${spellData.aumentos.inteligencia}                            
                        </div>`
                    : ''}

                    ${(spellData.aumentos?.sabedoria > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-030.png); background-size: contain;">
                            ${spellData.aumentos.sabedoria}                            
                        </div>`
                    : ''}

                    ${(spellData.aumentos?.vigor > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-021.png); background-size: contain;">
                            ${spellData.aumentos.vigor}                            
                        </div>`
                    : ''}
                 </div>
                `: ""}                
            </div>

            <div class="absolute top-16 right-4 grid grid-row-8 md:grid-cols-10 gap-2 mb-4" style="border-radius: 12px;">
                ${hasAttributeBoosts ? `        
                <div style="border-radius: 12px">
                    ${(spellData.aumentos?.armadura > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-020.png); background-size: contain;">
                            ${spellData.aumentos.armadura}                            
                        </div>` 
                    : ''}

                    ${(spellData.aumentos?.esquiva > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-027.png); background-size: contain;">
                            ${spellData.aumentos.esquiva}                            
                        </div>`
                    : ''}

                    ${(spellData.aumentos?.bloqueio > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-028.png); background-size: contain;">
                            ${spellData.aumentos.bloqueio}                            
                        </div>`
                    : ''}
                    
                    ${(spellData.aumentos?.deslocamento > 0) ? `
                        <div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic outlined-bold flex" style="background: url(icons/panel-transparent-border-029.png); background-size: contain;">
                            ${spellData.aumentos.deslocamento}                            
                        </div>`
                    : ''}
                 </div>
                `: ""}                
            </div>

            <div class="absolute bottom-0 w-full">               
                <div class="w-full text-sm text-left" style="display: flex; flex-direction: row; gap: 12px;">
                    <div class="rounded-3xl w-full p-4" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                        ${hasPericiasBoosts ? `    
                        <div class="p-4 mb-4"  style="background: linear-gradient(90deg, #0000004f, transparent, transparent); border-left: 2px solid ${predominantColor}; border-radius: 12px">
                            <span class="font-bold">Perícias:</span>
                            ${(spellData.aumentos?.pericias || [])
                                .filter(p => p.value !== 0) // Mostra apenas perícias com valor diferente de zero
                                .map(pericia => `
                                    <div class="w-full text-left text-xs text-gray-200 truncate" title="${pericia.name}">
                                        ${pericia.name}: <span class="font-bold text-teal-300">${pericia.value > 0 ? '+' : ''}${pericia.value}</span>
                                    </div>
                                `).join('')
                            }
                        </div>`
                        : ""}
                        <div class="scrollable-content text-sm text-left" style="background: linear-gradient(90deg, #0000004f, transparent, transparent); display: flex; flex-direction: row; overflow-y: scroll;gap: 12px; scroll-snap-type: x mandatory; border-left: 2px solid ${predominantColor}; border-radius: 12px">
                            ${spellData.description ? `       
                            <div class="p-4 rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                                <h4 class="font-semibold text-gray-300">Descrição</h4>
                                <p class="text-gray-300 text-xs" style="text-align:justify;white-space:pre-line;overflow-wrap:break-word;">${spellData.description || 'Nenhuma descrição.'}</p>
                            </div>` : ''}

                            ${spellData.enhance ? `       
                            <div class="p-4 rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                                <h4 class="font-semibold text-gray-300">Aprimorar</h4>
                                <p class="text-gray-300 text-xs" style="text-align:justify;white-wrap:break-word;">${spellData.enhance || 'Nenhuma descrição.'}</p>
                            </div>` : ''}

                            ${spellData.true ? `       
                            <div class="p-4 rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                                <h4 class="font-semibold text-gray-300">Verdadeiro</h4>
                                <p class="text-gray-300 text-xs" style="text-align:justify;white-wrap:break-word;">${spellData.true || 'Nenhuma descrição.'}</p>
                            </div>` : ''}
                        </div>
                         <div class="grid grid-cols-6 gap-x-4 gap-y-1 text-xs my-2 mb-4"> 
                            <div class="text-center">PM<br>- ${spellData.manaCost || 0}</div>
                            <div class="text-center">EX<br>${spellData.execution || 'N/A'}</div>
                            <div class="text-center">AL<br>${spellData.range || 'N/A'}</div>
                            <div class="text-center">AV<br>${spellData.target || 'N/A'}</div>
                            <div class="text-center">DU<br>${spellData.duration || 'N/A'}</div>                            
                            <div class="text-center">CD<br>${spellData.resistencia || 'N/A'}</div>                            
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

   
    // Se não for modal, retorna o HTML (miniatura)
    if (!isModal) return sheetHtml;

    // --- é modal: injeta no container e adiciona listeners APÓS inserir ---
    sheetContainer.innerHTML = sheetHtml;
    sheetContainer.classList.remove('hidden');

    // Botão fechar: substitui o nó pra limpar listeners anteriores e adiciona o handler
    const closeSheetBtn = sheetContainer.querySelector('#close-spell-sheet-btn');
    if (closeSheetBtn) {
        const btn = closeSheetBtn.cloneNode(true);
        closeSheetBtn.parentNode.replaceChild(btn, closeSheetBtn);
        btn.addEventListener('click', () => {
            sheetContainer.classList.add('hidden');
            sheetContainer.innerHTML = '';
            if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
        });
    }

    // Fecha clicando no overlay (fora do card)
    const overlayHandler = (e) => {
        if (e.target === sheetContainer) {
            sheetContainer.classList.add('hidden');
            sheetContainer.innerHTML = '';
            if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
            sheetContainer.removeEventListener('click', overlayHandler);
        }
    };
    sheetContainer.addEventListener('click', overlayHandler);
}

