# Troubleshooting Guide

## Error: "Property 'formatAttendanceDate' doesn't exist"

This error occurs when the Metro bundler cache is stale. Here's how to fix it:

### Solution 1: Clear Metro Cache (Recommended)

**Windows:**
```bash
# Stop the Metro bundler (Ctrl+C)

# Clear cache and restart
npx expo start -c
```

**Or use the batch file:**
```bash
clear-cache.bat
```

### Solution 2: Manual Cache Clear

```bash
# 1. Stop Metro bundler (Ctrl+C)

# 2. Clear npm cache
npm cache clean --force

# 3. Delete node_modules and reinstall (if needed)
rmdir /s /q node_modules
npm install

# 4. Start with clean cache
npx expo start -c
```

### Solution 3: Restart Metro Bundler

```bash
# Stop current Metro bundler (Ctrl+C)

# Start fresh
npm start
```

### Solution 4: Check Import Path

Ensure the import statement is correct:

```typescript
// ✅ Correct
import { 
  getCurrentISTTime, 
  formatAttendanceDate, 
  formatAttendanceTime,
  getDayOfWeek 
} from "../../utils/dateTime";

// ❌ Wrong
import { formatAttendanceDate } from "../../utils/datetime"; // lowercase 't'
import { formatAttendanceDate } from "../utils/dateTime";    // wrong path
```

### Solution 5: Verify File Exists

Check that the file exists:
```bash
dir src\utils\dateTime.ts
```

Should show:
```
dateTime.ts
```

### Solution 6: Check TypeScript Compilation

```bash
npx tsc --noEmit
```

This will show any TypeScript errors.

### Common Causes:

1. **Stale Metro cache** - Most common, fixed by `npx expo start -c`
2. **Wrong import path** - Check relative path `../../utils/dateTime`
3. **File not saved** - Ensure dateTime.ts is saved
4. **TypeScript error** - Run `npx tsc --noEmit` to check
5. **Node modules issue** - Reinstall with `npm install`

### Quick Fix Command:

```bash
# One-liner to fix most issues
npx expo start -c
```

### Verification:

After clearing cache, verify the import works:

```typescript
import { formatAttendanceDate, getCurrentISTTime } from "../../utils/dateTime";

console.log(formatAttendanceDate(getCurrentISTTime()));
// Should output: "27 Nov 2025"
```

### Still Not Working?

1. Check the file path is correct
2. Ensure you're in the Frontend directory
3. Restart VS Code / Kiro IDE
4. Check for typos in the import statement
5. Verify the dateTime.ts file has the export statements

### Need More Help?

Check the logs:
```bash
# Look for import errors in Metro bundler output
# Should see: "Bundling complete"
```

If you see errors like:
- "Unable to resolve module" - Check import path
- "Property doesn't exist" - Clear cache
- "Cannot find module" - Check file exists
