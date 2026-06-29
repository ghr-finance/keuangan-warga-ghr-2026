export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleDbError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);
  console.error('Database Error: ', JSON.stringify({ error: errMsg, operationType, path }));
  throw new Error(JSON.stringify({ error: errMsg, operationType, path }));
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// Store active polling intervals for cleanup
const activePollers = new Map<string, ReturnType<typeof setInterval>>();

export const dbService = {
  // Generic CRUD via API
  async add(collPath: string, data: any): Promise<string | undefined> {
    try {
      const response = await fetch(`/api/${collPath}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...data,
          createdAt: data.createdAt || Date.now()
        }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
      const result = await response.json();
      return result.id;
    } catch (error) {
      handleDbError(error, OperationType.CREATE, collPath);
    }
  },

  async update(collPath: string, id: string, data: any) {
    try {
      const response = await fetch(`/api/${collPath}/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `${collPath}/${id}`);
    }
  },

  async delete(collPath: string, id: string) {
    try {
      const response = await fetch(`/api/${collPath}/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      handleDbError(error, OperationType.DELETE, `${collPath}/${id}`);
    }
  },

  async getAll(collPath: string, ..._queryConstraints: any[]): Promise<any[] | undefined> {
    try {
      const response = await fetch(`/api/${collPath}`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      handleDbError(error, OperationType.LIST, collPath);
    }
  },

  /**
   * Replaces Firestore onSnapshot with polling.
   * Fetches data immediately, then polls every 5 seconds.
   * Returns an unsubscribe function that stops polling.
   */
  subscribe(collPath: string, callback: (data: any[]) => void, ..._queryConstraints: any[]): () => void {
    // Unique key for this subscription
    const key = `${collPath}_${Date.now()}_${Math.random()}`;
    
    // Fetch immediately
    const doFetch = async () => {
      try {
        const response = await fetch(`/api/${collPath}`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          callback(data);
        }
      } catch (error) {
        console.error(`Polling error for ${collPath}:`, error);
      }
    };

    // Initial fetch
    doFetch();

    // Poll every 5 seconds
    const interval = setInterval(doFetch, 5000);
    activePollers.set(key, interval);

    // Return unsubscribe function
    return () => {
      clearInterval(interval);
      activePollers.delete(key);
    };
  },

  /**
   * Atomically updates a warga's status fields AND creates a new warga_history entry.
   * This ensures the history is always in sync with the warga record.
   */
  async updateWargaStatus(wargaId: string, data: {
    noRumah: string;
    status: string;
    statusHuni: string;
    isIuranWajib: boolean;
    isIuranRT: boolean;
    role?: string;
    effectiveFrom: number;
    keterangan: string;
  }): Promise<void> {
    try {
      const response = await fetch(`/api/warga/${wargaId}/update-status`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      handleDbError(error, OperationType.UPDATE, `warga/${wargaId}/update-status`);
    }
  },

  /**
   * Seeds warga_history with historical entries (idempotent — replaces existing history).
   * Used for migrating hardcoded historical data (e.g., No. 14 Fuad→Faradila) into the DB.
   */
  async migrateWargaHistory(wargaId: string, entries: Array<{
    noRumah: string;
    status: string;
    statusHuni: string;
    isIuranWajib: boolean;
    isIuranRT: boolean;
    effectiveFrom: number;
    effectiveTo?: number | null;
    keterangan: string;
  }>): Promise<void> {
    try {
      const response = await fetch(`/api/warga/migrate-history`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ wargaId, entries }),
      });
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(errBody.error || `HTTP ${response.status}`);
      }
    } catch (error) {
      handleDbError(error, OperationType.CREATE, `warga/migrate-history`);
    }
  },
};
