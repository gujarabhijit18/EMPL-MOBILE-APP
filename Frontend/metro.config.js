// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Force Metro bundler to use port 8081
config.server = {
  ...config.server,
  port: 8081,
};

module.exports = config;
