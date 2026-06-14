# Шаблон nginx для реверс-прокси

> 🇬🇧 English version: [nginx-template.md](nginx-template.md)

Референс-конфиг, лежащий в основе **рекомендуемой turnkey-установки реверс-прокси +
cookie-gate**. Установщик рендерит его (в стиле envsubst) в
`/etc/x-ui/nginx/xui.conf` и перезагружает nginx. Здесь описан реальный
конфиг — читайте, чтобы понять развёртывание или адаптировать его вручную.

## Как это устроено в стеке

```
:443  Xray VLESS Reality (serverNames=[SELFSTEAL_DOMAIN], xver=1)
        ├─ авторизованный VLESS  → проксируется (реальный трафик)
        └─ всё остальное         → realitySettings.dest = unix:/dev/shm/xui.sock
                                   (сырой TLS реле сюда, с заголовком PROXY protocol)
                                          │
                                   nginx (этот конфиг) терминирует TLS, vhost по SNI:
                                     PANEL_DOMAIN     → 127.0.0.1:WEB_PORT  (панель, HTTP)
                                     SUB_DOMAIN       → 127.0.0.1:SUB_PORT  (подписка, HTTP)
                                     SELFSTEAL_DOMAIN → /var/www/SELFSTEAL  (статичная заглушка)
                                     всё прочее       → 444 (drop)
```

- nginx слушает ТОЛЬКО unix-сокет (`/dev/shm/xui.sock`) — на TCP-порту нечего
  сканировать. `ssl` + `proxy_protocol`, потому что Xray реле оригинального TLS
  ClientHello с заголовком PROXY (Reality `xver=1`).
- панель + подписка работают по plain HTTP на 127.0.0.1 (TLS терминируется здесь).
  Поэтому при установке `webCertFile`/`subCertFile` ПУСТЫЕ, а
  `listenIP=subListen=127.0.0.1`.
- Реальный IP клиента восстанавливается из заголовка PROXY protocol.

## Переменные рендера (заполняет установщик)

| переменная | смысл |
|-----|---------|
| `PANEL_DOMAIN` `SUB_DOMAIN` `SELFSTEAL_DOMAIN` | три хоста |
| `WEB_PORT` `SUB_PORT` | localhost-порты панели/подписки |
| `WEB_BASE_PATH` | base path панели (`/` при cookie-gate, иначе `/<random>/`) |
| `*_CERT` `*_KEY` | пути к cert/key — один wildcard-набор (CF DNS-01) или 3 по доменам |
| `COOKIE_KEY` `COOKIE_VAL` | секрет cookie-gate (только при стиле 2) |
| `SELFSTEAL_ROOT` | `/var/www/<SELFSTEAL_DOMAIN>` (каталог заглушки) |

Блоки `# >>> COOKIE-GATE` … `# <<<` эмитятся ТОЛЬКО для стиля доступа 2
(cookie-gate). Для стиля 1 (webBasePath) опускаются полностью.

---

```nginx
# ── /etc/x-ui/nginx/xui.conf ──────────────────────────────────────────────
# Recover the real client IP from the PROXY protocol header Xray prepends.
set_real_ip_from 127.0.0.1;
set_real_ip_from unix:;
real_ip_header proxy_protocol;

# Modern TLS only (matches eGames hardening).
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ecdh_curve X25519:prime256v1:secp384r1;
ssl_prefer_server_ciphers on;
ssl_session_timeout 1d;
ssl_session_cache shared:XUISSL:10m;
ssl_session_tickets off;

upstream xui_panel { server 127.0.0.1:${WEB_PORT}; keepalive 16; }
upstream xui_sub   { server 127.0.0.1:${SUB_PORT};  keepalive 16; }

# >>> COOKIE-GATE (access style 2 only)
# A request is "authorized" if it carries the secret cookie OR the secret query
# arg (the one-time entry link). The entry link also sets the cookie for a year.
map $http_cookie $has_auth_cookie {
    default 0;
    "~*${COOKIE_KEY}=${COOKIE_VAL}" 1;
}
map $arg_${COOKIE_KEY} $has_auth_query {
    default 0;
    "${COOKIE_VAL}" 1;
}
map "$has_auth_cookie$has_auth_query" $authorized {
    "00" 0;
    default 1;
}
map $arg_${COOKIE_KEY} $set_auth_cookie {
    "${COOKIE_VAL}" "${COOKIE_KEY}=${COOKIE_VAL}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=31536000";
    default "";
}
# <<< COOKIE-GATE

# ── Panel vhost ───────────────────────────────────────────────────────────
server {
    listen unix:/dev/shm/xui.sock ssl proxy_protocol;
    http2 on;
    server_name ${PANEL_DOMAIN};

    ssl_certificate     ${PANEL_CERT};
    ssl_certificate_key ${PANEL_KEY};

    # Branded error pages (active-probe bait: looks like a real app, not nginx).
    # Full common set → two glass templates (generic 4xx / 5xx). server_tokens
    # off so no nginx version leaks.
    error_page 400 401 403 404 405 429 /__xui_4xx.html;
    error_page 500 502 503 504        /__xui_5xx.html;
    location = /__xui_4xx.html { root /etc/x-ui/errorpages; internal; }
    location = /__xui_5xx.html { root /etc/x-ui/errorpages; internal; }

    # >>> COOKIE-GATE (access style 2 only)
    add_header Set-Cookie $set_auth_cookie;
    if ($authorized = 0) { return 404; }   # no secret → indistinguishable 404
    # <<< COOKIE-GATE

    # Panel WebSocket (live status) — /ws under the base path.
    location ${WEB_BASE_PATH}ws {
        proxy_pass http://xui_panel;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 3600s;
    }

    location / {
        proxy_pass http://xui_panel;
        proxy_set_header Host $host;            # = PANEL_DOMAIN → webDomain pin passes
        # CRITICAL: the panel/sub derive the SHARE-LINK host as
        # X-Forwarded-Host > X-Real-IP > Host. Without X-Forwarded-Host it falls
        # to X-Real-IP = the requester's IP, so every fetched vless:// link
        # carries whoever's IP downloaded it. Always send X-Forwarded-Host.
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# ── Subscription vhost ────────────────────────────────────────────────────
server {
    listen unix:/dev/shm/xui.sock ssl proxy_protocol;
    http2 on;
    server_name ${SUB_DOMAIN};

    ssl_certificate     ${SUB_CERT};
    ssl_certificate_key ${SUB_KEY};

    error_page 400 401 403 404 /__xui_404.html;
    location = /__xui_404.html { root /etc/x-ui/errorpages; internal; }

    location / {
        proxy_pass http://xui_sub;
        proxy_set_header Host $host;            # = SUB_DOMAIN → subDomain pin passes
        proxy_set_header X-Forwarded-Host $host;   # CRITICAL — see panel vhost note
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}

# ── Self-steal decoy vhost (the SNI Reality impersonates) ─────────────────
server {
    listen unix:/dev/shm/xui.sock ssl proxy_protocol;
    http2 on;
    server_name ${SELFSTEAL_DOMAIN};

    ssl_certificate     ${SELFSTEAL_CERT};
    ssl_certificate_key ${SELFSTEAL_KEY};

    root ${SELFSTEAL_ROOT};
    index index.html;
    location / { try_files $uri $uri/ =404; }
}

# ── Catch-all: unknown SNI gets dropped (no information leak) ──────────────
server {
    listen unix:/dev/shm/xui.sock ssl proxy_protocol default_server;
    server_name _;
    ssl_certificate     ${SELFSTEAL_CERT};   # any valid cert; never really shown
    ssl_certificate_key ${SELFSTEAL_KEY};
    return 444;                               # close connection, say nothing
}
```

---

## Заметки / решения по шаблону

- **Раскладка сертификатов:** с Cloudflare DNS-01 выпускаем ОДИН wildcard `*.base`
  (+base) и направляем все `*_CERT/*_KEY` на него. С HTTP-01 — 3 отдельных
  сертификата, по паре на блок. Шаблон одинаков; различаются только пути.
- **`dest` = unix-сокет vs `127.0.0.1:8443`:** основной — unix-сокет
  (`/dev/shm/xui.sock`, проверено у eGames, ничего на TCP-порту). Если конкретная
  сборка Xray не принимает unix-сокет в Reality `dest`, фолбэк —
  `listen 127.0.0.1:8443 ssl proxy_protocol` + `realitySettings.dest=127.0.0.1:8443`.
- **http2 on** на каждый server (синтаксис nginx ≥1.25). На старом nginx —
  `listen ... http2`. Установщик определяет версию nginx.
- **`if` в cookie-gate:** единственный `if ($authorized = 0)` — документированно
  безопасное применение `if` в nginx (только `return`). `add_header Set-Cookie` на
  входной ссылке взводит cookie; последующие визиты проходят по cookie-map.
- Панель/подписка сами отдают 403 на чужой Host (DomainValidator), так что прокси —
  это эшелонированная защита, а не единственный страж.
- Страницы ошибок `__xui_4xx.html` / `__xui_5xx.html` пишет **инлайн сам
  `install.sh`** в `/etc/x-ui/errorpages/` (в релизный архив не кладутся). Сейчас
  это **минимальные заглушки** — крошечная тёмная страница; `5xx` пока просто
  копия `4xx` (то есть на 5xx тоже видно «404»). Нормальные брендированные
  glass-страницы на полный набор ошибок — в TODO. `server_tokens off` скрывает
  версию nginx; catch-all (неизвестный SNI) остаётся `444` (тихий drop).
- Веб-сервер пока **только nginx** (вариант Caddy возможен позже).
