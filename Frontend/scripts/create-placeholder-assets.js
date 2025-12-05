/**
 * Script to create placeholder asset files for Expo
 * Run with: node scripts/create-placeholder-assets.js
 */
const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG (base64)
const transparentPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// Simple 1024x1024 blue PNG for icon (base64 encoded minimal PNG)
// This creates a simple colored square
const createColoredPng = (r, g, b, size = 1) => {
  // Minimal PNG with single color
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
  ]);
  
  // For simplicity, we'll use the transparent PNG as placeholder
  return transparentPng;
};

const assetsDir = path.join(__dirname, '..', 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Create placeholder files
const files = [
  'icon.png',
  'splash.png',
  'adaptive-icon.png',
  'favicon.png',
  'notification-icon.png'
];

files.forEach(file => {
  const filePath = path.join(assetsDir, file);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, transparentPng);
    console.log(`Created placeholder: ${file}`);
  } else {
    console.log(`Already exists: ${file}`);
  }
});

console.log('\n✅ Placeholder assets created!');
console.log('⚠️  Replace these with your actual app icons and splash screens.');
