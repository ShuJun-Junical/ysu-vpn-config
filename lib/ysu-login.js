import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import CryptoJS from 'crypto-js';
// import { encryptPassword } from './wisedu-pwd-encrypt.js';

// import { HttpsProxyAgent } from 'https-proxy-agent';
// const proxy = 'http://192.168.233.234:8888';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const captcha =
  'https://cer.ysu.edu.cn/authserver/checkNeedCaptcha.htl?username=';
const url = 'https://cer.ysu.edu.cn/authserver/login';
const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export default async function (userName, passwd) {
  // 访问登录页面，获取salt和execution
  const response = await fetch(url);
  const body = await response.text();
  const cookie = parseCookies(response);
  const dom = new JSDOM(body);
  const document = dom.window.document;
  const salt = document.getElementById('pwdEncryptSalt').value;

  //检查用户是否受风控
  const capRes = await fetch(captcha + userName);
  if (!capRes.ok) throw new Error('请求错误');
  if ((await capRes.json()).isNeed) throw new Error('请先手动登录完成人机验证');

  //构建登录请求体
  const encedPwd = encryptPassword(passwd, salt);
  const params = new URLSearchParams();
  params.append('_eventId', document.getElementById('_eventId').value);
  params.append('lt', '');
  params.append('captcha', '');
  params.append('cllt', 'userNameLogin');
  params.append('dllt', 'generalLogin');
  params.append('rememberMe', 'true');
  params.append('execution', document.getElementById('execution').value);
  params.append('username', userName);
  params.append('password', encedPwd);

  const response2 = await fetch(url, {
    method: 'POST',
    body: params,
    redirect: 'manual',
    headers: {
      'User-Agent': ua,
      Referer: url,
      Cookie: cookie,
    },
    // agent: new HttpsProxyAgent(proxy),
  });

  if (response2.status === 200) throw new Error('登录失败');
  if (response2.status === 401) throw new Error('401登录失败');
  if (response2.status === 302) return parseCookies(response2);
}

function parseCookies(response) {
  const rawCookies = response.headers.raw()['set-cookie'];
  return rawCookies.map(entry => entry.split(';')[0]).join('; ');
}

//以下为学校官网原装密码加密算法代码
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
function encryptPassword(pwd, salt) {
  try {
    return encryptAES(pwd, salt);
  } catch (c) {}
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
function decryptPassword(n, f) {
  var c = CryptoJS.enc.Utf8.parse(f),
    q = CryptoJS.enc.Utf8.parse(randomString(16)),
    c = CryptoJS.AES.decrypt(n, c, {
      iv: q,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });
  return CryptoJS.enc.Utf8.stringify(c).substring(64);
}
