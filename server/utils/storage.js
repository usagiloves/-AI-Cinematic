const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function getFilePath(key) {
  return path.join(dataDir, `${key}.json`);
}

function get(key) {
  const file = getFilePath(key);
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`Storage read error [${key}]:`, e.message);
  }
  return null;
}

function set(key, data) {
  const file = getFilePath(key);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(`Storage write error [${key}]:`, e.message);
  }
}

function appendToArray(key, item) {
  const arr = get(key) || [];
  arr.push(item);
  // Keep max 500 items
  if (arr.length > 500) arr.splice(0, arr.length - 500);
  set(key, arr);
}

function remove(key) {
  const file = getFilePath(key);
  try {
    if (fs.existsSync(file)) fs.unlinkSync(file);
  } catch (e) {
    console.error(`Storage delete error [${key}]:`, e.message);
  }
}

module.exports = { get, set, appendToArray, remove };
