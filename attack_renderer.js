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
                 resolve({
                    color30: `rgba(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)}, 30%)`,
                    color100: `rgba(${Math.floor(r/count)}, ${Math.floor(g/count)}, ${Math.floor(b/count)}, 100%)`
                });
            } catch (e) { reject(e); }
        };
        img.onerror = reject;
    });
}


export async function renderFullAttackSheet(attackData, isModal, aspect) {
    const sheetContainer = document.getElementById('attack-sheet-container');
    if (!sheetContainer) return '';

    const aspectRatio = aspect || 16 / 10;

    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let finalWidth, finalHeight;

    if ((windowWidth * aspectRatio) > windowHeight) {
        finalHeight = windowHeight * 0.9;
        finalWidth = finalHeight / aspectRatio;
    } else {
        finalWidth = windowWidth * 0.9;
        finalHeight = finalWidth * aspectRatio;
    }

    let createdObjectUrl = null;
    let imageUrl = 'https://placehold.co/400x400/b91c1c/fecaca?text=Ataque';
    if (attackData.image) {
        createdObjectUrl = URL.createObjectURL(bufferToBlob(attackData.image, attackData.imageMimeType));
        imageUrl = createdObjectUrl;
    }
    
    const predominantColor = await getPredominantColor(imageUrl).catch(() => ({ color30: 'rgba(153, 27, 27, 0.3)', color100: 'rgb(153, 27, 27)' }));
    
    const origin = isModal ? "" : "transform-origin: top left";
    const transformProp = isModal ? '' : `transform: scale(0.22);`;
    const uniqueId = `attack-${Date.now()}`;

    const sheetHtml = `
        <button id="close-attack-sheet-btn-${uniqueId}" class="absolute top-4 right-4 bg-red-600 hover:text-white z-20 thumb-btn" style="display:${isModal? "block": "none"}"><i class="fa-solid fa-xmark"></i></button>
        <div id="attack-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; box-shadow: 0 0 20px ${predominantColor.color100}; width: ${finalWidth}px; height: ${finalHeight}px; ${transformProp} margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000a4, transparent, transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="mt-auto p-4 md:p-6 w-full text-left absolute bottom-0" style="background-color: ${predominantColor.color30};">
                <div class="sheet-card-text-panel">
                    <div class="flex justify-between items-start">
                        <h2 class="text-2xl md:text-3xl font-bold tracking-tight text-white pr-2">${attackData.name}</h2>
                    </div>
                    
                    <div class="sheet-card-divider"></div>

                    <div class="space-y-3 max-h-40 overflow-y-auto pr-2">
                        ${attackData.description ? `
                            <div class="pt-2">
                                <h3 class="text-sm font-semibold flex items-center gap-2">Descrição</h3>
                                <p class="text-gray-300 text-xs leading-relaxed mt-1 pl-6" style="white-space:pre-line;">${attackData.description}</p>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>            
        </div>
    `;

    if (!isModal) {
        return sheetHtml;
    }

    sheetContainer.innerHTML = sheetHtml;
    sheetContainer.style.backgroundImage = `url('${imageUrl}')`;
    sheetContainer.style.backgroundSize = 'cover';
    sheetContainer.style.backgroundPosition = 'center';
    sheetContainer.classList.remove('hidden');
    setTimeout(() => sheetContainer.classList.add('visible'), 10);

    const closeSheet = () => {
        sheetContainer.classList.remove('visible');
        const handler = () => {
            sheetContainer.classList.add('hidden');
            sheetContainer.innerHTML = '';
            if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
            sheetContainer.removeEventListener('transitionend', handler);
        };
        sheetContainer.addEventListener('transitionend', handler);
    };

    const closeBtn = sheetContainer.querySelector(`#close-attack-sheet-btn-${uniqueId}`);
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
