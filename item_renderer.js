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
                const data = ctx.getImageData(0, 0, img.width, img.height).data;
                let r = 0, g = 0, b = 0, count = 0;
                for (let i = 0; i < data.length; i += 20) { // amostragem de pixels
                    r += data[i];
                    g += data[i + 1];
                    b += data[i + 2];
                    count++;
                }
                // Retorna a cor com um canal alfa para o painel de fundo
                resolve(`rgba(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)}, 30%)`);
            } catch (e) { reject(e); }
        };
        img.onerror = reject;
    });
}


export async function renderFullItemSheet(itemData, isModal, aspect) {
    const sheetContainer = document.getElementById('item-sheet-container');
    if (!sheetContainer) return '';

    const aspectRatio = aspect || 16 / 10;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalWidth;
    let finalHeight;

    if ((windowWidth * aspectRatio) > windowHeight) {
        finalHeight = windowHeight * 0.9;
        finalWidth = finalHeight / aspectRatio;
    } else {
        finalWidth = windowWidth * 0.9;
        finalHeight = finalWidth * aspectRatio;
    }

    let createdObjectUrl = null;
    let imageUrl = 'https://placehold.co/400x400/a0522d/ffffff?text=Item';
    if (itemData.image) {
        createdObjectUrl = URL.createObjectURL(bufferToBlob(itemData.image, itemData.imageMimeType));
        imageUrl = createdObjectUrl;
    }

    const predominantColor = await getPredominantColor(imageUrl).catch(() => 'rgba(160, 82, 45, 0.9)');
    
    const scale = isModal ? 1 : .24;
    const origin = isModal ? "" : "transform-origin: top left";
    const uniqueId = `item-${Date.now()}`;

    let detailsHtml = '';
    const details = [
        { label: 'TP', title: 'Tipo', value: itemData.type },
        { label: 'DN', title: 'Dano', value: itemData.damage },
        { label: 'CG', title: 'Carga', value: itemData.charge },
        { label: 'PR', title: 'Pré-requisito', value: itemData.prerequisite }
    ];

    if (details.some(d => d.value)) {
        detailsHtml = `
            <div class="grid grid-cols-4 gap-x-2 text-xs my-2 text-center text-gray-200">
                ${details.map(d => `
                    <div>
                        <p class="font-bold tracking-wider">${d.label}</p>
                        <p class="text-gray-300 truncate" title="${d.value || d.title}">${d.value || '-'}</p>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let aumentosHtml = '';
    const hasAumentos = itemData.aumentos && itemData.aumentos.length > 0;
    if (hasAumentos) {
        const aumentosFixos = itemData.aumentos.filter(a => a.tipo === 'fixo');
        const aumentosTemporarios = itemData.aumentos.filter(a => a.tipo === 'temporario');

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

    const sheetHtml = `
        <button id="close-item-sheet-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:text-white z-20 thumb-btn" style="display:${isModal? "block": "none"}"><i class="fa-solid fa-xmark"></i></button>
        <div id="item-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="mt-auto p-4 md:p-6 w-full text-left absolute bottom-0" style="background-color: ${predominantColor};">
                <div class="sheet-card-text-panel">
                    <div class="flex justify-between items-start">
                        <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-white pr-2">${itemData.name}</h2>
                    </div>
                    
                    ${detailsHtml}

                    <div class="sheet-card-divider"></div>

                    <div class="space-y-3 max-h-40 overflow-y-auto pr-2">
                        ${itemData.effect ? `
                            <div class="pt-2">
                                <h3 class="text-sm font-semibold flex items-center gap-2">Descrição</h3>
                                <p class="text-gray-300 text-xs leading-relaxed mt-1 pl-6" style="white-space:pre-line;">${itemData.effect}</p>
                            </div>
                        ` : ''}
                        
                        ${aumentosHtml}
                    </div>
                </div>
            </div>            
        </div>
    `;

    if (!isModal) {
        return sheetHtml;
    }

    sheetContainer.innerHTML = sheetHtml;
    sheetContainer.classList.remove('hidden');

    const closeSheet = () => {
        sheetContainer.classList.add('hidden');
        sheetContainer.innerHTML = '';
        if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };

    const closeBtn = sheetContainer.querySelector(`#close-item-sheet-btn-${uniqueId}`);
    if (closeBtn) {
        const newBtn = closeBtn.cloneNode(true);
        closeBtn.parentNode.replaceChild(newBtn, closeBtn);
        newBtn.addEventListener('click', closeSheet);
    }
    
    const overlayHandler = (e) => {
        if (e.target === sheetContainer) {
            closeSheet();
            sheetContainer.removeEventListener('click', overlayHandler);
        }
    };
    sheetContainer.addEventListener('click', overlayHandler);
}

