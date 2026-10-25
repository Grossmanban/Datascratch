# Temporary stubs

Thin stand-ins for packages owned by other streams (D-39) that are not in `main` yet.
App code never imports from here directly — it goes through `src/lib/shared.ts`,
`src/ui/` and `src/editor/`, so replacing a stub with the real package touches one place.

| Stub | Real package | Owner stream |
| --- | --- | --- |
| `shared/` | `@datascratch/shared` (contracts types, crypto, ids) | core |
| `ui/` | `@datascratch/ui` (Radix + Tailwind components) | design-system |
| `design-tokens/` | `@datascratch/design-tokens` (CSS variables) | design-system |
| `web-editor/` | `@datascratch/web-editor` (TipTap editor component) | web-editor |

The stubs follow the contracts in `docs/architecture/contracts/` byte for byte where it
matters (crypto envelopes, document schema), so data created with them stays valid.
