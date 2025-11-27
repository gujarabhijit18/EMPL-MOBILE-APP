// Script to automatically update the IP address in api.ts config
const fs = require('fs');
const os = require('os');
const path = require('path');

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return '127.0.0.1';
}

function updateApiConfig() {
  const configPath = path.join(__dirname, 'src', 'config', 'api.ts');
  const currentIP = getLocalIP();
  
  console.log(`🔍 Detected IP Address: ${currentIP}`);
  
  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Update the MACHINE_IP value
    const updatedContent = content.replace(
      /MACHINE_IP:\s*"[^"]*"/,
      `MACHINE_IP: "${currentIP}"`
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(configPath, updatedContent, 'utf8');
      console.log(`✅ Updated api.ts with IP: ${currentIP}`);
      console.log(`📡 Backend URL: http://${currentIP}:8000`);
      console.log(`📱 Expo URL: exp://${currentIP}:8081`);
    } else {
      console.log(`✓ IP address already up to date: ${currentIP}`);
    }
  } catch (error) {
    console.error('❌ Error updating config:', error.message);
    process.exit(1);
  }
}

updateApiConfig();
