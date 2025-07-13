const express = require('express');
const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 3000;
const SSL_PORT = 3443;

// En üste ekle:
(function() {
  const origLog = console.log;
  console.log = function(...args) {
    // Eğer argümanlardan biri https:// ile başlayan bir string ise logla
    if (args.some(arg => typeof arg === 'string' && arg.startsWith('https://'))) {
      origLog.apply(console, args.filter(arg => typeof arg !== 'string' || arg.startsWith('https://')));
      return;
    }
    // Eğer hiç https:// yoksa ve içinde http/ftp/ws gibi url varsa loglama
    if (args.some(arg => typeof arg === 'string' && /\b(?:http|ws|ftp):\/\//.test(arg))) {
      return;
    }
    // Normal log
    origLog.apply(console, args);
  };
})();

// Statik dosyaları sun (örn: public/index.html)
app.use(express.static(path.join(__dirname, 'public')));

// Ana dizine GET / isteği geldiğinde public/index.html dosyasını döndür
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// HTTP sunucusu
http.createServer(app).listen(PORT, () => {
  const localIp = getLocalIp();
  console.log(`HTTP:  http://localhost:${PORT}`);
  console.log(`HTTP:  http://${localIp}:${PORT}`);
});

// HTTPS için sertifika kontrolü ve otomatik üretim
function ensureCertificates() {
  const keyPath = path.join(__dirname, 'key.pem');
  const certPath = path.join(__dirname, 'cert.pem');
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    return {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  } else {
    // Otomatik self-signed sertifika üret
    try {
      const selfsigned = require('selfsigned');
      const attrs = [{ name: 'commonName', value: 'localhost' }];
      const pems = selfsigned.generate(attrs, { days: 365 });
      fs.writeFileSync(keyPath, pems.private);
      fs.writeFileSync(certPath, pems.cert);
      console.log('Otomatik self-signed sertifika üretildi.');
      return {
        key: Buffer.from(pems.private),
        cert: Buffer.from(pems.cert),
      };
    } catch (err) {
      console.log('selfsigned paketi yüklü değil. Kurmak için: npm install selfsigned');
      throw err;
    }
  }
}

// HTTPS sunucusu
try {
  const options = ensureCertificates();
  https.createServer(options, app).listen(SSL_PORT, () => {
    const localIp = getLocalIp();
    console.log(`HTTPS: https://localhost:${SSL_PORT}`);
    console.log(`HTTPS: https://${localIp}:${SSL_PORT}`);
  });
} catch (err) {
  console.log('HTTPS başlatılamadı. selfsigned paketi kurulu mu kontrol edin.');
} 