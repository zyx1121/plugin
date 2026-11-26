---
id: sign-in-centered
engine: model
files: ["**/*.{tsx,jsx}"]
exclude: ["components/ui/**", "**/components/ui/**", "**/*.test.*"]
requires: src/components/task-shell.tsx
source: memory sign-in-centered (2026-11-12)
---

The signed-out screen puts its title and Sign in button in the center of
the whole viewport, both ways. The loading state before the session is
known is centered too, so the page does not jump. Flag a changed sign-in
or signed-out view that sits in the top-left content column instead.

## Bad

`if (!user) return <TaskShell><h1>Finance</h1><SignIn /></TaskShell>`

## Good

`if (!user) return <TaskShell center><h1>Finance</h1><SignIn /></TaskShell>`
