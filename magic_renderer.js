function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

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

                resolve(`rgb(${avgR}, ${avgG}, ${avgB}, 30%)`);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = (e) => reject(e);
    });
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

    // Extrai a cor média da imagem de fundo
    const predominantColor = await getPredominantColor(imageUrl).catch(e => {
        console.error("Erro ao extrair cor média:", e);
        return '#4a5568'; // Cor de fallback
    });

    var scale = isModal? 1 : .24;
    var origin = isModal?  "" : "transform-origin: top left";
    
    const aumentos = spellData.aumentos || {};
    let aumentosHtml = '';

    const energiasItems = [];
    if (aumentos.vida > 0) energiasItems.push(`Vida +${aumentos.vida}`);
    if (aumentos.mana > 0) energiasItems.push(`Mana +${aumentos.mana}`);

    const combateItems = [];
    if (aumentos.armadura > 0) combateItems.push(`Armadura +${aumentos.armadura}`);
    if (aumentos.esquiva > 0) combateItems.push(`Esquiva +${aumentos.esquiva}`);
    if (aumentos.bloqueio > 0) combateItems.push(`Bloqueio +${aumentos.bloqueio}`);
    if (aumentos.deslocamento > 0) combateItems.push(`Deslocamento +${aumentos.deslocamento}m`);

    const atributosItems = [];
    if (aumentos.agilidade > 0) atributosItems.push(`Agilidade +${aumentos.agilidade}`);
    if (aumentos.carisma > 0) atributosItems.push(`Carisma +${aumentos.carisma}`);
    if (aumentos.forca > 0) atributosItems.push(`Força +${aumentos.forca}`);
    if (aumentos.inteligencia > 0) atributosItems.push(`Inteligência +${aumentos.inteligencia}`);
    if (aumentos.sabedoria > 0) atributosItems.push(`Sabedoria +${aumentos.sabedoria}`);
    if (aumentos.vigor > 0) atributosItems.push(`Vigor +${aumentos.vigor}`);

    const periciasItems = [];
    if (Array.isArray(aumentos.pericias) && aumentos.pericias.length > 0) {
        aumentos.pericias.forEach(p => {
            if (p.value > 0) {
                periciasItems.push(`${p.name} +${p.value}`);
            }
        });
    }

    const hasAumentos = energiasItems.length > 0 || combateItems.length > 0 || atributosItems.length > 0 || periciasItems.length > 0;

    if (hasAumentos) {
        aumentosHtml = `
            <div class="pt-2">
                <h3 class="text-sm font-semibold flex items-center gap-2">Aumentos</h3>
                <div class="text-gray-300 text-xs leading-relaxed mt-1 pl-6 space-y-1">
                    ${energiasItems.length > 0 ? `<div><strong class="font-semibold text-gray-200">Energias:</strong> ${energiasItems.join(', ')}</div>` : ''}
                    ${combateItems.length > 0 ? `<div><strong class="font-semibold text-gray-200">Status de Combate:</strong> ${combateItems.join(', ')}</div>` : ''}
                    ${atributosItems.length > 0 ? `<div><strong class="font-semibold text-gray-200">Atributos:</strong> ${atributosItems.join(', ')}</div>` : ''}
                    ${periciasItems.length > 0 ? `<div><strong class="font-semibold text-gray-200">Perícias:</strong> ${periciasItems.join(', ')}</div>` : ''}
                </div>
            </div>
        `;
    }

    const uniqueId = `spell-${Date.now()}`;
    
    const statsHtml = `
        <div class="grid grid-cols-5 gap-x-2 text-xs my-2 text-center text-gray-200">
            <div>
                <p class="font-bold tracking-wider">EX</p>
                <p class="text-gray-300 truncate" title="${spellData.execution || '-'}">${spellData.execution || '-'}</p>
            </div>
            <div>
                <p class="font-bold tracking-wider">AL</p>
                <p class="text-gray-300 truncate" title="${spellData.range || '-'}">${spellData.range || '-'}</p>
            </div>
            <div>
                <p class="font-bold tracking-wider">AV</p>
                <p class="text-gray-300 truncate" title="${spellData.target || '-'}">${spellData.target || '-'}</p>
            </div>
            <div>
                <p class="font-bold tracking-wider">DU</p>
                <p class="text-gray-300 truncate" title="${spellData.duration || '-'}">${spellData.duration || '-'}</p>
            </div>
            <div>
                <p class="font-bold tracking-wider">CD</p>
                <p class="text-gray-300 truncate" title="${spellData.resistencia || '-'}">${spellData.resistencia || '-'}</p>
            </div>
        </div>
    `;

    const sheetHtml = `
        <button id="close-spell-sheet-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:text-white z-20 thumb-btn" style="display:${isModal? "block": "none"};"><i class="fa-solid fa-xmark"></i></button>
        <div id="spell-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="mt-auto p-4 md:p-6 w-full text-left absolute bottom-0" style="background: ${predominantColor}">
                <div class="sheet-card-text-panel">
                    <div class="flex justify-between items-start">
                        <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-white pr-2">${spellData.name}</h2>
                        <span class="text-sm text-center font-medium bg-black/20 px-2 py-1 rounded whitespace-nowrap">${spellData.manaCost} PM</span>
                    </div>
                    <div class="sheet-card-divider"></div>
                    ${statsHtml}
                    <div class="space-y-3 max-h-32 overflow-y-auto pr-2">
                        ${spellData.description ? `
                            <div class="pt-2">
                                <h3 class="text-sm font-semibold flex items-center gap-2">Descrição</h3>
                                <p class="text-gray-300 text-xs leading-relaxed mt-1 pl-6">${spellData.description || 'Nenhuma descrição.'}</p>
                            </div>
                        ` : ''}
                        ${(spellData.enhance && spellData.type !== 'habilidade') ? `
                            <div class="pt-2">
                                <h3 class="text-sm font-semibold flex items-center gap-2">Aprimorar</h3>
                                <p class="text-gray-300 text-xs leading-relaxed mt-1 pl-6">${spellData.enhance || 'Nenhuma descrição.'}</p>
                            </div>
                        ` : ''}
                        ${(spellData.true && spellData.type !== 'habilidade') ? `
                            <div class="pt-2">
                                <h3 class="text-sm font-semibold flex items-center gap-2">Verdadeiro</h3>
                                <p class="text-gray-300 text-xs leading-relaxed mt-1 pl-6">${spellData.true || 'Nenhuma descrição.'}</p>
                            </div>
                        ` : ''}
                        ${aumentosHtml}
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
    const closeSheetBtn = sheetContainer.querySelector(`#close-spell-sheet-btn-${uniqueId}`);
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

