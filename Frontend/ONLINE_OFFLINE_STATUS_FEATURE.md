# Online/Offline Status Feature

## Overview
This feature adds an Online/Offline status tracking system to the existing Attendance module. It works as an add-on without modifying the core Check-In/Check-Out logic.

## Key Features

1. **Auto-Online on Check-In**: When an employee checks in, their status is automatically set to "Online" and working hours start counting.

2. **Toggle with Reason**: Employees can toggle between Online and Offline status. When going Offline, a popup requires them to provide a reason (e.g., "Lunch break", "Meeting", "Personal work").

3. **Paused Hour Calculation**: Working hours are only counted while the employee is Online. Offline time is tracked separately.

4. **Hidden After Checkout**: The Online/Offline toggle is completely hidden and disabled after the employee checks out.

5. **Time Summary**: Real-time display of total Online and Offline time during the work session.

## Technical Implementation

### Backend (FastAPI)

**New Models** (`Backend/app/db/models/online_status.py`):
- `OnlineStatus`: Tracks current online/offline state for each attendance session
- `OnlineStatusLog`: Logs each status change with timestamps and offline reasons

**New Routes** (`Backend/app/routes/online_status_routes.py`):
- `GET /online-status/current/{user_id}` - Get current status
- `POST /online-status/toggle/{user_id}` - Toggle status (requires offline_reason when going offline)
- `GET /online-status/summary/{user_id}` - Get detailed time summary
- `GET /online-status/logs/{user_id}` - Get all status change logs
- `POST /online-status/finalize/{user_id}` - Finalize status on checkout

**Integration with Attendance**:
- Check-in automatically initializes Online status
- Check-out automatically finalizes and closes any open status sessions

### Frontend (React Native)

**New Component** (`Frontend/src/components/OnlineStatusToggle.tsx`):
- Displays current Online/Offline status with visual indicator
- Toggle button to switch status
- Modal popup for offline reason input
- Real-time time summary display
- Animated status indicator

**Integration**:
- Added to `AttendancePage.tsx` and `AttendanceWithToggle.tsx`
- Shows only when checked in and not checked out
- Hidden completely after checkout

### API Functions (`Frontend/src/lib/api.ts`):
- `getOnlineStatus(userId)` - Fetch current status
- `toggleOnlineStatus(userId, offlineReason?)` - Toggle status
- `getOnlineStatusSummary(userId, attendanceId?)` - Get time summary
- `getOnlineStatusLogs(userId, attendanceId?)` - Get status logs
- `finalizeOnlineStatus(userId, attendanceId)` - Finalize on checkout

## Database Migration

Run the Alembic migration to create the new tables:
```bash
cd Backend
alembic upgrade head
```

Or the tables will be auto-created on server startup via SQLAlchemy.

## Usage Flow

1. Employee checks in → Status automatically set to "Online"
2. Employee can tap "Go Offline" → Popup asks for reason → Status changes to "Offline"
3. While Offline, working hours are paused
4. Employee taps "Go Online" → Status changes back to "Online" → Hours resume counting
5. Employee checks out → Status tracking finalized, toggle hidden

## UI Preview

The Online/Offline toggle appears as a card between the Location Card and Today's Status Card on the attendance screen. It shows:
- Current status (Online/Offline) with animated indicator
- Toggle button with appropriate action
- Time summary showing total Online and Offline minutes
