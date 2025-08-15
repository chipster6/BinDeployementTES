# Agent Coordination Registry

This directory contains real-time coordination files that enable agent-to-agent communication and task coordination.

## Coordination Protocol

Each coordination pair maintains a shared state file that both agents read from and write to:

### Format: `[agent-a]-[agent-b]-coordination.md`

```markdown
# Agent A ↔ Agent B Coordination

## CURRENT STATUS
- **Phase**: [planning|implementation|validation|complete]
- **Priority**: [critical|high|medium|low]
- **Last Updated**: [timestamp]

## COORDINATION TASKS
### Agent A Tasks:
- [ ] Task 1
- [ ] Task 2

### Agent B Tasks:
- [ ] Task 1
- [ ] Task 2

## COORDINATION REQUIREMENTS
### Agent A Requirements for Agent B:
- Requirement 1
- Requirement 2

### Agent B Requirements for Agent A:
- Requirement 1
- Requirement 2

## COORDINATION LOG
- [timestamp] Agent A: [message]
- [timestamp] Agent B: [message]

## COORDINATION CHECKPOINTS
- [ ] Requirements gathering complete
- [ ] Implementation coordination complete
- [ ] Validation complete
- [ ] Coordination complete
```

## Active Coordination Files

This directory will contain:
- `external-api-backend-frontend-coordination.md`
- `performance-database-coordination.md`
- `devops-security-coordination.md`
- `innovation-architecture-coordination.md`