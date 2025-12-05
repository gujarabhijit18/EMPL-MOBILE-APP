// 📱 Expo Development Configuration
// Update this file when your IP address changes
// Expo always runs on port 8081 by default (or next available port)

export const API_CONFIG = {
  // 🌐 Your current machine IP (update this when it changes)
  // Find your IP by running: npm run update-ip
  // Or manually: python Backend/get_ip.py
  MACHINE_IP: "192.168.1.38",

  // 🔧 Backend port (FastAPI backend server)
  BACKEND_PORT: 8000,

  // 📱 Expo port (FIXED to 8081 - will not change)
  // Configured in package.json, metro.config.js, and app.json
  EXPO_PORT: 8081,

  // 📡 Get API base URL for all platforms (web + mobile)
  // Using machine IP works both from browser and physical device
  getApiBaseUrl: () => {
    const baseUrl = `http://${API_CONFIG.MACHINE_IP}:${API_CONFIG.BACKEND_PORT}`;
    console.log(`📡 API Base URL: ${baseUrl}`);
    return baseUrl;
  },

  // 📱 Get Expo URL for mobile
  getExpoUrl: () => {
    return `exp://${API_CONFIG.MACHINE_IP}:${API_CONFIG.EXPO_PORT}`;
  },

  // 🔍 Validate configuration
  validate: () => {
    const issues: string[] = [];

    if (!API_CONFIG.MACHINE_IP || API_CONFIG.MACHINE_IP === "0.0.0.0") {
      issues.push("MACHINE_IP is not set or invalid");
    }

    if (API_CONFIG.MACHINE_IP === "localhost" || API_CONFIG.MACHINE_IP === "127.0.0.1") {
      issues.push("MACHINE_IP should be your network IP, not localhost (won't work on physical devices)");
    }

    if (issues.length > 0) {
      console.warn("⚠️ API Configuration Issues:");
      issues.forEach(issue => console.warn(`  - ${issue}`));
      console.warn("💡 Run: npm run update-ip");
    }

    return issues.length === 0;
  }
};

// Validate on import
API_CONFIG.validate();

// 🎯 Usage:
// import { API_CONFIG } from './config/api';
// const API_BASE_URL = API_CONFIG.getApiBaseUrl();
