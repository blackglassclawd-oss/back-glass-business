# Mission Brief

Fill this in when assigning work. One mission, one owner. Keep it boring —
boring contracts prevent drift.

```yaml
mission:
  id:            # e.g. M4
  objective:     # one sentence, tied to 30-day contribution profit

owner:
  role:          # ceo | website | commercial | finance | bizdev | Jason | Michael

scope:
  read:          # files / systems the owner may read
  write:         # files / systems the owner may change
  systems:       # Shopify (read-only?), GitHub branch, local only, etc.

non_goals:       # explicitly out of scope

authority:
  allowed:              # what the owner may do without asking
  requires_user_approval:  # what needs Jason / Michael first

inputs:          # data, prior decisions, links

deliverables:    # concrete artifacts

acceptance:      # observable pass/fail conditions

evidence:        # what the owner must show (tests, logs, screenshots, numbers)

deadline_or_priority:   # P0 | P1 | P2 | date

github:
  issue:
  branch:
  pr:
```
