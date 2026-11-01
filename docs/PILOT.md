# Running the ScioCulture pilot

Build scope: one week. Initial evaluation: two weeks. Students answer one optional science activity per day, optionally explain their reasoning or contribute original lore, and see their progress in a private passport. No daily attendance or external camp scores are required.

## Student flow

1. `/start` creates the existing profile. Balances and inventories are preserved.
2. `/question` shows the current question privately. Public scheduled posts have the same buttons. Choose an answer; revise it until the displayed deadline. Only the final answer determines the correctness bonus, paid at reveal.
3. **Join discussion** opens a public thread under the daily question. Explain a prediction, suggest an experiment, or reply constructively to someone else. Your button choice remains private, but anything you post in the thread is visible to people who can access that channel. To request a stamp, copy your message link and use **Submit discussion for review**. Moderators approve, request revision, or reject with private feedback. Message counts do not earn rewards.
4. `/passport view` shows stamps, dates, opportunities, eligibility, and claim status. `/passport history` lists past seasons; `/passport view season:<id>` opens one.
5. Once qualified and claims are open, `/passport claim` submits one claim for organizer review. No mailing address belongs in Discord or this bot.

`/passport opt-out enabled:true` disables new pilot submissions and milestone DMs for that season. History remains for reward integrity and aggregate reporting. `/passport feedback text:...` sends one private feedback submission per season. Existing `/privacy` controls still protect public profiles and camp participation.

## Rewards

| Contribution | Stamps | Sciocoins | KP |
| --- | ---: | ---: | ---: |
| Daily answer (once per activity) | 1 | 2 | 2 |
| Correct final answer at reveal | 0 | 3 | 4 |
| Approved explanation (once per activity) | 1 | 3 | 2 |
| Original lore approved for rewards (once per season) | 2 | 15 | 0 |

Three stamps qualify for a sticker claim. Answering any three daily activities, or two plus one approved explanation, is enough; original lore plus one daily answer is another path. Opinion activities never award correctness bonuses. Ordinary games, reactions, daily claims, and message counts never grant stamps. Stamps cannot be traded or purchased.

Lore publication and rewards are independent. `/lore-review approve` publishes; `/pilot reward-lore` explicitly approves originality, substance, and relevance and grants the season reward. A second submission cannot bypass the one-lore-reward limit. Lore must have been submitted during the season. Reviews may finish after the season closes; rewards and claims remain available afterward.

Ordinary trivia rewards 2 coins/3 KP for each of up to five different correct questions per UTC day. Repeated questions that day and incorrect answers pay zero. Races award 5 coins/5 KP to winners with at least one correct answer, within each player's first two completed races per UTC Monday–Sunday week. Playing after a limit is allowed. `/daily` is optional: flat 2 coins/1 KP, with no escalating reward or streak reset. Existing historical streaks and balances are retained.

## Configuration and draft creation

Edit `content/pilot/season.json`; this is content/configuration, not application code. It includes:

- A unique season ID/name, timezone, duration in days, stamp threshold, sticker name, stock, and eligibility rules.
- Reward amounts for answers, correctness, explanations, and lore.
- The existing economy's reward amounts and caps in `economy` (loaded at process startup).
- Ordered, nonoverlapping activities with opening/closing day offsets. The default is 14 different prompts, one every 24 hours, mixing predictions, Two Truths and a Lie, and open-ended science discussions. Each closes when the next opens.
- A `discussionExample` you can copy into `activities` for an opinion activity. Remove `correct` for opinions. Each factual choice requires an explanation and factual activities require an HTTPS source. Check the sources yourself before publishing new content.

Run `npm test` after editing. A season takes a frozen copy of its configuration at creation; later edits do not change saved seasons. To correct a draft configuration, use a new ID and create a new draft. Unused drafts remain inactive. Longer seasons use a larger `durationDays` and more activities; no new engine is needed.

Create a draft with:

```text
/pilot create start:2030-01-01T10:00:00-05:00 channel:#scioculture simulation:true
/pilot status
```

Replace the example timestamp. An explicit UTC offset or `Z` is required. The chosen IANA timezone is retained for organizer context; offsets are elapsed 24-hour days from the exact start instant, so local wall-clock hours can shift at daylight saving transitions. Status shows the exact derived start/end and activity times. No season is created or activated at startup.

The default is simulation even if the file says otherwise. In simulation, students can test stamps, reviews, and claims, but no actual Sciocoins, KP, seasonal collection items, physical merchandise, or sticker codes are issued. Use a separate season ID for the real pilot and explicitly pass `simulation:false` when creating it. A saved simulation cannot be converted into a real season.

Activate only when ready:

```text
/pilot activate season:first-pilot
```

Only one season can be active per server. Activation starts neither physical claims nor mailing. Students can join only between the exact season start and end.

## Organizer commands

Only the server owner or members with Administrator permission may use `/pilot`. Permissions are checked both by Discord registration and by the handler/service. The existing `/lore-review` handles publication separately.

| Command | Purpose |
| --- | --- |
| `/pilot status [season]` | Inspect draft/live status, exact schedule, stock, and quiet mode |
| `/pilot publish activity:<id>` | Open a scheduled activity now, if no other activity is open |
| `/pilot close activity:<id>` | Stop revisions, award final correctness bonuses, and reveal |
| `/pilot quiet enabled:true` | Suppress scheduled science, existing poll, Om, and qualification messages |
| `/pilot queue [page]` | Read one pending explanation and download private pending claims/feedback |
| `/pilot review id:D1 decision:approved reason:...` | Approve, request `revision`, or mark `rejected` |
| `/pilot reward-lore submission:LS0001 reason:...` | Explicitly approve one original lore contribution for rewards |
| `/pilot stock count:50` | Set total sticker inventory, never below reserved/fulfilled claims |
| `/pilot claims-open policy:<message URL>` | Open claims after publishing eligibility/capacity rules |
| `/pilot claim-review student:@student decision:approved reason:...` | Reserve inventory after checking eligibility |
| `/pilot claim-review student:@student decision:fulfilled reason:...` | Record external fulfillment and add the matching seasonal collectible |
| `/pilot engagement [season]` | Private aggregate report and downloadable JSON |

All season-specific operations accept an optional `season` ID (except creation). Otherwise the active season, or most recent draft/closed season, is selected. Use explicit IDs when handling old claims. A pending or approved claim may be rejected with a reason. Fulfilled claims are final; rejected claims are retained and cannot be resubmitted. Resolve mistakes with the project maintainer rather than deleting audit records.

Quiet mode suppresses automatic messages, not deadlines or private commands. Opening early is refused if another activity is active. Closing early is explicit. If moderation requests revision, the student can edit their public message and submit its link again before the season ends. Pending reviews can be processed after closing, but new submissions/revisions cannot.

Students receive private review feedback when DMs work; `/question` and `/passport` retain their status if DMs fail. Automatic qualification DMs fall back to the passport when a student blocks DMs. The bot never republishes private explanations. Old private submissions remain in the same private review queue. Public submissions store an author-verified message reference; moderators read the original thread message, which may have been edited. The bot rechecks that the linked message still exists and belongs to the student before approval. Deleting it later does not automatically revoke an already approved reward.

## Real sticker claims

Before opening real claims, publish a message in this server spelling out eligibility and whether all qualified eligible participants are guaranteed a sticker. If capacity is limited, state a fair allocation process. Never quietly turn this into a lottery or speed race. The bot verifies the policy link exists; organizers are responsible for its content and for applying the announced process.

Real claims require positive stock. Approval reserves one unit, fulfillment keeps it reserved, and rejection releases a reservation. When stock runs out, another approval fails and its claim stays pending. Increase stock or resolve allocation transparently; the bot does not automatically select winners. Claim retries reuse the same season/student record. The simulated workflow does not reserve real inventory.

Mailing happens through the organizers' approved process outside this bot. Do not put addresses in reasons or feedback. After fulfillment, the student's `/inventory` shows the matching seasonal sticker. These records are separate from shop/trade inventory, so they cannot be bought, traded, or duplicated through the economy. No physical redemption codes are generated.

## Engagement report

`/pilot engagement` reports real counts even if they fall below the targets:

- New profiles created during the season, unique daily-activity participants and per-activity counts.
- Meaningful participation in Weeks 1 and 2 and their intersection.
- **Retention = Week 1 participants who also participate in Week 2 / Week 1 participants.** Zero Week 1 participants yields `null`/N/A, not 0% or 100%.
- Explanations submitted/approved, approval percentage, participating students who submitted an explanation, and pending review counts.
- Lore submitted, published, and rewarded; students earning stamps/qualifying; claims/fulfillment.
- Review actions, opt-outs, reports, and private feedback count. Organizers read the feedback to identify complaints; there is no automatic sentiment classifier.

Meaningful participation means a daily answer, approved explanation, or approved rewarded lore contribution. Participation is attributed to its original submission timestamp, so delayed approval does not move a Week 1 contribution into Week 2. Answer revisions do not add participants. The report shows no student names or public participation rankings. Private organizer queues contain the identities necessary for moderation/fulfillment.

The proposed 40% retention and 25% discussion participation targets are pilot hypotheses, not research benchmarks. Reporting is descriptive: it cannot prove that the bot caused a change. For longer seasons, the report still includes Week 1 → Week 2 retention and every activity's counts.

## Persistence, testing, and deployment

There is one JSON store and one PM2 process. Season state, ledger entries, and profile rewards are modified synchronously and saved together via a temporary file plus atomic rename. Operations have no `await` inside the transaction. On failure the in-memory snapshot is restored; later operations reload disk. Unique source checks, claim transitions, and permission checks live in the service rather than only in button handlers.

SQLite was evaluated and deferred: one small, single-process bot does not need a second store or a balance migration. **Do not run multiple bot processes or simultaneous writers against this file.** Move all state to a transactional database before scaling to multiple workers. Existing daily backups include pilot state; the first pilot write also saves `data/profiles.json.pre-pilot.bak`. All profile, inventory, and lore history fields are preserved. Seasons and ledgers are retained after closing.

The scheduler checks deadlines on startup and every minute. Missed reveals settle once after restart. Public results edit the original activity message; after a send-before-save interruption the bot looks for its marker among the last 100 channel messages and uses a stable Discord nonce to reduce duplicate sends. Discord delivery is not an exactly-once transaction: a sufficiently old unrecorded post outside that window may be duplicated, but rewards cannot. Posting failures retry; operators should check logs. The bot needs View Channel, Send Messages, Embed Links, Attach Files, Read Message History, Create Public Threads, and Send Messages in Threads in the configured channel. Students need View Channel and Send Messages in Threads.

```bash
npm test
npm run test:pilot
```

Tests create temporary isolated stores and simulated dates, covering the full two-week flow without changing production data or mailing merchandise. They include both simulation and real-accounting fixtures, caps, wrong permissions, restarts, answer revisions, claim duplicates, stock, and opinion behavior. Discord transport tests use mocks; a staging-server smoke test is still required before production launch.

After deployment authorization, back up the existing data, register commands, and restart the existing PM2 process using [HOSTING.md](HOSTING.md). No new dependency or database migration is required. In staging, create a simulation draft, activate it, answer, request a revision, approve, close an activity, and inspect `/passport` and `/pilot engagement`. Check that students cannot use admin commands and that bot DMs/embeds work. Then create the real season with reviewed dates and eligibility.


### Discussion threads and privacy

Each open daily question gets one public thread. The bot reuses that thread after restarts and does not post or copy student text into it. Public links must reference the submitting student's own non-bot message in that exact question's thread and within the season. Cross-server links, other students' messages, and unavailable messages are rejected. A private submission and public submission share one review/reward slot per student and question.

No Message Content privileged intent or passive conversation monitoring is needed. The bot fetches author/timestamp metadata only for explicitly submitted links; moderators read the linked content in Discord. Public thread participation is optional and does not automatically generate a reward. Existing private modal buttons continue to work privately, but new posts show the public discussion workflow.

### Staff submission alerts

Each accepted discussion submission (including a requested revision) queues a staff DM. New lore submissions also queue an alert. The scheduler delivers within about one minute, preferring the server owner, then a cached administrator or moderator with Manage Messages or Moderate Members. It stops after one successful delivery. Alerts identify the student, season/question, submission ID, public message link when applicable, and review command; they never copy private explanation text. Review permissions remain owner/admin only.

Notification state survives restarts. If no staff member accepts DMs, delivery retries after 15 minutes and logs the failure. Quiet mode does not suppress these operational notices. Pending discussions present when this feature is deployed also receive an alert. Previously unnotified pending lore is also picked up. Lore submission triggers an immediate dispatch; the minute scheduler remains a durable fallback. A crash between Discord accepting a DM and the local delivery acknowledgment can cause a retry, but never a duplicate reward.
