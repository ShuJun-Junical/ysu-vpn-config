import CryptoJS from 'crypto-js';

function getAesString(n, f, c) {
  f = f.replace(/(^\s+)|(\s+$)/g, '');
  f = CryptoJS.enc.Utf8.parse(f);
  c = CryptoJS.enc.Utf8.parse(c);
  return CryptoJS.AES.encrypt(n, f, {
    iv: c,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
}
function encryptAES(n, f) {
  return f ? getAesString(randomString(64) + n, f, randomString(16)) : n;
}
export function encryptPassword(pwd, salt) {
  try {
    return encryptAES(pwd, salt);
  } catch (c) {
    console.log(c);
  }
  return pwd;
}
var $aes_chars = 'ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678',
  aes_chars_len = $aes_chars.length;
function randomString(n) {
  var f = '';
  for (let i = 0; i < n; i++)
    f += $aes_chars.charAt(Math.floor(Math.random() * aes_chars_len));
  return f;
}
export function decryptPassword(n, f) {
  var c = CryptoJS.enc.Utf8.parse(f),
    q = CryptoJS.enc.Utf8.parse(randomString(16)),
    c = CryptoJS.AES.decrypt(n, c, {
      iv: q,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
  return CryptoJS.enc.Utf8.stringify(c).substring(64);
}
