# Timezone and DateTime Handling Guide

## Overview

The attendance system properly handles timezones to ensure accurate time tracking across different devices and locations. The system uses **India Standard Time (IST, UTC+5:30)** as the primary timezone.

## How It Works

### 1. **Check-In/Check-Out Process**

When a user checks in or out:

1. **Frontend (Expo App)**:
   - Captures current device time
   - Logs device timezone information
   - Sends request to backend with GPS location and selfie
   - **Does NOT send timestamp** - backend generates it

2. **Backend (FastAPI)**:
   - Receives check-in/check-out request
   - Generates timestamp using `datetime.utcnow()` (UTC time)
   - Stores in database as UTC
   - Converts to IST for display and calculations
   - Returns response with UTC timestamps

3. **Frontend Display**:
   - Receives UTC timestamps from backend
   - Converts to IST for display using utility functions
   - Shows time in user-friendly format (e.g., "09:30 AM IST")

### 2. **Timezone Conversion Flow**

```
Device Time (Any TZ) → Backend (UTC) → Database (UTC) → Frontend (IST Display)
```

**Example:**
- Device in Mumbai: 3:00 PM IST
- Backend stores: 9:30 AM UTC
- Database: 2025-11-27 09:30:00 (UTC)
- Frontend displays: 3:00 PM IST

### 3. **Key Components**

#### Backend (Python)
```python
# Backend uses zoneinfo for timezone handling
from zoneinfo import ZoneInfo

INDIA_TZ = ZoneInfo("Asia/Kolkata")
UTC_TZ = ZoneInfo("UTC")

# Store in UTC
check_in_time = datetime.utcnow()

# Convert to IST for display
check_in_ist = check_in_time.replace(tzinfo=UTC_TZ).astimezone(INDIA_TZ)
```

#### Frontend (TypeScript)
```typescript
// Use the dateTime utility
import { formatAttendanceTime, getCurrentISTTime } from './utils/dateTime';

// Get current IST time
const istTime = getCurrentISTTime();

// Format for display
const formattedTime = formatAttendanceTime(istTime);
// Output: "03:00 PM"
```

### 4. **Utility Functions**

The `Frontend/src/utils/dateTime.ts` file provides:

- `getCurrentISTTime()` - Get current time in IST
- `convertUTCToIST(date)` - Convert UTC to IST
- `formatAttendanceTime(date)` - Format time for display
- `formatAttendanceDate(date)` - Format date for display
- `calculateHours(start, end)` - Calculate hours worked
- `isToday(date)` - Check if date is today in IST
- And more...

### 5. **Logging and Debugging**

Both frontend and backend log timezone information:

**Frontend Logs:**
```
🕐 Device Time Info: {
  deviceTime: "2025-11-27T09:30:00.000Z",
  deviceTimezone: "Asia/Kolkata",
  deviceOffset: "UTC+5.5",
  localTime: "27/11/2025, 3:00:00 pm"
}
```

**Backend Logs:**
```
⏰ Check-in time (UTC): 2025-11-27 09:30:00
⏰ Check-in time (India): 2025-11-27 15:00:00+05:30
```

### 6. **Important Notes**

1. **Backend is the source of truth** for timestamps
2. **Always store in UTC** in the database
3. **Convert to IST** only for display and calculations
4. **Device timezone doesn't matter** - backend generates timestamps
5. **Selfie filenames use IST** for easy identification

### 7. **Testing Timezone Handling**

To test timezone handling:

1. **Check device timezone:**
   ```typescript
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
   ```

2. **Log time info:**
   ```typescript
   import { logTimeInfo } from './utils/dateTime';
   logTimeInfo();
   ```

3. **Verify backend logs:**
   - Check backend console for timezone conversion logs
   - Verify selfie filenames have correct IST timestamps

### 8. **Common Issues and Solutions**

#### Issue: Times showing wrong timezone
**Solution:** Use `convertUTCToIST()` before displaying

#### Issue: Selfie timestamps don't match attendance
**Solution:** Backend uses IST for selfie filenames, UTC for database

#### Issue: Hours calculation incorrect
**Solution:** Use `calculateHours()` utility function

### 9. **Best Practices**

1. **Always use utility functions** for date/time operations
2. **Never manually calculate timezone offsets**
3. **Log timezone info** when debugging
4. **Test with different device timezones**
5. **Use ISO format** for API communication

### 10. **API Response Format**

Backend returns timestamps in ISO format (UTC):

```json
{
  "attendance_id": 13,
  "user_id": 8,
  "check_in": "2025-11-27T07:57:39",
  "check_out": "2025-11-27T07:57:54",
  "total_hours": 8.5
}
```

Frontend converts for display:
- Check-in: "1:27 PM IST"
- Check-out: "1:27 PM IST"
- Date: "27 Nov 2025"

## Summary

The system ensures accurate time tracking by:
- ✅ Backend generates all timestamps (UTC)
- ✅ Database stores in UTC
- ✅ Frontend converts to IST for display
- ✅ Comprehensive logging for debugging
- ✅ Utility functions for consistent formatting
- ✅ Device timezone independent

This approach ensures that attendance records are accurate regardless of the user's device timezone or location.
