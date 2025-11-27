# DateTime Utilities - Quick Reference

## Import

```typescript
import {
  getCurrentISTTime,
  formatAttendanceTime,
  formatAttendanceDate,
  calculateHours,
  logTimeInfo
} from './dateTime';
```

## Common Use Cases

### 1. Display Current Time (IST)

```typescript
const now = getCurrentISTTime();
console.log(formatAttendanceTime(now)); // "03:30 PM"
console.log(formatAttendanceDate(now)); // "27 Nov 2025"
```

### 2. Format Backend Response Times

```typescript
// Backend returns UTC time
const checkInUTC = "2025-11-27T07:57:39";

// Convert and format for display
const displayTime = formatAttendanceTime(checkInUTC);
// Output: "01:27 PM"
```

### 3. Calculate Hours Worked

```typescript
const checkIn = "2025-11-27T07:57:39";
const checkOut = "2025-11-27T16:30:00";

const hours = calculateHours(checkIn, checkOut);
console.log(hours); // 8.54
```

### 4. Check if Date is Today

```typescript
import { isToday } from './dateTime';

const someDate = "2025-11-27T07:57:39";
if (isToday(someDate)) {
  console.log("This is today!");
}
```

### 5. Debug Timezone Issues

```typescript
import { logTimeInfo } from './dateTime';

// Log comprehensive time information
logTimeInfo();
```

## Output Examples

```
🕐 Time Information:
  Device Time: 2025-11-27T09:30:00.000Z
  Device Timezone Offset: -330 minutes
  IST Time: 2025-11-27T15:00:00.000Z
  IST Formatted: Wednesday, 27 November 2025 at 03:00:00 pm
  UTC Timestamp: 2025-11-27T09:30:00.000Z
  IST Timestamp: 2025-11-27T15:00:00.000Z
```

## Format Options

### formatISTDate()

```typescript
formatISTDate(date, 'date')     // "27 November 2025"
formatISTDate(date, 'time')     // "03:30 PM"
formatISTDate(date, 'datetime') // "27 Nov 2025, 03:30 PM"
formatISTDate(date, 'full')     // "Wednesday, 27 November 2025 at 03:30:00 pm"
```

### formatHours()

```typescript
formatHours(8.5, 'decimal') // "8.50 hrs"
formatHours(8.5, 'hm')      // "8h 30m"
```

## Best Practices

1. ✅ Always use these utilities for date/time operations
2. ✅ Never manually calculate timezone offsets
3. ✅ Use `logTimeInfo()` when debugging
4. ✅ Format backend responses before displaying
5. ✅ Use `isToday()` for date comparisons

## Integration Example

```typescript
// In your component
import { formatAttendanceTime, formatAttendanceDate } from '../utils/dateTime';

const AttendanceCard = ({ record }) => {
  return (
    <View>
      <Text>Date: {formatAttendanceDate(record.check_in)}</Text>
      <Text>Check-in: {formatAttendanceTime(record.check_in)}</Text>
      {record.check_out && (
        <Text>Check-out: {formatAttendanceTime(record.check_out)}</Text>
      )}
    </View>
  );
};
```

## Troubleshooting

### Times showing wrong timezone?
Use `convertUTCToIST()` before displaying:
```typescript
import { convertUTCToIST, formatAttendanceTime } from './dateTime';

const utcTime = "2025-11-27T07:57:39";
const istTime = convertUTCToIST(utcTime);
const display = formatAttendanceTime(istTime);
```

### Need to debug?
```typescript
import { logTimeInfo } from './dateTime';
logTimeInfo(); // Logs comprehensive time info
```

### Hours calculation wrong?
Use the utility function:
```typescript
import { calculateHours } from './dateTime';
const hours = calculateHours(checkIn, checkOut);
```
