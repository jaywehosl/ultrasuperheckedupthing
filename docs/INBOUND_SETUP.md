# Creating inbounds on a turnkey (reverse-proxy + cookie-gate) install

> 🇷🇺 Русская версия: [INBOUND_SETUP.ru-RU.md](INBOUND_SETUP.ru-RU.md)

This guide is specific to the **recommended turnkey deployment** (see the
[README](../README.md) and the [nginx template](nginx-template.md)). It covers
two inbounds the operator creates **in the panel UI**:

1. **VLESS · TCP · Reality** with a **selfsteal/selfsni** domain
2. **Hysteria2**

For generic inbound/client management, use the upstream
[3X-UI](https://github.com/MHSanaei/3x-ui) docs — here we only cover what's
specific to this install.

---

## Why External Proxy + `forceTls = same` is required here

On this deployment the public TLS front on **:443** is **Xray VLESS Reality**,
which impersonates the *selfsteal* domain and relays non-VLESS traffic to nginx
(panel / sub / decoy) over a unix socket. Because of that front, the address an
inbound *binds to* is **not** the address clients must dial, and the panel can't
always infer the public endpoint on its own.

So for these inbounds you add an **External Proxy** row, which overrides the
**dest + port (+ SNI)** written into every generated share link / subscription,
while `forceTls = same` keeps the inbound's own security (Reality / TLS) in the
link unchanged. In short:

> **External Proxy → `Force TLS = same`, `Address = <public domain>`,
> `Port = 443`.** This is what makes the share links point clients at the real
> public endpoint with the right SNI.

Fields (from the panel's External Proxy row): `Force TLS` (`same` / `tls` /
`none`), `Address` (dest), `Port`, `SNI`, `Remark`.

---

## 1. VLESS · TCP · Reality + selfsteal (selfsni)

**Inbounds → Add inbound.**

1. **Protocol:** VLESS.
2. **Listen IP:** leave empty / `0.0.0.0` (or `127.0.0.1` if Xray fronts via the
   socket — match your install). **Port:** `443`.
3. **Transmission:** TCP.
4. **Security:** Reality.
5. **Reality settings:**
   - **Dest / Target:** the selfsteal upstream the install uses — the unix socket
     (`/dev/shm/xui.sock`) or `127.0.0.1:8443` fallback, with **xver = 1**
     (PROXY protocol) so nginx behind it gets the real client IP.
   - **Server Names (SNI):** your **selfsteal domain** (the decoy hostname Reality
     impersonates — the same `SELFSTEAL_DOMAIN` from install).
   - **Keys:** generate the Reality key pair (the form has a generate button);
     add one or more **shortIds**.
   - **uTLS / fingerprint:** `chrome` (a sane default).
6. **Add a client** (UUID auto-generated; set email/flow as needed —
   `xtls-rprx-vision` is typical for VLESS Reality TCP).
7. **External Proxy (required):** add one row:
   - **Force TLS:** `same`
   - **Address:** your **selfsteal domain**
   - **Port:** `443`
   - **SNI:** the selfsteal domain (same as Server Names)
   - **Remark:** e.g. `reality`
8. **Save.**

Now the share link / subscription advertises
`vless://…@<selfsteal-domain>:443?security=reality&sni=<selfsteal-domain>&fp=chrome&pbk=…&sid=…&flow=xtls-rprx-vision`
— clients connect to the public 443 Reality front, and unauthenticated probes
just see the decoy site.

---

## 2. Hysteria2

Hysteria2 is **UDP/QUIC** with its **own TLS** — it does **not** go through the
nginx TLS front, so it needs its own UDP port and a certificate.

**Inbounds → Add inbound.**

1. **Protocol:** Hysteria2.
2. **Listen IP:** `0.0.0.0`. **Port:** a free **UDP** port (e.g. `443/udp` can
   coexist with the `443/tcp` Reality front, or pick another, e.g. `8443`).
3. **TLS:** point **cert / key** at the certificates the installer issued
   (the Let's Encrypt cert for your domain, e.g. under `/etc/x-ui/...` or the
   path the install printed). Set the **SNI / domain** to that certificate's
   domain.
4. **(Optional) obfs:** enable Salamander obfuscation with a password for extra
   camouflage.
5. **Bandwidth:** set up/down if you want client-side congestion hints.
6. **Add a client** (password auto-generated).
7. **External Proxy (required here too):** add one row so the link points at the
   public host:
   - **Force TLS:** `same`
   - **Address:** the domain whose cert you used
   - **Port:** the UDP port from step 2
   - **SNI:** that domain
   - **Remark:** e.g. `hy2`
8. **Open the UDP port** on the firewall / provider security group.
9. **Save.**

The share link advertises
`hysteria2://<password>@<domain>:<udp-port>?sni=<domain>[&obfs=salamander&obfs-password=…]`.

---

## Verifying

- **Copy URL / QR** on the client row, or open the **subscription** link — confirm
  the host is your **public domain** (not `127.0.0.1` / an internal bind) and the
  SNI/port are what you set. If you see an internal address, the **External Proxy**
  row is missing or wrong.
- A browser hitting the **selfsteal domain** should show the decoy site; the panel
  stays invisible without the cookie-gate link.

> Reminder: don't change the panel/sub **port, path, or domain** casually after
> deployment — the in-app safety guard warns you, and it can break the proxy
> contract. See the [User Guide](USER_GUIDE.md).
