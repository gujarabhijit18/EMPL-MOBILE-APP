// 📱 Expo Development Configuration
// Update this file when your IP address changes
// Expo always runs on port 8081 by default (or next available port)

export const API_CONFIG = {
  // 🌐 Production/Backend URL
  BASE_URL: "https://staffly.space",

  // 🌐 Your current machine IP (used for local development)
  MACHINE_IP: "192.168.1.45",

  // 🔧 Backend port (for local development)
  BACKEND_PORT: 8000,

  // 📱 Expo port (FIXED to 8081)
  EXPO_PORT: 8081,

  // 📡 Get API base URL for all platforms (web + mobile)
  getApiBaseUrl: () => {
    // If BASE_URL is set to a full URL, use it
    if (API_CONFIG.BASE_URL.startsWith('http')) {
      // Remove trailing slash if present to prevent double slashes
      return API_CONFIG.BASE_URL.replace(/\/$/, "");
    }
    // Fallback to local machine IP
    return `http://${API_CONFIG.MACHINE_IP}:${API_CONFIG.BACKEND_PORT}`;
  },

  // 📱 Get Expo URL for mobile
  getExpoUrl: () => {
    return `exp://${API_CONFIG.MACHINE_IP}:${API_CONFIG.EXPO_PORT}`;
  },

  // 🔍 Validate configuration
  validate: () => {
    const issues: string[] = [];

    if (!API_CONFIG.BASE_URL && (!API_CONFIG.MACHINE_IP || API_CONFIG.MACHINE_IP === "0.0.0.0")) {
      issues.push("Neither BASE_URL nor MACHINE_IP is set correctly");
    }

    if (issues.length > 0) {
      console.warn("⚠️ API Configuration Issues:");
      issues.forEach(issue => console.warn(`  - ${issue}`));
    }

    return issues.length === 0;
  }
};

// Validate on import
API_CONFIG.validate();

// 🎯 Usage:
// import { API_CONFIG } from './config/api';
// const API_BASE_URL = API_CONFIG.getApiBaseUrl();
