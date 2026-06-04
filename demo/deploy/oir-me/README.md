# oir.me 二级域名分发

这份配置把 `oir.me` 和 `*.oir.me` 都收进同一台服务器，再按请求的 Host 转发到不同本地服务。

## 你需要在域名后台添加的 DNS 记录

| 类型 | 主机记录 | 值 |
| --- | --- | --- |
| A | @ | 104.248.150.29 |
| A | * | 104.248.150.29 |
| A | www | 104.248.150.29 |

如果域名托管在 Cloudflare，初次签证书时建议先设为 DNS only，等证书签好后再决定是否打开代理。

## 当前分发规则

| 域名 | 转发到 | 服务 |
| --- | --- | --- |
| oir.me | http://127.0.0.1:3100 | Paperclip / IOPC |
| www.oir.me | http://127.0.0.1:3100 | Paperclip / IOPC |
| app.oir.me | http://127.0.0.1:3100 | Paperclip / IOPC |
| board.oir.me | http://127.0.0.1:3100 | Paperclip / IOPC |
| code.oir.me | http://127.0.0.1:4096 | OpenCode Web |
| status.oir.me | http://127.0.0.1:3001 | Uptime Kuma |
| analytics.oir.me | http://127.0.0.1:3000 | Umami |

## 服务器安装步骤

```bash
sudo cp deploy/oir-me/nginx.conf /etc/nginx/sites-available/oir.me
sudo ln -sf /etc/nginx/sites-available/oir.me /etc/nginx/sites-enabled/oir.me
sudo mkdir -p /var/www/certbot
sudo nginx -t
sudo systemctl reload nginx
```

DNS 生效后再签 HTTPS：

```bash
sudo certbot --nginx --redirect \
  -d oir.me \
  -d www.oir.me \
  -d app.oir.me \
  -d board.oir.me \
  -d code.oir.me \
  -d status.oir.me \
  -d analytics.oir.me
```

通配 HTTPS 如果要覆盖未来任意新子域名，需要 DNS-01 wildcard 证书，例如 `oir.me` + `*.oir.me`。这一步通常要接 Cloudflare API token 或手工添加 TXT 验证记录。
