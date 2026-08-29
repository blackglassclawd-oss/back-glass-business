# Herdr Workspace (reference)

Not yet stood up. This records the intended layout so it is deterministic when
it is. Lean structure: one persistent operator, specialists on demand.

```
workspace: backglass

tab: executive
└── ceo            # persistent — scripts/agents/start-ceo

tab: work          # panes created only for an active mission, 0-2 at a time
├── website        # scripts/agents/start-website   (maintenance lane)
├── commercial     # scripts/agents/start-commercial
├── finance        # scripts/agents/start-finance
├── bizdev         # scripts/agents/start-bizdev    (Phase 3+)
└── reviewer       # temporary opposite-model reviewer, spawned as needed
```

Each pane is one Pi session launched by the matching `scripts/agents/start-*`
script, which appends `AGENTS.md` + `.agents/constitution.md` +
`.agents/roles/<role>.md` as the system-prompt overlay.

Keep role names stable so status (working / blocked / idle) is readable at a
glance. Install Herdr's native Pi lifecycle integration so status comes from the
agent lifecycle, not terminal-text guessing. The CEO may start or prompt
specialists through Herdr automation; specialists do not spawn other specialists
unless the CEO grants that for a specific mission.

Do not build an orchestration extension, mission bus, voting council, or
standing scheduler.
