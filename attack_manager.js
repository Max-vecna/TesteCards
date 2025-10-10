import { saveData, getData, removeData } from './local_db.js';
import { populateCharacterSelect } from './character_manager.js';

let currentEditingAttackId = null;
let attackImageFile = null;

function showImagePreview(element, url) {
    if (url) {
        element.src = url;
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsArrayBuffer(file);
    });
}

function bufferToBlob(buffer, mimeType) {
    return new Blob([buffer], { type: mimeType });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
}

export async function saveAttackCard(attackForm) {
    const attackNameInput = document.getElementById('attackName');
    const attackDescriptionInput = document.getElementById('attackDescription');
    const attackCharacterOwnerInput = document.getElementById('attackCharacterOwner');

    const imageBuffer = attackImageFile ? await readFileAsArrayBuffer(attackImageFile) : null;
    
    let attackData;
    if (currentEditingAttackId) {
        attackData = await getData('rpgAttacks', currentEditingAttackId);
        Object.assign(attackData, {
            name: attackNameInput.value,
            description: attackDescriptionInput.value,
            characterId: attackCharacterOwnerInput.value,
            image: imageBuffer || attackData.image,
            imageMimeType: attackImageFile ? attackImageFile.type : attackData.imageMimeType,
        });
    } else {
        attackData = {
            id: Date.now().toString(),
            name: attackNameInput.value,
            description: attackDescriptionInput.value,
            characterId: attackCharacterOwnerInput.value,
            image: imageBuffer,
            imageMimeType: attackImageFile ? attackImageFile.type : null,
        };
    }

    await saveData('rpgAttacks', attackData);
    attackForm.reset();
    attackImageFile = null;
    showImagePreview(document.getElementById('attackImagePreview'), null);
    currentEditingAttackId = null;
}

export async function editAttack(attackId) {
    const attackData = await getData('rpgAttacks', attackId);
    if (!attackData) return;

    currentEditingAttackId = attackId;
    document.getElementById('attackName').value = attackData.name;
    document.getElementById('attackDescription').value = attackData.description;
    
    await populateCharacterSelect('attackCharacterOwner');
    document.getElementById('attackCharacterOwner').value = attackData.characterId || '';

    const attackImagePreview = document.getElementById('attackImagePreview');
    if (attackData.image) {
        const imageBlob = bufferToBlob(attackData.image, attackData.imageMimeType);
        showImagePreview(attackImagePreview, URL.createObjectURL(imageBlob));
    } else {
        showImagePreview(attackImagePreview, null);
    }
}

export async function removeAttack(attackId) {
    await removeData('rpgAttacks', attackId);
}

export async function exportAttack(attackId) {
    const attackData = await getData('rpgAttacks', attackId);
    if (attackData) {
        const dataToExport = { ...attackData };
        if (dataToExport.image) dataToExport.image = arrayBufferToBase64(dataToExport.image);
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(attackData.name || 'attack').replace(/\s+/g, '_')}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

export async function importAttack(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedAttack = JSON.parse(e.target.result);
                importedAttack.id = Date.now().toString(); 
                if (importedAttack.image) {
                    importedAttack.image = base64ToArrayBuffer(importedAttack.image);
                }
                await saveData('rpgAttacks', importedAttack);
                resolve(importedAttack);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

document.getElementById('attackImageUpload').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        attackImageFile = file;
        showImagePreview(document.getElementById('attackImagePreview'), URL.createObjectURL(file));
    }
});
