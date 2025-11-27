// Test script to verify expo-file-system and expo-sharing are available
// Run this with: node test-export-modules.js

console.log("🔍 Testing Export Modules...\n");

try {
  // Test if modules can be required
  console.log("1. Testing expo-file-system...");
  const FileSystem = require('expo-file-system');
  console.log("   ✅ expo-file-system loaded");
  console.log("   - documentDirectory:", FileSystem.documentDirectory || "undefined");
  console.log("   - cacheDirectory:", FileSystem.cacheDirectory || "undefined");
} catch (error) {
  console.log("   ❌ expo-file-system failed:", error.message);
}

try {
  console.log("\n2. Testing expo-sharing...");
  const Sharing = require('expo-sharing');
  console.log("   ✅ expo-sharing loaded");
  console.log("   - isAvailableAsync:", typeof Sharing.isAvailableAsync);
  console.log("   - shareAsync:", typeof Sharing.shareAsync);
} catch (error) {
  console.log("   ❌ expo-sharing failed:", error.message);
}

console.log("\n3. Checking package.json...");
try {
  const packageJson = require('./package.json');
  const deps = packageJson.dependencies;
  
  console.log("   expo-file-system:", deps['expo-file-system'] || "NOT FOUND");
  console.log("   expo-sharing:", deps['expo-sharing'] || "NOT FOUND");
} catch (error) {
  console.log("   ❌ Could not read package.json:", error.message);
}

console.log("\n✅ Module test complete!");
console.log("\nIf modules are installed but not loading in the app:");
console.log("1. Stop Metro bundler (Ctrl+C)");
console.log("2. Clear cache: npx expo start -c");
console.log("3. Or rebuild: npx expo run:android (or :ios)");
