const DATABASE_NAME = 'vehicle-parking-durable-storage';
const STORE_NAME = 'attachments';

export interface StoredAttachment { id: string; name: string; mimeType: string; dataUrl: string; savedAt: string }

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Unable to open offline attachment storage.'));
});

export const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error ?? new Error('Unable to read attachment.'));
  reader.readAsDataURL(blob);
});

export async function saveAttachment(id: string, file: Blob, name: string): Promise<StoredAttachment> {
  const record: StoredAttachment = { id, name, mimeType: file.type || 'application/octet-stream', dataUrl: await blobToDataUrl(file), savedAt: new Date().toISOString() };
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(record);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Unable to persist attachment.'));
  });
  database.close();
  return record;
}


export async function getAttachment(id: string): Promise<StoredAttachment | undefined> {
  const database = await openDatabase();
  const record = await new Promise<StoredAttachment | undefined>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredAttachment | undefined);
    request.onerror = () => reject(request.error ?? new Error('Unable to retrieve attachment.'));
  });
  database.close();
  return record;
}