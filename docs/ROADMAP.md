# ScioWorld — One-week project plan

## Minimum launch criteria

- [ ] Playable slash commands work in a test server
- [ ] Each player's inventory persists after a redeploy
- [ ] Multiple players contribute to the same shared civilization
- [ ] The economy has enough variety for a short test session
- [ ] Camp resource commands use real, authorized links
- [ ] Directors can maintain the bot after handoff
- [ ] Bot installed in the official server only after testing/approval

## Team division

- **Developer A — Bot/API:** Discord command schema, request handling, buttons (later)
- **Developer B — Economy/database:** D1 schema, action balance, cooldowns, integrity tests
- **Designer C — Gameplay/content:** exploration events, milestone names, progression and balancing
- **Coordinator D — Camp utility/QA:** approved resources, student testing, launch and director instructions

## Before Nov 1

- Oct 26: agree on 6 commands; test application created; D1 initialized
- Oct 27: `/start`, `/inventory`, `/explore` verified on Discord
- Oct 28: `/build`, `/world`, SQL persistence and game balancing verified
- Oct 29: camp resources and help/docs; test with 3–5 people
- Oct 30: edge cases, permissions, cooldown exploits, mobile UX
- Oct 31: director handoff and exact launch message
- Nov 1: deploy and launch only after group and directors approve

## Phase 2 ideas (not part of MVP)

- Multi-route exploration and location choices
- Inventories with crafted tools and cosmetic items
- User-friendly buttons/menus and richer embedded messages
- Weekly world events and votes
- World seasons, archives, and legacy achievements
- Non-Discord web mirror of camp resources

## Engagement metrics

Track aggregate number of unique players, first-week return rate, `/build` participation rate, and number of people who use `/camp` commands. Do not track messages or personally sensitive information.
