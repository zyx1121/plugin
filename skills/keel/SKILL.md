---
name: keel
description: "Operate keel — Loki's git-driven LXC orchestrator on PVE (the deploy platform; Vercel-like CD to systemd-in-LXC) — deploy / rollback / logs / provision / destroy services the front-door way. Use when deploying a service to the homelab, binding a repo for auto-deploy, checking why a deploy failed, or decommissioning a service. Triggers on 'keel', 'deploy 到 lab', '部署服務', '開新服務', 'bind repo', 'rollback', '服務掛了看 log', 'destroy service', '下架服務'. NOT for raw VM/CT lifecycle or gateway routes without a service — 那是 zyx:pve."
---

# keel — git-driven LXC orchestrator

一句話:PVE 上的 Vercel。repo bind 之後 push 即部署(GitHub App webhook → keel 在目標 LXC 內 git pull + build + systemd)。**PVE 上唯一的服務部署平台** —— 新服務一律走它,不手搓 LXC + systemd。

- **本體**:repo `zyx1121/keel`(`~/keel`,Bun+TS,手刻 JSON-RPC over Bun.serve)· 跑在 **LXC 201**(`10.10.10.201:8080`)· registry 在本地 PG(schema `keel.*`)。
- **對外**:`https://keel.app.zyx.tw`(gateway Caddy → 201:8080)。MCP 端點 `/mcp`(bearer)。
- **設定/token**:LXC 201 `/etc/keel/keel.env`(`DATABASE_URL` / `MCP_WRITE_TOKEN` / `WEBHOOK_SECRET` ⋯)。

## 入口(優先序)

1. **keel MCP**(`mcp__keel__*`,user-scope 已註冊,Kilo 的 Mac 上開箱即用):
   `list_services` · `status` · `deploy` · `rollback` · `logs` · `provision_ct` · `bind_repo` · `bind_service` · `unbind_service` · `destroy_service` · `set_secret` · `list_secret_keys`
2. **ssh 直達**(MCP 不通時):`ssh pve 'pct exec 201 -- …'`;DB 查詢 `source /etc/keel/keel.env; psql "$DATABASE_URL"`。

## 部署慣例(開新服務照抄)

- 一服務一 LXC;**VMID = IP 尾碼**(`10.10.10.<vmid>`);新服務從 **206** 起。
- 服務**直接綁 `:80`**(DNS-only 內網路由,consumer 不帶 port)。port <1024 keel 自動加 `AmbientCapabilities=CAP_NET_BIND_SERVICE`,repo 的 `keel.yaml` 設 `port: 80` 即可,不手動 systemd override。
- 流程:`provision_ct` → `bind_repo`(掛 GitHub App)→ push 即部署;對外域名再走 `zyx:pve` 的 caddy 加 route。

## 正門語意(硬規則,踩過的坑)

- **下架服務走 `destroy_service`,不要裸 `pct destroy`** —— keel 的 registry 語意是 services **不硬刪**(標 `status='destroyed'`,`audit_log` 有 FK 擋著),routes/bindings 才刪。
- 若已在 PVE 層直接滅了 CT(例如 `utils pve destroy` 的 cascade):**回 keel DB 補狀態**,否則留 orphan 註冊,下次 push 會對不存在的 CT 部署。補法(在 201 內):
  ```sql
  update keel.services set status = 'destroyed', updated_at = now() where id = <id>;
  delete from keel.routes where service_id = <id>;
  delete from keel.repo_bindings where service_id = <id>;
  ```
  (2026-07-03 實例:danmu/otel-collector/agent-store 三個 orphan 就是這樣清的。)
- deploy log 必記 git SHA(KILO.md container-tag 慣例);rollback 以 SHA 為準。

## 排錯順序

1. `status` / `logs`(MCP)看 deploy 結果與服務輸出。
2. 內網連不通:先驗 DNS/hosts —— split-horizon 對 systemd-resolved 不可靠,VM 端用 `/etc/hosts` 靜態條目(見 memory `project_keel_lxc_orchestrator` 的 VM103 案例)。
3. registry 與現實對不上(service 列著但 CT 不在):按上面補狀態 SQL 對齊。
