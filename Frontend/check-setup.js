// Comprehensive setup checker for the frontend
const os = require('os');
const fs = require('fs');
const path = require('path');
const http = require('http');

console.log('🔍 Checking Frontend Setup...\n');

// 1. Check Node.js version
console.log('1️⃣ Node.js Version:');
console.log(`   ✓ ${process.version}\n`);

// 2. Get local IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return null;
}

const detectedIP = getLocalIP();
console.log('2️⃣ Network Configuration:');
console.log(`   Detected IP: ${detectedIP || '❌ Not found'}`);

// 3. Check api.ts configuration
const configPath = path.join(__dirname, 'src', 'config', 'api.ts');
let configuredIP = null;

try {
  const content = fs.readFileSync(configPath, 'utf8');
  const match = content.match(/MACHINE_IP:\s*"([^"]*)"/);
  
  if (match) {
    configuredIP = match[1];
    console.log(`   Configured IP: ${configuredIP}`);
    
    if (configuredIP === detectedIP) {
      console.log(`   ✅ IP address is up to date\n`);
    } else {
      console.log(`   ⚠️  IP address mismatch!`);
      console.log(`   💡 Run: npm run update-ip\n`);
    }
  }
} catch (error) {
  console.log(`   ❌ Could not read config file\n`);
}

// 4. Check if backend is running
console.log('3️⃣ Backend Connection:');

function checkBackend(ip, port) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/test-cors',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ success: true, status: res.statusCode });
        } else {
          resolve({ success: false, status: res.statusCode });
        }
      });
    });

    req.on('error', (error) => {
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ success: false, error: 'Connection timeout' });
    });

    req.end();
  });
}

async function testBackend() {
  const backendPort = 8000;
  
  if (configuredIP) {
    console.log(`   Testing: http://${configuredIP}:${backendPort}`);
    const result = await checkBackend(configuredIP, backendPort);
    
    if (result.success) {
      console.log(`   ✅ Backend is running and accessible\n`);
    } else {
      console.log(`   ❌ Cannot connect to backend`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log(`   💡 Make sure backend is running:`);
      console.log(`      cd ../Backend`);
      console.log(`      uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\n`);
    }
  } else {
    console.log(`   ⚠️  Cannot test - IP not configured\n`);
  }
}

// 5. Check package.json
console.log('4️⃣ Dependencies:');
const packagePath = path.join(__dirname, 'package.json');

try {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  const depCount = Object.keys(pkg.dependencies || {}).length;
  const devDepCount = Object.keys(pkg.devDependencies || {}).length;
  
  console.log(`   Dependencies: ${depCount}`);
  console.log(`   Dev Dependencies: ${devDepCount}`);
  
  // Check if node_modules exists
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log(`   ✅ node_modules exists\n`);
  } else {
    console.log(`   ❌ node_modules not found`);
    console.log(`   💡 Run: npm install\n`);
  }
} catch (error) {
  console.log(`   ❌ Could not read package.json\n`);
}

// 6. Summary
async function printSummary() {
  await testBackend();
  
  console.log('📋 Summary:');
  console.log('─────────────────────────────────────');
  
  const issues = [];
  const tips = [];
  
  if (!detectedIP) {
    issues.push('Cannot detect network IP');
    tips.push('Check network connection');
  }
  
  if (configuredIP !== detectedIP) {
    issues.push('IP address mismatch');
    tips.push('Run: npm run update-ip');
  }
  
  if (!fs.existsSync(path.join(__dirname, 'node_modules'))) {
    issues.push('Dependencies not installed');
    tips.push('Run: npm install');
  }
  
  if (issues.length === 0) {
    console.log('✅ Setup looks good!');
    console.log('\n🚀 Start development:');
    console.log('   npm run dev');
  } else {
    console.log('⚠️  Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
    console.log('\n💡 Recommended actions:');
    tips.forEach(tip => console.log(`   - ${tip}`));
  }
  
  console.log('\n📚 For more help, see: SETUP_GUIDE.md');
}

printSummary();
