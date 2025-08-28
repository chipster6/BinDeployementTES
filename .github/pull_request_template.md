### What & Why
- [ ] One concern only
- [ ] Matches OpenAPI / events contracts

### Hooks & Policies
- [ ] contracts:format ✔️
- [ ] events:validate ✔️
- [ ] typecheck:diff ✔️ (no new TS errors)
- [ ] dep:cruise ✔️
- [ ] test:smoke ✔️ (if routes/controllers touched)

### Scope
Agent: `<architecture|db_architect|external_api|ingestion|orders|eventing_obs>`
- [ ] Changes stay within allowed scope
- [ ] LOC <= 300

### DB (pre-launch)
- [ ] Changes confined to `schema.dev.sql` (no migration history)
- [ ] `db:reset:dev` applies cleanly
- [ ] Optional: ADR added if baseline schema changed