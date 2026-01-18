// Model Persistence Layer using IndexedDB and localStorage

class ModelStorage {
  constructor(dbName = 'FraudDetectionDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  // Initialize IndexedDB
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // Save trained model
  async saveModel(model, metadata) {
    if (!this.db) await this.init();

    const modelData = {
      id: `model_${Date.now()}`,
      model: JSON.stringify(model),
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        version: this.version
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const request = store.put(modelData);

      request.onsuccess = () => {
        // Also save as current active model
        this.setActiveModel(modelData.id);
        resolve(modelData.id);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Load model by ID
  async loadModel(modelId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(modelId);

      request.onsuccess = () => {
        if (request.result) {
          const modelData = {
            ...request.result,
            model: JSON.parse(request.result.model)
          };
          resolve(modelData);
        } else {
          reject(new Error('Model not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get active model
  async getActiveModel() {
    const activeModelId = localStorage.getItem('activeModelId');
    if (!activeModelId) {
      throw new Error('No active model set');
    }
    return this.loadModel(activeModelId);
  }

  // Set active model
  setActiveModel(modelId) {
    localStorage.setItem('activeModelId', modelId);
  }

  // List all saved models
  async listModels() {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.getAll();

      request.onsuccess = () => {
        const models = request.result.map(m => ({
          id: m.id,
          metadata: m.metadata
        }));
        resolve(models);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Delete model
  async deleteModel(modelId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      const request = store.delete(modelId);

      request.onsuccess = () => {
        // Clear active model if it was deleted
        if (localStorage.getItem('activeModelId') === modelId) {
          localStorage.removeItem('activeModelId');
        }
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Save dataset
  async saveDataset(data, metadata) {
    if (!this.db) await this.init();

    const datasetData = {
      id: `dataset_${Date.now()}`,
      data: JSON.stringify(data),
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString()
      }
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const request = store.put(datasetData);

      request.onsuccess = () => resolve(datasetData.id);
      request.onerror = () => reject(request.error);
    });
  }

  // Load dataset
  async loadDataset(datasetId) {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['datasets'], 'readonly');
      const store = transaction.objectStore('datasets');
      const request = store.get(datasetId);

      request.onsuccess = () => {
        if (request.result) {
          const datasetData = {
            ...request.result,
            data: JSON.parse(request.result.data)
          };
          resolve(datasetData);
        } else {
          reject(new Error('Dataset not found'));
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Export model to file
  async exportModel(modelId) {
    const modelData = await this.loadModel(modelId);
    const blob = new Blob([JSON.stringify(modelData, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fraud_model_${modelId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Import model from file
  async importModel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const modelData = JSON.parse(e.target.result);
          const newId = `model_${Date.now()}`;
          modelData.id = newId;
          
          const transaction = this.db.transaction(['models'], 'readwrite');
          const store = transaction.objectStore('models');
          const request = store.put(modelData);

          request.onsuccess = () => resolve(newId);
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  // Clear all data
  async clearAll() {
    if (!this.db) await this.init();

    const stores = ['models', 'datasets', 'metadata'];
    const promises = stores.map(storeName => {
      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
    localStorage.removeItem('activeModelId');
  }

  // Get storage usage
  async getStorageInfo() {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage,
        quota: estimate.quota,
        percentUsed: ((estimate.usage / estimate.quota) * 100).toFixed(2)
      };
    }
    return null;
  }
}

// LocalStorage fallback for smaller data
class LocalStorageBackup {
  static saveModel(modelId, model, metadata) {
    try {
      const data = {
        model: model,
        metadata: metadata,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(`fraud_model_${modelId}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('LocalStorage save failed:', error);
      return false;
    }
  }

  static loadModel(modelId) {
    try {
      const data = localStorage.getItem(`fraud_model_${modelId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('LocalStorage load failed:', error);
      return null;
    }
  }

  static listModels() {
    const models = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('fraud_model_')) {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          models.push({
            id: key.replace('fraud_model_', ''),
            metadata: data.metadata
          });
        } catch (error) {
          console.error('Failed to parse model:', key);
        }
      }
    }
    return models;
  }

  static deleteModel(modelId) {
    localStorage.removeItem(`fraud_model_${modelId}`);
  }
}

export { ModelStorage, LocalStorageBackup };
export default ModelStorage;
