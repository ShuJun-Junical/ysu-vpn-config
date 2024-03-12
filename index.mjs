import login from './lib/ysu-login.js';
import v2config from './v2config.js';
import fetch from 'node-fetch';
import FC from '@alicloud/fc20230330';

// import { HttpsProxyAgent } from 'https-proxy-agent';
// const proxy = 'http://192.168.233.234:8888';
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const ua =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const vpnLoginUrl =
  'http://cer-ysu-edu-cn-s.vpn.ysu.edu.cn:8118/authserver/login?service=https%3A%2F%2Fvpn.ysu.edu.cn%2Fauth%2Fcas_validate%3Fentry_id%3D1';
const vpnCheckUrl = 'http://ysu-edu-cn.vpn.ysu.edu.cn:8118/';
const envKeys = {
  username: 'YSU_username',
  password: 'YSU_password',
  loginCookie: 'cookie_login', // 学校统一认证登录态 Cookie，有效期为七天（还是 14 天，不清楚）
  vpnCookie: 'cookie_vpn', // 深信服 vpn 登录态 Cookie（TWFID），有效期较短，几个小时到一天左右
};

// main();

export const handler = aliyunFcHandler;

async function aliyunFcHandler(event, context) {
  const loginCookie = process.env[envKeys.loginCookie];
  const vpnCookie = process.env[envKeys.vpnCookie];
  const res = await main(loginCookie, vpnCookie);

  // 如果预存 vpnCookie 能用，就直接拼接 v2 配置文件返回
  if (!res.vpnCookie)
    return {
      statusCode: 200,
      body: v2config(vpnCookie),
    };

  // 其他情况需要修改阿里云函数的环境变量
  const newEnv = {
    [envKeys.username]: process.env[envKeys.username],
    [envKeys.password]: process.env[envKeys.password],
    [envKeys.vpnCookie]: res.vpnCookie,
    [envKeys.loginCookie]: res.loginCookie || process.env[envKeys.loginCookie], // 判断是否需要更新 loginCookie
  };
  const fc = new FC.default({
    endpoint: `${context.accountId}.${context.region}.fc.aliyuncs.com`,
    accessKeyId: context.credentials.accessKeyId,
    accessKeySecret: context.credentials.accessKeySecret,
    securityToken: context.credentials.securityToken,
    type: 'sts',
    regionId: context.region,
  });
  await fc.updateFunction(context.function.name, {
    body: {
      environmentVariables: newEnv,
    },
  });
  return {
    statusCode: 200,
    body: v2config(res.vpnCookie),
  };
}

async function main(loginCookie, vpnCookie) {
  // 先检查现有 vpnCookie 是否能用，能用就不再进行后续操作
  if (await checkVpnCookie(vpnCookie))
    return {
      vpnCookie: false,
    };

  // 现有 vpnCookie 不能用或者没有 Cookie，需要使用 loginCookie 重新获取 vpnCookie
  // 尝试用 loginCookie 获取 vpnCookie
  const res = await getVpnCookie(loginCookie);
  // 获取失败，可能是 loginCookie 过期或根本没有登录态，执行登录逻辑获取新 loginCookie，然后再次尝试获取 vpnCookie
  if (!res) {
    loginCookie = await login1();
    const retry = await getVpnCookie(loginCookie);
    if (!retry) throw new Error('未知错误');
    return {
      loginCookie,
      vpnCookie: retry,
    };
  }
  return {
    loginCookie: false,
    vpnCookie: res,
  };
}

async function login1() {
  const username = process.env[envKeys.username];
  const password = process.env[envKeys.password];
  if (!username || !password)
    throw new Error('环境变量中未正确配置用户名和密码');
  return await login(username, password);
}

async function getVpnCookie(loginCookie) {
  const response = await fetch(vpnLoginUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'User-Agent': ua,
      Cookie: loginCookie,
    },
  });
  if (response.status !== 302) return false;
  const response2 = await fetch(response.headers.get('Location'), {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'User-Agent': ua,
    },
  });
  return parseCookies(response2);
}

function parseCookies(response) {
  const rawCookies = response.headers.raw()['set-cookie'];
  return rawCookies.map(entry => entry.split(';')[0]).join('; ');
}

async function checkVpnCookie(vpnCookie) {
  const response = await fetch(vpnCheckUrl, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'User-Agent': ua,
      Cookie: vpnCookie,
    },
  });
  return response.status === 200;
}
