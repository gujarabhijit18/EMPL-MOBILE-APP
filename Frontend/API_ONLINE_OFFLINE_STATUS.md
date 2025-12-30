# Online/Offline Status APIs

## Endpoints

### 1. Get Current Online Status
```
GET /attendance/user-online-status/{user_id}
```
**Description:** Get current online/offline status for a specific user.

**Response:**
```json
{
  "id": 1,
  "user_id": 123,
  "attendance_id": 456,
  "is_online": true,
  "last_seen": "2024-12-29T10:30:00",
  "offline_reason": null,
  "created_at": "2024-12-29T09:00:00",
  "updated_at": "2024-12-29T10:30:00",
  "total_online_minutes": 90,
  "total_offline_minutes": 0,
  "current_session_minutes": 90
}
```

---

### 2. Update/Toggle Online Status
```
POST /attendance/online-status
```
**Description:** Update user's online/offline status. When offline, work hours calculation is paused.

**Request Body:**
```json
{
  "attendance_id": 456,
  "user_id": 123,
  "is_online": false,
  "offline_reason": "Lunch break"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated successfully",
  "is_online": false,
  "offline_reason": "Lunch break",
  "updated_at": "2024-12-29T12:00:00",
  "total_online_minutes": 180,
  "total_offline_minutes": 30,
  "effective_work_hours": 3.0
}
```

---

### 3. Get Online Status Summary/History
```
GET /attendance/online-status/{attendance_id}
```
**Description:** Get detailed summary of online/offline time for attendance session.

**Response:**
```json
{
  "user_id": 123,
  "attendance_id": 456,
  "is_online": true,
  "total_online_minutes": 240,
  "total_offline_minutes": 60,
  "effective_work_hours": 4.0,
  "offline_count": 2,
  "session_start": "2024-12-29T09:00:00",
  "session_end": null,
  "current_status": "online",
  "logs": [
    {
      "id": 1,
      "status": "online",
      "started_at": "2024-12-29T09:00:00",
      "ended_at": "2024-12-29T12:00:00",
      "duration_minutes": 180
    }
  ]
}
```

---

### 4. Get All Users Current Status (Admin/HR/Manager)
```
GET /attendance/current-online-status
```
**Description:** Get current online/offline status for all checked-in users today.

**Response:**
```json
{
  "1": { "user_id": 1, "is_online": true, "last_seen": "2024-12-29T10:30:00" },
  "2": { "user_id": 2, "is_online": false, "last_seen": "2024-12-29T10:00:00" }
}
```

---

### 5. Calculate Working Hours
```
GET /attendance/working-hours/{attendance_id}
```
**Description:** Calculate actual working hours based on online/offline status.

**Response:**
```json
{
  "attendance_id": 456,
  "total_online_minutes": 240,
  "total_offline_minutes": 60,
  "effective_work_hours": 4.0
}
```

---

## TypeScript Interfaces

```typescript
interface OnlineStatusResponse {
  id?: number;
  user_id: number;
  attendance_id: number | null;
  is_online: boolean;
  last_seen?: string | null;
  offline_reason?: string | null;
  created_at?: string;
  updated_at?: string | null;
  total_online_minutes?: number;
  total_offline_minutes?: number;
  current_session_minutes?: number;
}

interface ToggleStatusResponse {
  success?: boolean;
  message: string;
  is_online: boolean;
  offline_reason?: string | null;
  updated_at?: string;
  total_online_minutes?: number;
  total_offline_minutes?: number;
  effective_work_hours?: number;
}

interface OnlineStatusSummary {
  user_id: number;
  attendance_id: number;
  is_online: boolean;
  total_online_minutes: number;
  total_offline_minutes: number;
  effective_work_hours: number;
  offline_count?: number;
  session_start?: string;
  session_end?: string | null;
  current_status?: 'online' | 'offline';
  logs?: OnlineStatusLog[];
}

interface OnlineStatusLog {
  id: number;
  attendance_id?: number;
  user_id?: number;
  status: string;
  offline_reason?: string | null;
  started_at?: string;
  ended_at?: string | null;
  duration_minutes?: number;
  timestamp?: string;
  reason?: string | null;
}
```

---

## Usage Examples

```typescript
import { apiService } from '../lib/api';

// 1. Get current status
const status = await apiService.getOnlineStatus(userId);

// 2. Go Online
const result = await apiService.toggleOnlineStatus(attendanceId, userId, true);

// 3. Go Offline (reason required)
const result = await apiService.toggleOnlineStatus(attendanceId, userId, false, "Lunch break");

// 4. Get summary
const summary = await apiService.getOnlineStatusSummary(userId, attendanceId);
```

---

## Quick Reference

| Action | Method | Endpoint |
|--------|--------|----------|
| Get user status | GET | `/attendance/user-online-status/{user_id}` |
| Toggle status | POST | `/attendance/online-status` |
| Get summary | GET | `/attendance/online-status/{attendance_id}` |
| Get all status | GET | `/attendance/current-online-status` |
| Calculate hours | GET | `/attendance/working-hours/{attendance_id}` |
