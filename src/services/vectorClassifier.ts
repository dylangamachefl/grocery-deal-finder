// Worker-based vector classifier
// This module wraps the classifier web worker with a Promise-based API

interface ClassificationResult {
  subCategory: string;
  parentCategory: string;
  similarity?: number;
}

interface WorkerMessage {
  type: string;
  payload?: any;
  id?: string;
}

class ClassifierWorker {
  private worker: Worker | null = null;
  private messageId = 0;
  private pendingRequests = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private isReady = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.initWorker();
  }

  private initWorker() {
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      try {
        // Create worker from the workers directory
        this.worker = new Worker(
          new URL('@/workers/classifier.worker.ts', import.meta.url),
          { type: 'module' }
        );

        this.worker.onmessage = (event: MessageEvent) => {
          const { type, payload, id } = event.data as WorkerMessage;

          // Handle ready signal
          if (type === 'READY') {
            console.log('[VectorClassifier] Worker is ready');
            this.isReady = true;
            // Auto-initialize the model
            this.sendMessage('INITIALIZE', {}).then(() => {
              console.log('[VectorClassifier] Model initialized');
              resolve();
            });
            return;
          }

          // Handle responses
          if (id && this.pendingRequests.has(id)) {
            const { resolve: resolveRequest, reject: rejectRequest, timeout } = this.pendingRequests.get(id)!;
            clearTimeout(timeout);
            this.pendingRequests.delete(id);

            if (type === 'ERROR') {
              rejectRequest(new Error(payload?.message || 'Worker error'));
            } else {
              resolveRequest(payload);
            }
          }
        };

        this.worker.onerror = (error) => {
          console.error('[VectorClassifier] Worker error:', error);
          reject(new Error('Worker initialization failed'));
        };

      } catch (error) {
        console.error('[VectorClassifier] Failed to create worker:', error);
        reject(error);
      }
    });

    return this.initPromise;
  }

  private sendMessage(type: string, payload: any, timeoutMs = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error('Worker not initialized'));
        return;
      }

      const id = `msg_${this.messageId++}`;

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Worker request timeout (${timeoutMs}ms)`));
      }, timeoutMs);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.worker.postMessage({ type, payload, id });
    });
  }

  async classifyItem(itemText: string): Promise<ClassificationResult> {
    await this.initPromise;
    return this.sendMessage('CLASSIFY', { text: itemText });
  }

  async classifyBatch(items: string[]): Promise<ClassificationResult[]> {
    await this.initPromise;
    return this.sendMessage('CLASSIFY_BATCH', { items }, 60000); // Longer timeout for batch
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isReady = false;
      this.initPromise = null;
    }
  }
}

// Singleton instance
let classifierInstance: ClassifierWorker | null = null;

export const initializeVectorClassifier = async (): Promise<void> => {
  if (!classifierInstance) {
    classifierInstance = new ClassifierWorker();
  }
  // Wait for initialization to complete
  await classifierInstance['initPromise'];
};

export const classifyItem = async (itemText: string): Promise<ClassificationResult> => {
  if (!classifierInstance) {
    await initializeVectorClassifier();
  }
  return classifierInstance!.classifyItem(itemText);
};

export const classifyBatch = async (items: string[]): Promise<ClassificationResult[]> => {
  if (!classifierInstance) {
    await initializeVectorClassifier();
  }
  return classifierInstance!.classifyBatch(items);
};

export const terminateClassifier = (): void => {
  if (classifierInstance) {
    classifierInstance.terminate();
    classifierInstance = null;
  }
};
