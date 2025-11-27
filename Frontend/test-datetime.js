/**
 * Test script to verify datetime utilities
 * Run with: node test-datetime.js
 */

// Simulate the datetime utilities
const IST_OFFSET_HOURS = 5;
const IST_OFFSET_MINUTES = 30;
const IST_OFFSET_MS = (IST_OFFSET_HOURS * 60 + IST_OFFSET_MINUTES) * 60 * 1000;

const getCurrentISTTime = () => {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const istTime = new Date(utcTime + IST_OFFSET_MS);
  return istTime;
};

const formatAttendanceDate = (date) => {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatAttendanceTime = (date) => {
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const getDayOfWeek = (date) => {
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
  });
};

// Test the functions
console.log('='.repeat(60));
console.log('DATETIME UTILITIES TEST');
console.log('='.repeat(60));

const now = new Date();
const istTime = getCurrentISTTime();

console.log('\n📅 Current Time Information:');
console.log('  Device Time (UTC):', now.toISOString());
console.log('  Device Timezone Offset:', now.getTimezoneOffset(), 'minutes');
console.log('  IST Time:', istTime.toISOString());

console.log('\n🕐 Formatted Output:');
console.log('  Date:', formatAttendanceDate(istTime));
console.log('  Time:', formatAttendanceTime(istTime));
console.log('  Day:', getDayOfWeek(istTime));

console.log('\n✅ Expected Output:');
console.log('  Date: 27 Nov 2025');
console.log('  Time: 03:27 PM (or current IST time)');
console.log('  Day: Wednesday');

console.log('\n' + '='.repeat(60));
console.log('TEST COMPLETE');
console.log('='.repeat(60));
