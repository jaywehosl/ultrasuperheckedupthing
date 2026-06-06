# Ultra Uber Panel (3X-UI Antigravity Edition)

[English](/README.md) | [Русский](/README.ru_RU.md)

An advanced, premium-styled web control panel for managing [Xray-core](https://github.com/XTLS/Xray-core) servers, redesigned with a high-end **Google Antigravity** visual theme, single-page dashboard layout, and localized diagnostics.

This is a custom edition of the 3X-UI control panel. It removes page division in favor of a single continuous feed, introduces responsive glassmorphism styles, and integrates an organic particle gravity engine.

---

## Key Enhancements

* **Antigravity Particle Engine**: A global `<GravityVortexCanvas />` renders an organic particle swarm. Orbiting rings distort dynamically with waves and swirl cyclone-style around the user's cursor.
* **Single-Page Dashboard (SPA)**: Telemetry, inbounds, clients, groups, nodes, and system status widgets are consolidated into a single vertical scrolling landing page.
* **Premium Glassmorphic Styling**: Transparent overlays, harmonious color palettes, and `backdrop-filter: blur(16px)` allow the particle vortex to be viewed clearly behind content cards.
* **Localization Fixes**: Fully translated server telemetry, dashboard statistics, and diagnostic sections in Russian and English.
* **Local Dev & Automation Scripts**: Added local runner (`run.sh`) and build-and-deploy server script (`deploy.sh`).

---

## Quick Start

### 1. One-click Installation (Recommended)
You can deploy this custom precompiled Antigravity edition directly on any Linux AMD64 VPS with a single command:

```bash
bash <(curl -Ls https://raw.githubusercontent.com/jaywehosl/ultrasuperheckedupthing/main/install.sh)
```

This installer script will automatically fetch our latest custom binary release from GitHub Releases, register systemd service endpoints, and configure dependencies.

### 2. Run Locally (Developer Mode)
Prerequisites: Go 1.21+ and Node.js 18+.

```bash
# Clone the repository
git clone https://github.com/jaywehosl/ultrasuperheckedupthing.git
cd ultrasuperheckedupthing

# Build assets and start local dev server
chmod +x run.sh
./run.sh
```

### 3. Build & Deploy from Source on Server
To build the assets, compile the Go binary, and register the systemd service on a Linux machine:

```bash
sudo chmod +x deploy.sh
sudo ./deploy.sh
```

---

## Project Structure

* `/frontend`: React + TypeScript Single Page Application.
* `/web`: Go web server, REST API, controllers, and translation dictionaries.
* `/xray`: Go wrapper for interacting with the Xray-core daemon.
* `/util`, `/logger`, `/sub`: Helper modules, logging, subscription engine, and utils.
* `/install.sh`, `/update.sh`: Classic installer scripts.
