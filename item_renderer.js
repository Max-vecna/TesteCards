function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

export async function renderFullItemSheet(itemData, isModal, aspect) {
    const sheetContainer = document.getElementById('item-sheet-container');
    if (!sheetContainer) return '';

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

    let createdObjectUrl = null;
    let imageUrl = 'https://placehold.co/400x400/a0522d/ffffff?text=Item';
    if (itemData.image) {
        createdObjectUrl = URL.createObjectURL(bufferToBlob(itemData.image, itemData.imageMimeType));
        imageUrl = createdObjectUrl;
    }

    const predominantColor = itemData.predominantColor || '#a0522d';
    
    const scale = isModal ? 1 : .17;
    const origin = isModal ? "" : "transform-origin: top left";

      const sheetHtml = `
          <button id="close-item-sheet-btn" class="absolute top-4 right-4 bg-red-600 hover:text-white z-10 thumb-btn" style="display:${isModal? "block": "none"}"><i class="fa-solid fa-xmark"></i></button>
        <div id="item-sheet" class="w-full h-full rounded-lg shadow-2xl overflow-hidden relative text-white" style="${origin}; background-image: url('${imageUrl}'); background-size: cover; background-position: center; border: 1px solid ${predominantColor}; box-shadow: 0 0 20px ${predominantColor}; width: ${finalWidth}px; height: ${finalHeight}px; transform: scale(${scale}); margin: 0 auto;">        
            <div class="w-full h-full" style="background: linear-gradient(-180deg, #000000, hwb(0deg 0% 100% / 50%), transparent, #0000008f, #0000008f, #000000a4);"></div>
            
            <div class="absolute top-4 left-1/2 -translate-x-1/2 text-center z-10 w-full flex-max">
                <h3 class="text-2xl font-bold" style="color: ${predominantColor}">${itemData.name}</h3>
                <div class="rpg-card-title-divider" style="background: linear-gradient(to right, transparent, ${predominantColor}, transparent); width: 60%"> </div>
            </div>

            ${(itemData.aumentos?.vida > 0) ? `
                <div class="absolute top-4 right-2 p-2 rounded-full text-center">
                    <i class="fas fa-heart text-red-500 text-5xl"></i>
                    <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                        <span>+ ${itemData.aumentos.vida}</span>
                    </div>
                </div>
            ` : ''}

            ${(itemData.aumentos?.mana > 0) ? `
                <div class="absolute top-4 left-2 p-2 rounded-full text-center">
                    <div class="icon-container mana-icon-container">
                        <i class="fas fa-fire text-blue-500 text-5xl"></i>
                        <div class="absolute inset-0 flex flex-col items-center justify-center font-bold text-white text-xs">
                            <span>+ ${itemData.aumentos.mana}</span>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <div class="absolute top-20 right-4 p-2 grid grid-row-8 md:grid-cols-10 gap-2 mb-4" style="background: #0000008f; border-radius: 12px;">
                ${(itemData.aumentos?.armadura > 0) ? `<div id="elmo-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/spartan.png); background-size: contain;">${itemData.aumentos.armadura}</div>` : ''}
                ${(itemData.aumentos?.esquiva > 0) ? `<div id="espada-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/paper-plane.png); background-size: contain;">${itemData.aumentos.esquiva}</div>` : ''}
                ${(itemData.aumentos?.bloqueio > 0) ? `<div id="escudo-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/token.png); background-size: contain;">${itemData.aumentos.bloqueio}</div>` : ''}
                ${(itemData.aumentos?.deslocamento > 0) ? `<div id="bota-icon" class="w-8 h-8 mx-auto iconMagic" style="background: url(icons/boot.png); background-size: contain;">${itemData.aumentos.deslocamento}</div>` : ''}
                
                ${(itemData.aumentos?.agilidade > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">AGI<span>${itemData.aumentos.agilidade}</span></div><hr style="width: 100%;">` : ''}
                ${(itemData.aumentos?.carisma > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">CAR<span>${itemData.aumentos.carisma}</span></div><hr style="width: 100%;">` : ''}
                ${(itemData.aumentos?.forca > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">FOR<span>${itemData.aumentos.forca}</span></div><hr style="width: 100%;">` : ''}
                ${(itemData.aumentos?.sabedoria > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">SAB<span>${itemData.aumentos.sabedoria}</span></div><hr style="width: 100%;">` : ''}
                ${(itemData.aumentos?.vigor > 0) ? `<div class="w-8 h-8 mx-auto iconMagic mb-2 mt-2">VIG<span>${itemData.aumentos.vigor}</span></div>` : ''}
            </div>

            <div class="absolute bottom-0 w-full">               
                <div class="w-full text-sm text-left" style="display: flex; flex-direction: row; gap: 12px;">
                    <div class="rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                        <div class="scrollable-content text-sm text-left" style="display: flex; flex-direction: row; overflow-y: scroll;gap: 12px; scroll-snap-type: x mandatory;">
                            ${itemData.effect ? `       
                            <div class="p-4 rounded-3xl w-full" style="scroll-snap-align: start;flex-shrink: 0;min-width: 100%; position: relative; z-index: 1; overflow-y: visible; display: flex; flex-direction: column; justify-content: flex-end;">
                                <h4 class="font-semibold text-gray-300">Descrição</h4>
                                <p class="text-gray-300 text-xs" style="text-align:justify;white-space:pre-line;overflow-wrap:break-word;">${itemData.effect || 'Nenhuma descrição.'}</p>
                            </div>` : ''}
                        </div>
                         <div class="grid grid-cols-5 gap-x-4 gap-y-1 text-xs my-2 mb-4">
                            <div class="text-center">EX<br>${itemData.execution || 0}</div>
                            <div class="text-center">AL<br>${itemData.range || 0}</div>
                            <div class="text-center">AV<br>${itemData.target || 0}</div>
                            <div class="text-center">DU<br>${itemData.duration || 0}m</div>                            
                            <div class="text-center">CD<br>${itemData.resistencia}</div>                            
                        </div>
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

    const closeBtn = sheetContainer.querySelector('#close-item-sheet-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeSheet);
    
    sheetContainer.addEventListener('click', (e) => {
        if (e.target === sheetContainer) closeSheet();
    });
}

