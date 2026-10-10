---
name: nextjs-dev
description: "Loki 的 Next.js 16 house style，從 16 個真實 repo 抽出來的個人慣例: 開新專案就照這個 scaffold，也用來 review/audit 舊專案的一致性。Use when starting / writing a Next.js App Router project or reviewing a Next.js repo against the house style. Triggers on 'new next app', 'next 專案', 'scaffold next', '建 next 專案', 'review 我的 next 風格', 'App Router', 'server action', 'supabase ssr', 'tailwind v4', 'shadcn', 'shadcn init', 'shadcn registry', 'monorepo', 'turborepo', 'ui.zyx.tw', '我的 next 慣例'."
---

# nextjs-dev: Loki 的 Next.js house style

從 16 個真實 repo（2026-01 → 2026-06，WinLab apps + 個人站）抽出來的慣例。兩種用法：

- 開新專案 / 寫 code：照 baseline + 慣例走，不踩 outlier。
- review / audit 舊專案：逐項對 `${CLAUDE_SKILL_DIR}/assets/review-checklist.md`，flag 偏離 + 反模式 + 給修法。

每條標 [hard]（review 一定 flag）或 [soft]（偏好，偏離要有理由）。安全邊界一律 hard，即使舊 repo 當初沒做：對齊到對的做法，不是多數的做法。

版本敏感的東西（API、CLI flag、actions yaml）以 context7 或 `node_modules/next/dist/docs/` 為準，不憑記憶。

---

## Stack baseline

| 層 | 標準 | 強度 |
|---|---|---|
| Framework | Next.js 16, App Router, 無 `src/`, root-level | universal 16/16 [hard] |
| React | 19.2.x | universal [hard] |
| 語言 | TypeScript `^5` strict | universal [hard] |
| 樣式 | Tailwind v4 CSS-first，無 `tailwind.config.*` | universal 16/16 [hard] |
| UI | 自有 registry 元件(Base UI 輕量版)：zyx.tw 系列用 ui.zyx.tw(`@zyx1121`)、WinLab app 用 ui.winlab.tw(`@winlab`)，不留 stock shadcn 副本；icon 一律 `lucide-react` | universal [hard] |
| Headless | `@base-ui/react`(registry 元件的底)，不裝 per-component `@radix-ui/react-*` scoped 包 | dominant [hard] |
| 資料層 | 既有 app：Supabase + `@supabase/ssr`；新 app：自架 Postgres(portal 用 Drizzle、handy 用 `postgres`) | dominant [hard 若用 Supabase] |
| Auth | Supabase Auth，gate 在 `proxy.ts`（Next 16 的 middleware 新名）；WinLab SSO 走 Keycloak OAuth、Google fallback | dominant [hard] |
| 套件管理 | bun（`bun create` / `bun add` / `bunx`） | dominant 15/16 [hard] |
| 主題 / 字型 | 照所屬 registry 的 DESIGN.md(zyx：dark first、80/24/16/14px、Geist Mono；WinLab：跟系統、24/16px、JetBrains Mono)。兩邊都是 Inter → Noto Sans JP → Noto Sans TC | universal [hard] |
| Lint | ESLint 9 flat config（`eslint.config.mjs` + `eslint-config-next`），不用 `.eslintrc` | universal 15/16 [hard] |

刻意不用（review 看到要問為什麼）：app 表單裡的 `react-hook-form` / `zod`、`swr`、全域 store（`zustand`/`jotai`/`redux`）。

---

## Scaffolding（官方 scaffolder first，[hard]）

不手刻骨架、不手抄別的 repo 拼。官方 CLI 會把 `components.json`、`globals.css`、Tailwind v4 content scan、monorepo wiring 一次接對。真實事故：手抄 www 範本 + `@source` 少一層，`packages/ui` 元件 class 被 tree-shake，整頁 unstyled。有 setup script 就用。

- 單 app：`bun create next-app` → `bunx shadcn@latest init`。
- monorepo（Turborepo）：`bunx shadcn@latest init` 選 Next.js (Monorepo)，產 `apps/web` + `packages/{ui,eslint-config,typescript-config}`，bun workspaces + turbo 全接好。加元件用 `bunx shadcn@latest add <name> --cwd packages/ui`。
- design system(2026-10-07 起，兩個 registry 同一套做法)：元件是自己改寫的 Base UI 輕量版，不是 stock shadcn。
  - zyx.tw 系列：新專案 `bunx shadcn@latest init https://ui.zyx.tw/r/base.json -t next`，既有專案省略 `-t`(base 帶 token、`utils` 與 4 個字型，並登記 `@zyx1121`)。init 會順手裝 stock button，接著 `bunx shadcn@latest add @zyx1121/button -o` 蓋掉，其他元件一律 `add @zyx1121/<name>`。舊的 `@zyx1121/theme` 已刪，看到就是過時文件。
  - WinLab app：同樣流程換成 `https://ui.winlab.tw/r/base.json` 與 `@winlab/<name>`。
  - 規則以 registry 自己的 DESIGN.md 為準(zyx：https://raw.githubusercontent.com/zyx1121/www.zyx.tw/main/apps/ui/DESIGN.md；WinLab：https://raw.githubusercontent.com/NYCU-WinLab/ui/main/DESIGN.md)，本 skill 不重寫。個人工具與 demo 的版面走 `task-web` skill。
  - Base UI 與 radix 的 API 差異：`asChild` 改 `render` prop，ToggleGroup / Accordion 用 `multiple` boolean。
- 非 Next 的 workspace 成員（Bun service 等）才手加 package。

### monorepo 踩過的坑（[hard]，build 綠也驗不到，要實際跑 / 部署才現形）

- Tailwind v4 content scan：`packages/ui` 的元件 class 必須在掃描範圍內，否則被 tree-shake、元件 unstyled。讓 scaffolder 設好；真要手改 `@source`，路徑相對於該 CSS 檔、層數要數對（`apps/web/app/globals.css` → ui 在 `../../../packages/ui/src`，不是 `../../`）。
- Docker：bun 把 per-package bin 放各自 `node_modules/.bin`，cross-stage `COPY node_modules` 會掉 bin（`next: not found`）。改成 COPY 全 source 再 in-place `bun install`（配 `.dockerignore`）。`--frozen-lockfile` 需要完整 workspace graph（所有成員的 package.json）。root `prepare: "husky"` 在 Docker 會 `husky: not found` 退 127，寫 `husky || true`。build 單一 app 用 `bun run --filter=<確切 package name>`。
- Next standalone：`output: "standalone"` 要配 `outputFileTracingRoot` 指 repo root，否則 workspace deps 不進 standalone、runtime 缺模組。

---

## Hard rules（review 必 flag）

1. 專案結構：App Router 放 repo root、無 `src/`；單一 alias `@/* → ./*`。
2. 檔名 kebab-case：所有檔案含元件（`login-form.tsx`）、hook（`use-orders.ts`）。元件識別字 PascalCase、hook camelCase 帶 `use`。route 資料夾小寫、動態段 `[id]`。
3. Tailwind v4 CSS-first：theme 全寫在 `app/globals.css`（`@import "tailwindcss"` + `@theme inline` + `:root`/`.dark` 的 oklch color tokens）。不建 `tailwind.config.*`（`components.json` 的 `tailwind.config` 留空字串）。`postcss.config.mjs` 只掛 `@tailwindcss/postcss`。
4. `cn()`：用 registry 的 `utils` 項目(`@zyx1121/utils` 或 `@winlab/utils`)，所有 className 組合都過它，className 擺最後讓 consumer 能覆寫。它把自訂字級登記給 tailwind-merge；手寫的 `twMerge(clsx(...))` 會把 `text-body` 當顏色，`cn("text-body", "text-foreground")` 就吃掉字級。`cva` 只在 `components/ui/*` 裡用。
5. 元件兩層：`components/ui/` = registry 元件(要改就改 registry 那一份)；feature 元件平放 `components/` root 或 colocate 在 `app/<route>/`。route-specific 就 colocate，跨 feature 才進 `components/`，大型 app 可按 domain 分（`components/orders/`）。
6. Auth gate 在 `proxy.ts`：root 的 `proxy.ts` export `proxy(request)` + `config.matcher`，未登入導去登入，用 `publicPaths` allowlist。不用 legacy `middleware.ts`。[perf] proxy 每次導覽都跑，不打網路：Supabase 用 `getClaims()`(非對稱簽章金鑰在本機驗，HS256 會退回打 `/auth/v1/user`，實測 123 ms 降到 5 ms)，自架 session 只看 cookie。真正的授權在 server component / action / route handler 裡做，proxy 只是第一層。
7. Supabase client 拆三處：`lib/supabase/server.ts`（`async createClient()` await `cookies()`）、`lib/supabase/client.ts`（`createBrowserClient`）、proxy client。需要繞過 RLS 的 server 路徑才另開 `createAdminClient()`（`SUPABASE_SECRET_KEY`），server-only、註解標明、不從 client import。env 用 publishable-key 命名（`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`），不用 legacy `ANON_KEY`。
8. [security] OAuth callback 防 open-redirect：code exchange 的 route handler 裡，`next` 必須 `startsWith('/') && !startsWith('//')`，否則 fallback `'/'`。舊 repo 沒做就是 bug。
9. [security] RLS 不准 `using(true)` / `with check(true)` 當「之後再收」。要嘛寫對，要嘛 `TODO(security):` + 排定收斂。schema/RLS migration 進 `supabase/migrations/*.sql`；DB 型別用 `supabase gen types` 產 `types/supabase.ts`，不手寫 interface（drift 來源）。任何有 schema 的 app 都適用。
10. Server action 寫入範式：`app/<route>/actions.ts` 開頭 `"use server"`：`await createClient()` → `getUser()` → auth/validation 失敗 early-return `{ error }` → mutate → `revalidatePath()`/`redirect()` → `return { success }`。寫入會影響同一個 layout 下其他頁(列表、統計、首頁焦點)時用 `revalidatePath("/<app>", "layout")`。讀取走 async Server Component。
11. 表單：native `<form>` + `FormData` + handler 裡手刻驗證（trim/required/regex），不上 `react-hook-form`/`zod`。錯誤用回傳 `{ error } | { success }` 或 sonner toast 表面化，不 throw。
12. Next 16 async dynamic APIs：`params` 型別是 `Promise<{...}>` 要 `await`（或 `React.use()`）；auth/data 頁 pin `export const dynamic = 'force-dynamic'`、碰 fs/cookie 的 route handler pin `export const runtime = 'nodejs'`。
13. [perf] 動態頁要預載：Next 16 對沒有 `loading.js` 的動態路由（讀 cookie、`force-dynamic` 的每人頁面）**預設不 prefetch**，點下去才打 server，切頁就卡一下（`docs/01-app/02-guides/prefetching.md`）。app shell / 導覽 / 麵包屑的 `<Link>` 一律 `prefetch`（等同 `prefetch={true}`，抓整條路由、留 `staleTimes.static` 5 分鐘）。指向 route handler 的連結（`/sign-in` 這種會開始登入流程的）不 prefetch。驗證要用 `next start`（dev 不 prefetch）：載入後 Network 有其他頁的 `_rsc`、點擊時 0 請求。給別人操作的 demo 也一樣，跑 `next dev` 就沒有預載，每頁還要現編。
14. [multi-user] 多人同時用的頁面要即時更新，不能靠使用者重新整理（Loki 2026-10-09：「有人新增訂餐要馬上看到」）。prefetch 讓別人的修改最多晚 5 分鐘，所以兩件事一起做：
    - Supabase app：`supabase.channel().on("postgres_changes", ...)` → `router.refresh()`（或 react-query invalidate）。
    - 純 Postgres app：每個寫入走同一個入口（action 層），成功後 `select pg_notify('<app>_changes', <action name>)`；server 單一 `LISTEN` 連線 fan-out；`GET /api/events` 用 SSE 推（要登入、payload 只帶 action 名、25 秒 ping、`x-accel-buffering: no`）；shell 放一個 client `EventSource` → debounce 300 ms → `router.refresh()`（也會清掉 prefetch 快取）；斷線重連後補一次 refresh。參考 NYCU-WinLab/portal `lib/actions/changes.ts`、`app/api/events/route.ts`、`components/live-refresh.tsx`。
15. [perf] 重活不放在請求的主執行緒：PDF 解析、轉檔、OCR、圖片解碼放子程序(時間上限、記憶體上限、同時數上限，env 只給必要的)，或丟給 runner 佇列。參考 NYCU-WinLab/portal `lib/pdf-sign/isolated.ts`。上傳走 server action 時設 `experimental.serverActions.bodySizeLimit`。
16. [perf] client bundle 只帶這頁要的：three.js、編輯器、地圖這類大件用 `next/dynamic`(`ssr: false` 只給碰 `window` 的)；motion 用 `LazyMotion strict` + `m.*`；公開內容頁用 `force-static` 或 `revalidate`(ISR)，不要整站 `force-dynamic`。
17. [perf] 頁面慢先量再改：server span（OTel → Sensorium）、網路（`curl -w` 看 connect / TTFB）、client（是否 prefetch、進場動畫是否每次切頁重播）分開量，找到慢在哪一段才動手。不憑感覺上快取。

---

## Conventions（[soft]）

- UI 語言照 DESIGN.md：對外 zyx.tw 站英文（`lang="en"`），寫給中文讀者的 app 用中文（`lang="zh-TW"`）並守 CJK 規則；code 識別字與 commit message 英文。
- 主題：`next-themes`（`attribute="class"`、`suppressHydrationWarning`）。zyx.tw 系列 dark first、`d` 熱鍵切換；WinLab app 跟系統、不放切換。
- 字型：Inter → Noto Sans JP → Noto Sans TC；mono 與載入方式見所屬 registry 的 DESIGN.md。
- env：raw `process.env` + non-null assert；commit `.env.example` 列出必要變數（舊 repo 常漏，新專案要補）。
- observability：第一個 PR 就接 OTel(`instrumentation.ts`，標準 env `OTEL_EXPORTER_OTLP_ENDPOINT`/`_HEADERS`/`OTEL_SERVICE_NAME`，沒設就關)，送 Sensorium(個人專案 zyx、WinLab 服務 winlab)。記外部呼叫、步驟、失敗原因，不送密鑰與使用者內容。舊 app 的 Sentry 不用再擴充。
- testing（serious app）：vitest unit（colocate `*.test.ts`）+ Playwright e2e（`e2e/`）。門檻由 nycueats 立下。
- design-led app：寫 `DESIGN.md` 定 design contract，用語意 token（`bg-surface-card`、`rounded-card`、命名 radius scale）勝過裸 Tailwind scale 值。
- `cacheComponents` 預設關：每人頁面的資料本來就不能放 server 共用快取，開了要拆 `dynamic` export、把讀 cookie 包進 Suspense、`new Date()` 會擋 build；prefetch + `revalidatePath` + 即時更新已涵蓋體感。只有 server 時間真的長、或有跨使用者共用的資料時才評估。
- agent entrypoint：`AGENTS.md`（+ `CLAUDE.md` 用 `@AGENTS.md` import），指向 `node_modules/next/dist/docs/` 當版本真相。
- cookie 加固（跨子網域 auth）：過濾 invalid-UTF8 cookie（`Buffer.from` try/catch）、>3500 bytes 警告、prod 設 `domain` + `sameSite: 'lax'` + `secure`。
- README：ASCII-art banner + 固定 section 結構（對齊 `zyx1121/.github` template）。

---

## Resolved decisions（2026-06 拍板）

- Formatting：Prettier 3 + `prettier-plugin-tailwindcss`，`semi: true`、`singleQuote: false`、`tabWidth: 2`、`trailingComma: "es5"`、`printWidth: 80`、`tailwindFunctions: ["cn","cva"]`，跟 shadcn 生成檔收斂。加 `format` script、repo-wide 跑一次、CI 檢查，避免再 drift。
- react-query：一等公民，不是 deprecated。預設資料路徑是 RSC 讀 + server actions 寫；client 互動 / realtime-heavy 的 app 用 `@tanstack/react-query`，搭配集中式 query-key factory（`hooks/query-keys.ts`）+ mutation `onSuccess` 按 top-level key invalidate。
- zyx.tw 系列 dark first：SSR `<html class="dark">`、`defaultTheme="dark"`、`enableSystem={false}`，light 用 toggle 或 `d` 熱鍵切換。WinLab app 照 ui.winlab.tw 跟系統(2026-10-07 起)。

---

## 範本（從最新的 app 抽，已去識別化）

```ts
// lib/supabase/server.ts: SSR server client
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/supabase";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(toSet) {
          try { for (const { name, value, options } of toSet) cookieStore.set(name, value, options); }
          catch { /* Server Component 不能 set cookie，proxy 會 refresh */ }
        },
      },
    },
  );
}
```

```ts
// app/<route>/actions.ts: server action 寫入範式
"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function removeItem(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };          // 繁中 copy / 英文 code
  // ... ownership check, mutate ...
  revalidatePath("/cart");
  return { success: true };
}
```

```ts
// proxy.ts: Next 16 middleware rename, auth gate (no network on each navigation)
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(URL!, KEY!, { cookies: { /* getAll/setAll */ } });
  let claims;
  try {
    // Verified locally with the project's asymmetric signing key (JWKS cached)
    ({ data: { claims } = {} } = await supabase.auth.getClaims());
  } catch {
    // A stale cookie in an old format throws; treat it as signed out
  }
  const publicPaths = ["/login", "/auth/callback"];
  if (!claims && !publicPaths.some((p) => request.nextUrl.pathname.startsWith(p)))
    return NextResponse.redirect(new URL("/login", request.url));
  return response;
}
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|webp)$).*)"],
};
```

---

## review 舊專案

逐項對照清單 + 反模式表（含 prevalence / 修法）：`Read ${CLAUDE_SKILL_DIR}/assets/review-checklist.md`
