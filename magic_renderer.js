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

    let imageUrl;
    let createdObjectUrl = null;
    if (spellData.image) {
        createdObjectUrl = URL.createObjectURL(bufferToBlob(spellData.image, spellData.imageMimeType));
        imageUrl = createdObjectUrl;
    } else {
        imageUrl = 'https://placehold.co/400x400/00796B/B2DFDB?text=Magia';
    }
    sheetContainer.style.backgroundImage = `url('${imageUrl}')`;
    const predominantColor = await getPredominantColor(imageUrl).catch(e => {
        console.error("Erro ao extrair cor média:", e);
        return '#4a5568';
    });

    var scale = isModal? 1 : .24;
    var origin = isModal?  "" : "transform-origin: top left";
    
    // Processar aumentos
    let aumentosHtml = '';
    if (spellData.aumentos && spellData.aumentos.length > 0) {
        const aumentosFixos = spellData.aumentos.filter(a => a.tipo === 'fixo');
        const aumentosTemporarios = spellData.aumentos.filter(a => a.tipo === 'temporario');

        const createList = (list, title, color) => {
            if (list.length === 0) return '';
            const items = list.map(a => `<li><span class="font-semibold">${a.nome}:</span> ${a.valor > 0 ? '+' : ''}${a.valor}</li>`).join('');
            return `<div class="mb-2"><h5 class="font-bold text-sm ${color}">${title}</h5><ul class="list-disc list-inside text-xs">${items}</ul></div>`;
        };
        
        aumentosHtml = `
            <div class="pt-2">
                <h3 class="text-sm font-semibold flex items-center gap-2">Aumentos</h3>
                <div class="text-gray-300 text-xs leading-relaxed mt-1 pl-6 space-y-1">
                    ${createList(aumentosFixos, 'Bônus Fixos', 'text-green-300')}
                    ${createList(aumentosTemporarios, 'Bônus Temporários', 'text-blue-300')}
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

    const circleHtml = spellData.circle ? `<span class="text-lg font-normal text-gray-300">${spellData.circle}º Círculo</span>` : '';

    const sheetHtml = `
        <button id="close-spell-sheet-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:text-white z-20 thumb-btn" style="display:${isModal? "block": "none"};"><i class="fa-solid fa-xmark"></i></button>
        <div id="spell-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="mt-auto p-4 md:p-6 w-full text-left absolute bottom-0" style="background: ${predominantColor}">
                <div class="sheet-card-text-panel">
                    <p class="text-sm font-medium">${circleHtml} - ${spellData.manaCost} PM</p>
                    <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-white">${spellData.name}</h2>
                
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

   
    if (!isModal) return sheetHtml;

    sheetContainer.innerHTML = sheetHtml;
    sheetContainer.classList.remove('hidden');

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
