---
name: nextjs-dev
description: "Loki 的 Next.js 16 house style，從 16 個真實 repo 抽出來的個人慣例 — 開新專案就照這個 scaffold，也用來 review/audit 舊專案的一致性。Use when starting / writing a Next.js App Router project or reviewing a Next.js repo against the house style. Triggers on 'new next app', 'next 專案', 'scaffold next', '建 next 專案', 'review 我的 next 風格', 'App Router', 'server action', 'supabase ssr', 'tailwind v4', 'shadcn', 'shadcn init', 'shadcn registry', 'monorepo', 'turborepo', 'ui.zyx.tw', '我的 next 慣例'."
---

# nextjs-dev — Loki 的 Next.js house style

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
| UI | shadcn (v4 CLI) on Tailwind v4，icon 一律 `lucide-react` | dominant [soft] |
| Headless | 新專案用 unified `radix-ui` 或 `@base-ui/react`（看 shadcn style），不裝 per-component `@radix-ui/react-*` scoped 包 | emerging [soft] |
| 資料層 | Supabase + `@supabase/ssr` | dominant 12/16 [hard 若用 Supabase] |
| Auth | Supabase Auth，gate 在 `proxy.ts`（Next 16 的 middleware 新名）；WinLab SSO 走 Keycloak OAuth、Google fallback | dominant [hard] |
| 套件管理 | bun（`bun create` / `bun add` / `bunx`） | dominant 15/16 [hard] |
| 主題 / 字型 | `next-themes`（class 策略）；`next/font/google`，house font = Geist + Geist_Mono | dominant [soft] |
| Lint | ESLint 9 flat config（`eslint.config.mjs` + `eslint-config-next`），不用 `.eslintrc` | universal 15/16 [hard] |

刻意不用（review 看到要問為什麼）：app 表單裡的 `react-hook-form` / `zod`、`swr`、全域 store（`zustand`/`jotai`/`redux`）。

---

## Scaffolding（官方 scaffolder first，[hard]）

不手刻骨架、不手抄別的 repo 拼。官方 CLI 會把 `components.json`、`globals.css`、Tailwind v4 content scan、monorepo wiring 一次接對。真實事故：手抄 www 範本 + `@source` 少一層，`packages/ui` 元件 class 被 tree-shake，整頁 unstyled。有 setup script 就用。

- 單 app：`bun create next-app` → `bunx shadcn@latest init`。
- monorepo（Turborepo）：`bunx shadcn@latest init` 選 Next.js (Monorepo)，產 `apps/web` + `packages/{ui,eslint-config,typescript-config}`，bun workspaces + turbo 全接好。加元件用 `bunx shadcn@latest add <name> --cwd packages/ui`。
- zyx.tw 系列的 design system（ui.zyx.tw registry，2026-08 重練後）：基礎元件是 stock shadcn，由 CLI 擁有 `components/ui/`，不 fork。新專案用 base preset（`base-nova`、neutral）init，`components.json` 掛 `"registries": { "@zyx1121": "https://ui.zyx.tw/r/{name}.json" }`，再 `bunx shadcn@latest add @zyx1121/theme`（全灰階 + `--radius: 1rem`）。registry 只發佈 `theme`、`shimmering-text`、`theme-toggle`；shadcn 本身有的元件從 shadcn 拉，不進 registry。Base UI 與 radix 的 API 差異：`asChild` 改 `render` prop，ToggleGroup / Accordion 用 `multiple` boolean。
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
4. `cn()`：`lib/utils.ts` 的 `twMerge(clsx(...))`，所有 className 組合都過它，className 擺最後讓 consumer 能覆寫。`cva` 只在 `components/ui/*` 裡用。
5. 元件兩層：`components/ui/` = shadcn primitives；feature 元件平放 `components/` root 或 colocate 在 `app/<route>/`。route-specific 就 colocate，跨 feature 才進 `components/`，大型 app 可按 domain 分（`components/orders/`）。
6. Auth gate 在 `proxy.ts`：root 的 `proxy.ts` export `proxy(request)` + `config.matcher`，呼叫 `supabase.auth.getUser()`，未登入導去 `/login`，用 `publicPaths` allowlist。不用 legacy `middleware.ts`。它是 defense-in-depth 的一層，不是唯一防線。
7. Supabase client 拆三處：`lib/supabase/server.ts`（`async createClient()` await `cookies()`）、`lib/supabase/client.ts`（`createBrowserClient`）、proxy client。需要繞過 RLS 的 server 路徑才另開 `createAdminClient()`（`SUPABASE_SECRET_KEY`），server-only、註解標明、不從 client import。env 用 publishable-key 命名（`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`），不用 legacy `ANON_KEY`。
8. [security] OAuth callback 防 open-redirect：code exchange 的 route handler 裡，`next` 必須 `startsWith('/') && !startsWith('//')`，否則 fallback `'/'`。舊 repo 沒做就是 bug。
9. [security] RLS 不准 `using(true)` / `with check(true)` 當「之後再收」。要嘛寫對，要嘛 `TODO(security):` + 排定收斂。schema/RLS migration 進 `supabase/migrations/*.sql`；DB 型別用 `supabase gen types` 產 `types/supabase.ts`，不手寫 interface（drift 來源）。任何有 schema 的 app 都適用。
10. Server action 寫入範式：`app/<route>/actions.ts` 開頭 `"use server"`：`await createClient()` → `getUser()` → auth/validation 失敗 early-return `{ error }` → mutate → `revalidatePath()`/`redirect()` → `return { success }`。讀取走 async Server Component。
11. 表單：native `<form>` + `FormData` + handler 裡手刻驗證（trim/required/regex），不上 `react-hook-form`/`zod`。錯誤用回傳 `{ error } | { success }` 或 sonner toast 表面化，不 throw。
12. Next 16 async dynamic APIs：`params` 型別是 `Promise<{...}>` 要 `await`（或 `React.use()`）；auth/data 頁 pin `export const dynamic = 'force-dynamic'`、碰 fs/cookie 的 route handler pin `export const runtime = 'nodejs'`。

---

## Conventions（[soft]）

- bilingual：UI copy 繁中（zh-Hant），code 識別字與 commit message 英文。`<html lang="zh-Hant">`。
- 主題：`next-themes`（`attribute="class"`、`enableSystem`、`suppressHydrationWarning`）。可選 `d` 熱鍵切換。
- 字型：Geist + Geist_Mono 為底，zh-TW 配 Inter / Noto Sans TC。部分站把 mono 設成 body default（風格選擇，不強制）。
- env：raw `process.env` + non-null assert；commit `.env.example` 列出必要變數（舊 repo 常漏，新專案要補）。
- observability（serious app）：Sentry，`instrumentation.ts` + `lib/observability` 的 `captureActionError`/`identifyUser`，每個 error branch 都打點。
- testing（serious app）：vitest unit（colocate `*.test.ts`）+ Playwright e2e（`e2e/`）。門檻由 nycueats 立下。
- design-led app：寫 `DESIGN.md` 定 design contract，用語意 token（`bg-surface-card`、`rounded-card`、命名 radius scale）勝過裸 Tailwind scale 值。
- agent entrypoint：`AGENTS.md`（+ `CLAUDE.md` 用 `@AGENTS.md` import），指向 `node_modules/next/dist/docs/` 當版本真相。
- cookie 加固（跨子網域 auth）：過濾 invalid-UTF8 cookie（`Buffer.from` try/catch）、>3500 bytes 警告、prod 設 `domain` + `sameSite: 'lax'` + `secure`。
- README：ASCII-art banner + 固定 section 結構（對齊 `zyx1121/.github` template）。

---

## Resolved decisions（2026-06 拍板）

- Formatting：Prettier 3 + `prettier-plugin-tailwindcss`，`semi: true`、`singleQuote: false`、`tabWidth: 2`、`trailingComma: "es5"`、`printWidth: 80`、`tailwindFunctions: ["cn","cva"]`，跟 shadcn 生成檔收斂。加 `format` script、repo-wide 跑一次、CI 檢查，避免再 drift。
- react-query：一等公民，不是 deprecated。預設資料路徑是 RSC 讀 + server actions 寫；client 互動 / realtime-heavy 的 app 用 `@tanstack/react-query`，搭配集中式 query-key factory（`hooks/query-keys.ts`）+ mutation `onSuccess` 按 top-level key invalidate。
- dark mode 預設依受眾：內部 / 實驗室工具預設 `dark`，對外 / 消費者 app 預設 `light`，兩者都 `enableSystem`。

---

## 範本（從最新的 app 抽，已去識別化）

```ts
// lib/supabase/server.ts — SSR server client
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
          catch { /* Server Component 不能 set cookie — proxy 會 refresh */ }
        },
      },
    },
  );
}
```

```ts
// app/<route>/actions.ts — server action 寫入範式
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
// proxy.ts — Next 16 middleware rename, auth gate
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });
  const supabase = createServerClient(URL!, KEY!, { cookies: { /* getAll/setAll */ } });
  const { data: { user } } = await supabase.auth.getUser();
  const publicPaths = ["/login", "/auth/callback"];
  if (!user && !publicPaths.some((p) => request.nextUrl.pathname.startsWith(p)))
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
