// local_db.js

const DB_NAME = 'rpgCreatorDB';
const DB_VERSION = 12; // Incremented version
const CARD_STORE_NAME = 'rpgCards';
const SPELL_STORE_NAME = 'rpgSpells';
const ITEM_STORE_NAME = 'rpgItems';
const ATTACK_STORE_NAME = 'rpgAttacks'; // New store name

let db;

// Helper function to show alerts (copied from navigation_manager.js logic for consistency)
function showCustomAlert(message) {
    const modalId = `custom-alert-modal-${Date.now()}`;
    const modalHtml = `
        <div id="${modalId}" class="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4" style="z-index: 99999;">
            <div class="bg-gray-800 text-white rounded-lg shadow-2xl p-6 w-full max-w-sm border border-gray-700">
                <p class="text-center text-lg mb-4">${message}</p>
                <button class="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 font-bold">OK</button>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modal = document.getElementById(modalId);
    modal.querySelector('button').addEventListener('click', () => {
        modal.remove();
    });
}

/**
 * Abre a conexão com o banco de dados IndexedDB.
 */
export function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(CARD_STORE_NAME)) {
                db.createObjectStore(CARD_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(SPELL_STORE_NAME)) {
                db.createObjectStore(SPELL_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(ITEM_STORE_NAME)) {
                db.createObjectStore(ITEM_STORE_NAME, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(ATTACK_STORE_NAME)) { // Create new store
                db.createObjectStore(ATTACK_STORE_NAME, { keyPath: 'id' });
            }
            console.log("Database setup complete.");
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log("Database opened successfully.");
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("Database error:", event.target.error);
            reject(event.target.error);
        };
    });
}

/**
 * Adiciona um novo item (card) a um armazenamento de objetos.
 * @param {string} storeName - O nome do armazenamento de objetos ('rpgCards', 'rpgSpells', 'rpgItems').
 * @param {Object} data - Os dados do item a serem salvos.
 * @returns {Promise} Uma promessa que resolve quando o item é salvo.
 */
export function saveData(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not open.");
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

/**
 * Obtém dados de um armazenamento de objetos.
 * @param {string} storeName - O nome do armazenamento de objetos.
 * @param {string} [key] - A chave do item a ser obtido. Se não for fornecida, retorna todos os itens.
 * @returns {Promise<Object|Array>} Uma promessa que resolve com o item ou um array de itens.
 */
export function getData(storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not open.");
            return;
        }
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = key ? store.get(key) : store.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            reject(event.target.error);
        };
    });
}

/**
 * Deleta um item de um armazenamento de objetos.
 * @param {string} storeName - O nome do armazenamento de objetos.
 * @param {string} id - O ID do item a ser deletado.
 * @returns {Promise} Uma promessa que resolve quando a exclusão é bem-sucedida.
 */
export function removeData(storeName, id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            reject("Database not open.");
            return;
        }
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = (event) => reject(event.target.error);
    });
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
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

/**
 * Exports the entire database to a JSON file.
 */
export async function exportDatabase() {
    if (!db) {
        console.error("Database not open.");
        return;
    }

    const exportData = {};
    const storeNames = [CARD_STORE_NAME, SPELL_STORE_NAME, ITEM_STORE_NAME, ATTACK_STORE_NAME];

    for (const storeName of storeNames) {
        const data = await getData(storeName);
        // Convert any ArrayBuffers (images) to base64 for JSON compatibility
        exportData[storeName] = data.map(item => {
            const newItem = { ...item };
            if (newItem.image instanceof ArrayBuffer) {
                newItem.image = arrayBufferToBase64(newItem.image);
            }
            if (newItem.backgroundImage instanceof ArrayBuffer) {
                newItem.backgroundImage = arrayBufferToBase64(newItem.backgroundImage);
            }
            return newItem;
        });
    }

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `farland_db_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Imports data from a JSON file into the database, overwriting existing data.
 * @param {File} file - The JSON file to import.
 */
export function importDatabase(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                if (!db) {
                    reject("Database not open.");
                    return;
                }

                const storeNames = [CARD_STORE_NAME, SPELL_STORE_NAME, ITEM_STORE_NAME, ATTACK_STORE_NAME];
                const transaction = db.transaction(storeNames, 'readwrite');

                // Clear existing stores
                for (const storeName of storeNames) {
                    const store = transaction.objectStore(storeName);
                    store.clear();
                }

                // Import new data
                for (const storeName of storeNames) {
                    if (importedData[storeName]) {
                        const store = transaction.objectStore(storeName);
                        for (let item of importedData[storeName]) {
                            // Convert base64 images back to ArrayBuffer
                            if (item.image && typeof item.image === 'string') {
                                item.image = base64ToArrayBuffer(item.image);
                            }
                            if (item.backgroundImage && typeof item.backgroundImage === 'string') {
                                item.backgroundImage = base64ToArrayBuffer(item.backgroundImage);
                            }
                            store.put(item);
                        }
                    }
                }
                
                transaction.oncomplete = () => {
                    resolve();
                };

                transaction.onerror = (event) => {
                    reject(event.target.error);
                };

            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (e) => reject(e.target.error);
        reader.readAsText(file);
    });
}

/**
 * Exports all images from the database as a single zip file.
 */
export async function exportImagesAsPng() {
    if (!db) {
        showCustomAlert("O banco de dados não está aberto.");
        return;
    }
    if (typeof JSZip === 'undefined') {
        showCustomAlert("A biblioteca de compressão de arquivos não foi carregada. Tente recarregar a página.");
        return;
    }

    showCustomAlert("Iniciando a exportação de imagens. Isso pode levar um momento...");

    const zip = new JSZip();
    const storeNames = [CARD_STORE_NAME, SPELL_STORE_NAME, ITEM_STORE_NAME, ATTACK_STORE_NAME];
    let imageCount = 0;

    // Helper to sanitize filenames
    const sanitizeFilename = (name) => name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();

    for (const storeName of storeNames) {
        const data = await getData(storeName);
        if (data && data.length > 0) {
            for (const item of data) {
                const baseName = sanitizeFilename(item.name || item.title || item.id);

                // Process main image
                if (item.image instanceof ArrayBuffer) {
                    const extension = item.imageMimeType ? item.imageMimeType.split('/')[1] : 'png';
                    const filename = `${storeName}/${baseName}_image.${extension}`;
                    zip.file(filename, item.image);
                    imageCount++;
                }
                
                // Process background image (only for cards)
                if (item.backgroundImage instanceof ArrayBuffer) {
                    const extension = item.backgroundMimeType ? item.backgroundMimeType.split('/')[1] : 'png';
                    const filename = `${storeName}/${baseName}_background.${extension}`;
                    zip.file(filename, item.backgroundImage);
                    imageCount++;
                }
            }
        }
    }

    if (imageCount === 0) {
        showCustomAlert("Nenhuma imagem encontrada no banco de dados para exportar.");
        return;
    }

    try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `farland_images_backup_${new Date().toISOString().slice(0, 10)}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Erro ao gerar o arquivo zip:", error);
        showCustomAlert("Ocorreu um erro ao gerar o arquivo zip.");
    }
}
