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
// Bitchat BLE Web Client JS
const SERVICE_UUID = 'f47b5e2d-4a9e-4c5a-9b3f-8e1d2c3a4b5c';
const CHARACTERISTIC_UUID = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
let characteristic = null;
let connectedDevice = null;
let connectionStatus = 'disconnected';

const LANGS = {
  en: {
    appTitle: 'Bitchat BLE Web Client',
    labelNick: 'Username:',
    btnChangeNick: 'Change',
    connectBtn: 'Connect to supported device',
    disconnectBtn: 'Disconnect',
    sendBtn: 'Send',
    msgPlaceholder: 'Type a message...',
    statusNotConnected: 'Not connected',
    statusChecking: 'Checking for known devices...',
    statusConnecting: 'Connecting...',
    statusConnected: 'Connected',
    statusDisconnected: 'Disconnected',
    statusRequesting: 'Requesting device...',
    statusAutoConnectFailed: 'Auto-connect failed',
    statusConnectionFailed: 'Connection failed',
    statusConnectionSuccess: 'Connection successful! You can send messages.',
    statusCharacteristic: 'Characteristic found.',
    statusDeviceSelected: 'Device selected:',
    statusSearching: 'Searching for device...',
    statusDisconnectedMsg: 'Disconnected from device.',
    error: 'Error:'
  },
  tr: {
    appTitle: 'Bitchat BLE Web Client',
    labelNick: 'Kullanıcı adı:',
    btnChangeNick: 'Değiştir',
    connectBtn: 'Desteklenen cihaza bağlan',
    disconnectBtn: 'Bağlantıyı Kes',
    sendBtn: 'Gönder',
    msgPlaceholder: 'Mesaj yaz...',
    statusNotConnected: 'Bağlı değil',
    statusChecking: 'Kayıtlı cihazlar kontrol ediliyor...',
    statusConnecting: 'Bağlanıyor...',
    statusConnected: 'Bağlandı',
    statusDisconnected: 'Bağlantı kesildi',
    statusRequesting: 'Cihaz isteniyor...',
    statusAutoConnectFailed: 'Otomatik bağlantı başarısız',
    statusConnectionFailed: 'Bağlantı başarısız',
    statusConnectionSuccess: 'Bağlantı başarılı! Mesaj gönderebilirsin.',
    statusCharacteristic: 'Karakteristik bulundu.',
    statusDeviceSelected: 'Cihaz seçildi:',
    statusSearching: 'Cihaz aranıyor...',
    statusDisconnectedMsg: 'Cihazdan bağlantı kesildi.',
    error: 'Hata:'
  }
};

function getLang() {
  return localStorage.getItem('lang') || 'tr';
}
function setLang(lang) {
  localStorage.setItem('lang', lang);
  applyLang(lang);
}
function applyLang(lang) {
  const dict = LANGS[lang] || LANGS.tr;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key]) el.textContent = dict[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key]) el.setAttribute('placeholder', dict[key]);
  });
  // Status bar özel: mevcut durumun anahtarını bulup çevir
  const statusBar = document.getElementById('statusBar');
  if (statusBar && statusBar.dataset.statusKey && dict[statusBar.dataset.statusKey]) {
    statusBar.textContent = dict[statusBar.dataset.statusKey];
  }
}

async function disconnect() {
  if (connectedDevice && connectedDevice.gatt && connectedDevice.gatt.connected) {
    try {
      await connectedDevice.gatt.disconnect();
    } catch (e) {}
  }
  connectedDevice = null;
  characteristic = null;
  setStatus('statusDisconnected');
  document.getElementById('msg').disabled = true;
  document.getElementById('sendBtn').disabled = true;
  document.getElementById('disconnectBtn').style.display = 'none';
  document.getElementById('connectBtn').style.display = '';
  addMessage('Disconnected from device.', 'them');
}

function setStatus(statusKey) {
  const lang = getLang();
  const dict = LANGS[lang] || LANGS.tr;
  let statusBar = document.getElementById('statusBar');
  if (!statusBar) {
    statusBar = document.createElement('div');
    statusBar.id = 'statusBar';
    statusBar.style.textAlign = 'center';
    statusBar.style.fontSize = '15px';
    statusBar.style.margin = '8px 0 0 0';
    statusBar.style.color = '#4e9af1';
    document.getElementById('main-card')?.prepend(statusBar);
  }
  statusBar.dataset.statusKey = statusKey;
  // Determine indicator color
  let indicatorClass = 'status-disconnected';
  if (statusKey === 'statusConnected' || statusKey === 'statusConnectionSuccess') indicatorClass = 'status-connected';
  else if (statusKey === 'statusConnecting' || statusKey === 'statusChecking' || statusKey === 'statusRequesting') indicatorClass = 'status-connecting';
  else if (statusKey === 'statusDisconnected') indicatorClass = 'status-disconnected';
  // Remove old indicator if exists
  let indicator = statusBar.querySelector('.status-indicator');
  if (!indicator) {
    indicator = document.createElement('span');
    indicator.className = 'status-indicator';
    statusBar.prepend(indicator);
  }
  indicator.className = 'status-indicator ' + indicatorClass;
  // Set text
  statusBar.innerHTML = '';
  statusBar.appendChild(indicator);
  const text = document.createElement('span');
  text.textContent = dict[statusKey] || statusKey;
  statusBar.appendChild(text);
  // Show/hide disconnect button
  const disconnectBtn = document.getElementById('disconnectBtn');
  const connectBtn = document.getElementById('connectBtn');
  if ((dict[statusKey] || statusKey).toLowerCase().includes((dict.statusConnected || 'Connected').toLowerCase()) || statusKey === 'statusConnectionSuccess') {
    if (disconnectBtn) disconnectBtn.style.display = '';
    if (connectBtn) connectBtn.style.display = 'none';
  } else {
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    if (connectBtn) connectBtn.style.display = '';
  }
}

async function tryReconnectKnownDevice() {
  if (!navigator.bluetooth || !navigator.bluetooth.getDevices) return false;
  setStatus('statusChecking');
  try {
    const devices = await navigator.bluetooth.getDevices();
    if (devices && devices.length > 0) {
      // Try to connect to the first known device
      setStatus('statusConnecting');
      const device = devices[0];
      connectedDevice = device;
      await connectToDevice(device);
      return true;
    }
  } catch (e) {
    setStatus('statusAutoConnectFailed');
  }
  setStatus('statusNotConnected');
  return false;
}

async function connectToDevice(device) {
  try {
    setStatus('statusConnecting');
    const server = await device.gatt.connect();
    setStatus('statusConnected');
    const service = await server.getPrimaryService(SERVICE_UUID);
    characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);
    addMessage('Characteristic found.', 'them');
    await characteristic.startNotifications();
    characteristic.addEventListener('characteristicvaluechanged', event => {
      const value = event.target.value.buffer;
      const hex = Array.from(new Uint8Array(value)).map(b => b.toString(16).padStart(2, '0')).join(' ');
      try {
        const json = parseBitchatPacket(new Uint8Array(value));
        const typeNames = {
          1: 'ANNOUNCE', 2: 'KEY_EXCHANGE', 3: 'LEAVE', 4: 'MESSAGE', 5: 'FRAGMENT_START', 6: 'FRAGMENT_CONTINUE', 7: 'FRAGMENT_END', 8: 'CHANNEL_ANNOUNCE', 9: 'CHANNEL_RETENTION', 10: 'DELIVERY_ACK', 11: 'DELIVERY_STATUS_REQUEST', 12: 'READ_RECEIPT'
        };
        const typeName = typeNames[json.packet.type] || 'UNKNOWN';
        console.log(`Gelen paket [type:${json.packet.type} ${typeName}] HEX:`, hex);
        if (json.message && json.message.keyExchange) {
          console.log('KEY_EXCHANGE içeriği (hex):', json.message.keyExchange.hex);
          console.log('KEY_EXCHANGE içeriği (base64):', json.message.keyExchange.base64);
          const hex = json.message.keyExchange.hex.replace(/ /g, '');
          if (hex.length === 192) {
            const bytes = hex.match(/.{1,2}/g).map(b => parseInt(b, 16));
            const x25519 = bytes.slice(0, 32);
            const ed25519_sign = bytes.slice(32, 64);
            const ed25519_id = bytes.slice(64, 96);
            console.log('  X25519 (şifreleme)   :', x25519.map(b=>b.toString(16).padStart(2,'0')).join(' '));
            console.log('  Ed25519 (imzalama)   :', ed25519_sign.map(b=>b.toString(16).padStart(2,'0')).join(' '));
            console.log('  Ed25519 (kimlik)     :', ed25519_id.map(b=>b.toString(16).padStart(2,'0')).join(' '));
          } else {
            console.log('UYARI: KEY_EXCHANGE payload uzunluğu beklenen 96 byte değil!');
          }
        } else if (json.message && json.message.payload) {
          console.log('Payload (hex):', json.message.payload.hex);
          console.log('Payload (base64):', json.message.payload.base64);
        } else if (json.packet.type === 4 && json.message) {
          console.log('Mesaj:', json.message);
        }
        if (json && json.packet && json.packet.type === 4 && json.message && json.message.content && json.message.content !== '[Hatalı paket]') {
          addMessage(
            json.message.content,
            json.message.sender === myNickname ? 'me' : 'them',
            json.message.timestamp,
            json.message.sender
          );
          return;
        }
      } catch (e) {
        console.log('JSON parse hatası:', e);
      }
    });
    document.getElementById('msg').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    addMessage('Connection successful! You can send messages.', 'them');
  } catch (e) {
    setStatus('statusConnectionFailed');
    addMessage('Error: ' + e, 'them');
  }
}

async function connect() {
  try {
    addMessage('Searching for device...', 'them');
    setStatus('statusRequesting');
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ services: [SERVICE_UUID] }]
    });
    addMessage('Device selected: ' + (device.name || device.id), 'them');
    connectedDevice = device;
    // Optionally store device id for debug
    try { localStorage.setItem('lastDeviceId', device.id); } catch(e){}
    await connectToDevice(device);
  } catch (e) {
    setStatus('statusNotConnected');
    addMessage('Error: ' + e, 'them');
  }
}

function generateNickname() {
  // Generate a random nickname for chat, not related to GitHub
  return 'web-' + Math.random().toString(36).slice(2, 8);
}
let myNickname = localStorage.getItem('nickname') || generateNickname();

document.addEventListener('DOMContentLoaded', () => {
  // Nickname formu
  const nickInput = document.getElementById('nick');
  nickInput.value = myNickname;
  document.getElementById('nickform').onsubmit = e => {
    e.preventDefault();
    myNickname = nickInput.value.trim() || generateNickname();
    localStorage.setItem('nickname', myNickname);
    nickInput.value = myNickname;
  };
  // Bağlan butonu
  document.getElementById('connectBtn').onclick = connect;
  // Mesaj gönderme formu
  document.getElementById('msgform').onsubmit = e => { e.preventDefault(); sendMsg(); };
  // Otomatik yeniden bağlanmayı dene
  tryReconnectKnownDevice();
  document.getElementById('disconnectBtn').onclick = disconnect;
  // Language switcher
  const langSel = document.getElementById('langSwitcher');
  langSel.value = getLang();
  langSel.onchange = e => setLang(langSel.value);
  applyLang(getLang());
});

function addMessage(text, sender, timestamp, senderName) {
  const chatbox = document.getElementById('chatbox');
  const msgDiv = document.createElement('div');
  msgDiv.className = 'msg';
  // Kullanıcı adı etiketi
  const nameTag = document.createElement('div');
  nameTag.className = 'name-tag';
  nameTag.textContent = senderName || (sender === 'me' ? myNickname : 'Bilinmeyen');
  // Mesaj balonu
  const bubble = document.createElement('div');
  bubble.className = 'bubble ' + (sender === 'me' ? 'me' : 'them');
  bubble.innerHTML = text;
  // Zaman etiketi
  const time = document.createElement('span');
  time.className = 'timestamp';
  time.textContent = timestamp ? new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '';
  // Avatar
  const avatar = document.createElement('div');
  avatar.className = 'avatar ' + (sender === 'me' ? 'me' : 'them');
  avatar.textContent = (nameTag.textContent[0] || 'U').toUpperCase();
  // Sıralama: avatar, nameTag, bubble, time
  if (sender === 'me') {
    msgDiv.appendChild(time);
    msgDiv.appendChild(bubble);
    msgDiv.appendChild(avatar);
  } else {
    msgDiv.appendChild(avatar);
    msgDiv.appendChild(bubble);
    msgDiv.appendChild(time);
  }
  // Kullanıcı adı balonun üstünde
  msgDiv.insertBefore(nameTag, msgDiv.children[sender === 'me' ? 1 : 1]);
  chatbox.appendChild(msgDiv);
  chatbox.scrollTop = chatbox.scrollHeight;
}

function parseBitchatMessage(buffer) {
  const arrBuf = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  const data = new DataView(arrBuf);
  let offset = 0;
  const flags = data.getUint8(offset); offset += 1;
  const isRelay = (flags & 0x01) !== 0;
  const isPrivate = (flags & 0x02) !== 0;
  const hasOriginalSender = (flags & 0x04) !== 0;
  const hasRecipientNickname = (flags & 0x08) !== 0;
  const hasSenderPeerID = (flags & 0x10) !== 0;
  const hasMentions = (flags & 0x20) !== 0;
  const hasChannel = (flags & 0x40) !== 0;
  const isEncrypted = (flags & 0x80) !== 0;
  if (offset + 8 > buffer.byteLength) return { content: '[Hatalı paket]' };
  const timestamp = Number(data.getBigUint64(offset, false)); offset += 8;
  if (offset + 1 > buffer.byteLength) return { content: '[Hatalı paket]' };
  const idLength = data.getUint8(offset); offset += 1;
  if (offset + idLength > buffer.byteLength) return { content: '[Hatalı paket]' };
  const id = new TextDecoder().decode(new Uint8Array(buffer, offset, idLength)); offset += idLength;
  if (offset + 1 > buffer.byteLength) return { content: '[Hatalı paket]' };
  const senderLength = data.getUint8(offset); offset += 1;
  if (offset + senderLength > buffer.byteLength) return { content: '[Hatalı paket]' };
  const sender = new TextDecoder().decode(new Uint8Array(buffer, offset, senderLength)); offset += senderLength;
  if (offset + 2 > buffer.byteLength) return { content: '[Hatalı paket]' };
  const contentLength = data.getUint16(offset, false); offset += 2;
  if (offset + contentLength > buffer.byteLength) return { content: '[Hatalı paket]' };
  let content = "";
  let encryptedContent = null;
  if (isEncrypted) {
    encryptedContent = new Uint8Array(buffer, offset, contentLength);
    offset += contentLength;
  } else {
    content = new TextDecoder().decode(new Uint8Array(buffer, offset, contentLength));
    offset += contentLength;
  }
  function safeReadOptString() {
    if (offset + 1 > buffer.byteLength) return [null, offset];
    const len = data.getUint8(offset); offset += 1;
    if (offset + len > buffer.byteLength) return [null, offset];
    const str = new TextDecoder().decode(new Uint8Array(buffer, offset, len));
    offset += len;
    return [str, offset];
  }
  const [originalSender] = hasOriginalSender ? safeReadOptString() : [null];
  const [recipientNickname] = hasRecipientNickname ? safeReadOptString() : [null];
  const [senderPeerID] = hasSenderPeerID ? safeReadOptString() : [null];
  let mentions = null;
  if (hasMentions && offset < buffer.byteLength) {
    if (offset + 1 > buffer.byteLength) return { content: '[Hatalı paket]' };
    const mentionCount = data.getUint8(offset); offset += 1;
    mentions = [];
    for (let i = 0; i < mentionCount; i++) {
      if (offset + 1 > buffer.byteLength) break;
      const mlen = data.getUint8(offset); offset += 1;
      if (offset + mlen > buffer.byteLength) break;
      mentions.push(new TextDecoder().decode(new Uint8Array(buffer, offset, mlen)));
      offset += mlen;
    }
  }
  const [channel] = hasChannel ? safeReadOptString() : [null];
  return {
    id, sender, content, timestamp, isRelay, originalSender, isPrivate,
    recipientNickname, senderPeerID, mentions, channel, encryptedContent, isEncrypted
  };
}

function encodeBitchatMessage({content, sender, id, timestamp}) {
  const encoder = new TextEncoder();
  const flags = 0x00;
  let idStr = id;
  if (!idStr || typeof idStr !== 'string' || idStr.length < 8) {
    if (window.crypto && window.crypto.randomUUID) {
      idStr = crypto.randomUUID();
    } else {
      idStr = Math.random().toString(36).slice(2, 10) + Date.now();
    }
  }
  const senderStr = sender && sender.length > 0 ? sender : myNickname;
  const contentStr = content && content.length > 0 ? content : '[Boş mesaj]';
  const ts = typeof timestamp === 'number' ? timestamp : Date.now();
  const idBytes = encoder.encode(idStr);
  const senderBytes = encoder.encode(senderStr);
  const contentBytes = encoder.encode(contentStr);
  const idLen = Math.min(idBytes.length, 255);
  const senderLen = Math.min(senderBytes.length, 255);
  const contentLen = Math.min(contentBytes.length, 65535);
  const totalLen = 1 + 8 + 1 + idLen + 1 + senderLen + 2 + contentLen;
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  buf[offset++] = flags;
  const tsBig = BigInt(ts);
  for (let i = 7; i >= 0; i--) {
    buf[offset++] = Number((tsBig >> BigInt(i*8)) & 0xFFn);
  }
  buf[offset++] = idLen;
  buf.set(idBytes.slice(0, idLen), offset); offset += idLen;
  buf[offset++] = senderLen;
  buf.set(senderBytes.slice(0, senderLen), offset); offset += senderLen;
  buf[offset++] = (contentLen >> 8) & 0xFF;
  buf[offset++] = contentLen & 0xFF;
  buf.set(contentBytes.slice(0, contentLen), offset); offset += contentLen;
  return buf;
}

function parseBitchatPacket(buffer) {
  const data = new DataView(buffer.buffer || buffer);
  let offset = 0;
  const version = data.getUint8(offset++);
  const type = data.getUint8(offset++);
  const ttl = data.getUint8(offset++);
  const timestamp = Number(data.getBigUint64(offset, false)); offset += 8;
  const flags = data.getUint8(offset++);
  const payloadLength = data.getUint16(offset, false); offset += 2;
  const senderID = Array.from(new Uint8Array(buffer.buffer || buffer, offset, 8)).map(b => b.toString(16).padStart(2, '0')).join('');
  offset += 8;
  let recipientID = null;
  if (flags & 0x01) { recipientID = Array.from(new Uint8Array(buffer.buffer || buffer, offset, 8)).map(b => b.toString(16).padStart(2, '0')).join(''); offset += 8; }
  const payload = buffer.slice(offset, offset + payloadLength);
  let message = null;
  if (type === 4) {
    message = parseBitchatMessage(payload.buffer || payload);
  } else if (type === 2) {
    const hex = Array.from(new Uint8Array(payload)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const base64 = btoa(String.fromCharCode(...new Uint8Array(payload)));
    message = { keyExchange: { hex, base64 } };
  } else {
    const hex = Array.from(new Uint8Array(payload)).map(b => b.toString(16).padStart(2, '0')).join(' ');
    const base64 = btoa(String.fromCharCode(...new Uint8Array(payload)));
    message = { payload: { hex, base64 } };
  }
  return { packet: { version, type, ttl, timestamp, flags, payloadLength, senderID, recipientID }, message };
}

function encodeBitchatPacket({type, senderID, payload, recipientID, signature, ttl}) {
  const encoder = new TextEncoder();
  const version = 1;
  const typeByte = type || 4;
  const ttlByte = ttl || 7;
  const timestamp = Date.now();
  let flags = 0;
  if (recipientID) flags |= 0x01;
  if (signature) flags |= 0x02;
  const payloadLen = payload.length;
  let totalLen = 1 + 1 + 1 + 8 + 1 + 2 + 8 + (recipientID ? 8 : 0) + payloadLen + (signature ? 64 : 0);
  const buf = new Uint8Array(totalLen);
  let offset = 0;
  buf[offset++] = version;
  buf[offset++] = typeByte;
  buf[offset++] = ttlByte;
  const tsBig = BigInt(timestamp);
  for (let i = 7; i >= 0; i--) buf[offset++] = Number((tsBig >> BigInt(i*8)) & 0xFFn);
  buf[offset++] = flags;
  buf[offset++] = (payloadLen >> 8) & 0xFF;
  buf[offset++] = payloadLen & 0xFF;
  let senderBytes = typeof senderID === 'string' ? encoder.encode(senderID) : senderID;
  if (senderBytes.length < 8) {
    let tmp = new Uint8Array(8);
    tmp.set(senderBytes);
    senderBytes = tmp;
  }
  buf.set(senderBytes.slice(0,8), offset); offset += 8;
  if (recipientID) {
    let recipBytes = typeof recipientID === 'string' ? encoder.encode(recipientID) : recipientID;
    if (recipBytes.length < 8) {
      let tmp = new Uint8Array(8).fill(0xFF);
      tmp.set(recipBytes);
      recipBytes = tmp;
    }
    buf.set(recipBytes.slice(0,8), offset); offset += 8;
  }
  buf.set(payload, offset); offset += payloadLen;
  if (signature) {
    buf.set(signature, offset); offset += 64;
  }
  return buf;
}

async function sendMsg() {
  const input = document.getElementById('msg');
  const msg = input.value.trim();
  if (!characteristic || !msg) return;
  const messagePayload = encodeBitchatMessage({
    content: msg,
    sender: myNickname,
    timestamp: Date.now()
  });
  const packet = encodeBitchatPacket({
    type: 4,
    senderID: myNickname.slice(0,8),
    payload: messagePayload,
    recipientID: null,
    signature: null,
    ttl: 7
  });
  await characteristic.writeValue(packet);
  // addMessage(msg, 'me', Date.now());
  input.value = '';
} 