# Temporary stubs

Thin stand-ins for packages owned by other streams (D-39). App code never imports from here
directly — it goes through `src/ui/`, so replacing a stub with the real package touches one place.

| Stub | Real package | Status |
| --- | --- | --- |
| `ui/` | `@datascratch/ui` (Radix + Tailwind components) | being migrated to the real package |

Already replaced by the real packages: `@datascratch/shared` (via `src/lib/shared.ts`),
`@datascratch/web-editor` (via `src/editor/`), `@datascratch/design-tokens` (CSS variables).
