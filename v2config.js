export default vpnCookie => `{
  "log": {
    "loglevel": "warning"
  },
  "routing": {
    "domainStrategy": "AsIs",
    "rules": [
      {
        "type": "field",
        "ip": [
          "geoip:private"
        ],
        "outboundTag": "proxy"
      }
    ]
  },
  "inbounds": [
    {
      "listen": "127.0.0.1",
      "port": "1080",
      "protocol": "socks",
      "settings": {
        "auth": "noauth",
        "udp": true,
        "ip": "127.0.0.1"
      }
    },
    {
      "listen": "127.0.0.1",
      "port": "1081",
      "protocol": "http"
    }
  ],
  "outbounds": [
    {
      "protocol": "vmess",
      "settings": {
        "vnext": [
          {
            "address": "example-1234-p.vpn.ysu.edu.cn",
            "port": 8118,
            "users": [
              {
                "id": "example-user-id"
              }
            ]
          }
        ]
      },
      "streamSettings": {
        "network": "ws",
        "wsSettings": {
          "headers": {
            "Cookie": "${vpnCookie}"
          }
        }
      },
      "tag": "proxy"
    },
    {
      "protocol": "freedom",
      "tag": "direct"
    }
  ]
}
`;
