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

                resolve(`rgb(${avgR}, ${avgG}, ${avgB})`);
            } catch (e) {
                reject(e);
            }
        };

        img.onerror = (e) => reject(e);
    });
}

export async function renderFullSpellSheet(spellData, isModal) {
    const sheetContainer = document.getElementById('spell-sheet-container');
    if (!sheetContainer) return;

    // Proporção base 16x10
    const aspectRatio = 16 / 10;

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

    // Obter as classes de ícones para os atributos de combate
    const attributeIcons = {
        'vida': 'fa-solid fa-heart text-red-500',
        'mana': 'fa-solid fa-fire text-blue-500',
        'armadura': 'fa-solid fa-shield-halved text-gray-400',
        'esquiva': 'fa-solid fa-person-running text-teal-400',
        'bloqueio': 'fa-solid fa-hand-fist text-orange-400',
        'deslocamento': 'fa-solid fa-shoe-prints text-lime-400',
    };

    // Gera a seção de "Aumento de Status" com ícones e valores
    // Adiciona o filtro para verificar se o valor é maior que 0, não é null ou undefined
    const statusBoostHtml = Object.entries(spellData.aumentos || {})
        .filter(([key, value]) => key !== 'pericias' && value > 0)
        .map(([key, value]) => {
            const iconClass = attributeIcons[key] || '';
            const valueText = value > 0 ? `+${value}` : `${value}`; // Adiciona '+' para valores positivos
            
            // Verifica se a chave corresponde a um dos atributos de combate
            const isCombatAttribute = ['vida', 'mana', 'armadura', 'esquiva', 'bloqueio', 'deslocamento'].includes(key);

            if (isCombatAttribute) {
                return `
                <div class="flex items-center gap-2">
                    <i class="${iconClass}"></i>
                    <p class="text-sm text-gray-200"><span class="font-bold">${valueText}</span> ${key.charAt(0).toUpperCase() + key.slice(1)}</p>
                </div>
                `;
            } else {
                return `
                <div class="flex items-center gap-2">
                    <p class="text-sm text-gray-200"><span class="font-bold">${valueText}</span> ${key.charAt(0).toUpperCase() + key.slice(1)}</p>
                </div>
                `;
            }
        })
        .join('');

        var scale = isModal? 1 : .17;
        var origin = isModal?  "" : "transform-origin: top left";
    const sheetHtml = `
        <button id="close-spell-sheet-btn" class="absolute top-4 right-4 bg-red-600 hover:text-white z-10 thumb-btn" style="display:${isModal? "block": "none"}"><i class="fa-solid fa-xmark"></i></button>
        <div id="spell-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; border: 1px solid ${predominantColor}; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10">
                <h3 class="text-2xl font-bold">${spellData.name}</h3>
            </div>

            ${(spellData.aumentos?.vida > 0) ? `
                <div class="absolute top-4 right-2 p-2 rounded-full text-center">
                    <i class="fas fa-heart text-red-500 text-5xl"></i>
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                        <span>+ ${spellData.aumentos.vida}</span>
                    </div>
                </div>
            ` : ''}

            ${(spellData.aumentos?.mana > 0) ? `
                <div class="absolute top-4 left-2 p-2 rounded-full text-center">
                    <div class="icon-container mana-icon-container">
                        <i class="fas fa-fire text-blue-500 text-5xl"></i>
                        <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                            <span>+ ${spellData.aumentos.mana}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="absolute top-20 right-4 p-2 grid grid-row-8 md:grid-cols-10 gap-2 mb-4" style="background: #0000008f; border-radius: 12px;">
                ${(spellData.aumentos?.armadura > 0) ? `<div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/spartan.png); background-size: contain;">${spellData.aumentos.armadura}</div>` : ''}
                ${(spellData.aumentos?.esquiva > 0) ? `<div id="espada-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/paper-plane.png); background-size: contain;">${spellData.aumentos.esquiva}</div>` : ''}
                ${(spellData.aumentos?.bloqueio > 0) ? `<div id="escudo-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/token.png); background-size: contain;">${spellData.aumentos.bloqueio}</div>` : ''}
                ${(spellData.aumentos?.deslocamento > 0) ? `<div id="bota-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/boot.png); background-size: contain;">${spellData.aumentos.deslocamento}</div>` : ''}
                
                ${(spellData.aumentos?.agilidade > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">AGI<span>${spellData.aumentos.agilidade}</span></div><hr style="width: 100%;">` : ''}
                ${(spellData.aumentos?.carisma > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">CAR<span>${spellData.aumentos.carisma}</span></div><hr style="width: 100%;">` : ''}
                ${(spellData.aumentos?.forca > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">FOR<span>${spellData.aumentos.forca}</span></div><hr style="width: 100%;">` : ''}
                ${(spellData.aumentos?.sabedoria > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">SAB<span>${spellData.aumentos.sabedoria}</span></div><hr style="width: 100%;">` : ''}
                ${(spellData.aumentos?.vigor > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">VIG<span>${spellData.aumentos.vigor}</span></div>` : ''}
            </div>

            <div class="absolute bottom-0 w-full">               
                <div class="w-full text-sm text-left" style="display: flex; flex-direction: row; gap: 12px;">
                    <div class="rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div class="scrollable-content text-sm text-left" style="display: flex; flex-direction: row; overflow-y: scroll;gap: 12px; scroll-snap-type: x mandatory;">
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
                         <div class="grid grid-cols-5 gap-x-4 gap-y-1 text-xs my-2 mb-4">
                            <div class="text-center">EX<br>${spellData.execution || 0}</div>
                            <div class="text-center">AL<br>${spellData.range || 0}</div>
                            <div class="text-center">AV<br>${spellData.target || 0}</div>
                            <div class="text-center">DU<br>${spellData.duration || 0}m</div>                            
                            <div class="text-center">CD<br>${spellData.resistencia}</div>                            
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


