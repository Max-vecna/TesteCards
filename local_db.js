// local_db.js

const DB_NAME = 'rpgCreatorDB';
const DB_VERSION = 11;
const CARD_STORE_NAME = 'rpgCards';
const SPELL_STORE_NAME = 'rpgSpells';
const ITEM_STORE_NAME = 'rpgItems';

let db;

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
