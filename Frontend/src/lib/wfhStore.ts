// Lightweight in-memory store for WFH requests (UI-only, no backend changes)
// This is intentionally simple and synchronous-looking while returning Promises
// so it can be swapped for a real API later without touching callers.

export type WfhStatus = "not_requested" | "pending" | "approved" | "rejected";

export interface WfhRequest {
  id: string;
  userId: string;
  userName?: string;
  department?: string;
  date: string; // yyyy-MM-dd (IST normalized in caller)
  reason: string;
  notes?: string;
  status: WfhStatus;
  createdAt: number;
  updatedAt: number;
  approverName?: string;
}

let requests: WfhRequest[] = [];

const persist = () => Promise.resolve(); // placeholder for future persistence

export const wfhStore = {
  async list(): Promise<WfhRequest[]> {
    return requests.slice();
  },

  async upsert(request: Omit<WfhRequest, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<WfhRequest> {
    const now = Date.now();
    if (request.id) {
      const idx = requests.findIndex((r) => r.id === request.id);
      if (idx !== -1) {
        requests[idx] = { ...requests[idx], ...request, updatedAt: now };
        await persist();
        return requests[idx];
      }
    }
    const id = request.id || `${request.userId}-${request.date}`;
    const existingIdx = requests.findIndex((r) => r.id === id);
    const newEntry: WfhRequest = {
      id,
      createdAt: now,
      updatedAt: now,
      ...request,
    };
    if (existingIdx !== -1) {
      requests[existingIdx] = { ...requests[existingIdx], ...newEntry, updatedAt: now };
    } else {
      requests.push(newEntry);
    }
    await persist();
    return newEntry;
  },

  async updateStatus(id: string, status: WfhStatus, approverName?: string): Promise<WfhRequest | null> {
    const idx = requests.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    requests[idx] = { ...requests[idx], status, updatedAt: Date.now(), approverName };
    await persist();
    return requests[idx];
  },

  async findByUserAndDate(userId: string, date: string): Promise<WfhRequest | null> {
    const match = requests.find((r) => r.userId === userId && r.date === date);
    return match ? { ...match } : null;
  },
};
