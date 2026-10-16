<!-- kru v0.148.0 · derived 2026-10-16 · /kru:setup to re-derive -->
## Team

Load **`kru:lead`** before building, reviewing, or dispatching a seat — it carries how the team works.

- **routes** → `kru:react-router-builder` — `src/routes`, `src/routes.ts`, `src/root*.ts(x)`, `src/api` (react-router 7.11 framework mode, `ssr: true`, `v8_middleware`, `appDirectory: "src"`)
- **ui** → `kru:react-ui-builder` — `src/components`, `src/pages`, `src/layout`, `src/hooks` (react **18.2**, tailwind 4.1, @headlessui/react)
- **stripe** → `kru:stripe-specialist` — `.server/api-webhooks/stripe`, `lib/stripe.ts` (stripe 17.7, @stripe/stripe-js 8.4)
- **paypal** → `kru:paypal-specialist` — `.server/api-webhooks/paypal` (@better-giving/paypal 1.4, @paypal/paypal-js 9.0)
- **chariot** → `kru:chariot-specialist` — `.server/api-webhooks/chariot` (react-chariot-connect 1.0.8, @better-giving/chariot)
- **crypto** → `kru:nowpayments-specialist` — `.server/api-webhooks/nowpayments`, `lib/nowpayments`
- **emails** — React Email templates ride with the seat that sends them (@react-email/components 0.0.22, @better-giving/react-emails 4)
- **skills** → `kru:react-hook-form` · `zod` · `valibot` · `react-email` · `vitest` · `testing-library` · `msw` · `tailwind` — react-hook-form 7.62 · zod 4.1.8 · valibot 1.2.0 · @react-email/components 0.0.22 · vitest 4.0.16 · @testing-library/react 16.3.0 · msw 2.12.7 · tailwindcss 4.1.13
- **infra** — SST 3 on AWS (`sst.config.ts`, home `aws`, profile `apes`), `.server/{tables,queues,crons,functions,user-pool,bucket.ts}` on DynamoDB, SQS, Step Functions, Cognito, S3, SES, plus MongoDB (`.server/mongodb`); no plugin seat covers AWS, SST or MongoDB
- **test** — `pnpm test` (vitest, jsdom): 12 files, ~6 s summed test time on the last run (`node_modules/.vite/vitest/*/results.json`); cheap, run it whole
- **verify** — `pnpm lint` (Biome 1.9 over `src/`) · `pnpm exec tsc --noEmit`; lefthook already runs Biome, `tsc-files` and `vitest related` on staged files pre-commit
- **mcp** — `vercel` plugin at project scope (`.claude/settings.json`); context7 + chrome-devtools inherited from user scope

A slice reaching a stack no seat above covers is a question for the user, naming the seat it would need — never a nearby seat pressed into the gap.
