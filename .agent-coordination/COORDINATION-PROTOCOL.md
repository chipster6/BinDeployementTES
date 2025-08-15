# UNIVERSAL AGENT COORDINATION PROTOCOL

## Overview
This protocol enables any combination of subagents to coordinate seamlessly through structured information relay and shared state management.

## Available Subagents
1. **backend-agent** - Backend development, API endpoints, business logic
2. **frontend-agent** - UI/UX development, React components, user interfaces  
3. **database-architect** - Database design, optimization, schema management
4. **performance-optimization-specialist** - Performance tuning, caching, optimization
5. **security** - Security implementation, vulnerability assessment, hardening
6. **devops-agent** - Infrastructure, deployment, CI/CD, monitoring
7. **external-api-integration-specialist** - Third-party integrations, webhook management
8. **innovation-architect** - AI/ML integration, cutting-edge technology implementation
9. **system-architecture-lead** - System design, architectural decisions, integration patterns
10. **testing-agent** - Test implementation, quality assurance, validation
11. **error-agent** - Error handling, resilience patterns, recovery mechanisms
12. **code-refactoring-analyst** - Code quality, refactoring, technical debt management
13. **documentation-agent** - Documentation creation, API docs, guides

## Coordination Mechanics

### 1. COORDINATION INITIATION
When coordination is requested:
1. **Coordination Session Created** - Unique session ID generated
2. **Shared State File Created** - `coordination-session-[session-id].md`
3. **Agent Context Loaded** - Each agent receives full project context
4. **Communication Channel Established** - Real-time coordination log

### 2. INFORMATION RELAY PROTOCOL
Each agent in coordination:
- **Reads shared state** before taking action
- **Updates coordination log** with findings, requirements, blockers
- **Specifies requirements** from other agents
- **Validates coordinated work** when requested
- **Commits to shared deliverables** with clear ownership

### 3. COORDINATION WORKFLOW
```
Phase 1: REQUIREMENTS GATHERING
- Each agent analyzes task and identifies coordination needs
- Agents specify what they need from others
- Shared requirements document created

Phase 2: PLANNING & SEQUENCING  
- Determine task dependencies and execution order
- Identify parallel work opportunities
- Create coordinated implementation plan

Phase 3: COORDINATED EXECUTION
- Agents execute tasks with real-time coordination
- Regular checkpoint updates in shared state
- Immediate conflict/blocker resolution

Phase 4: VALIDATION & COMPLETION
- Cross-agent validation of deliverables
- Integration testing of coordinated work
- Final coordination session completion
```

## Coordination State Management

### Shared State File Format: `coordination-session-[session-id].md`
```markdown
# Coordination Session: [Session ID]
**Agents**: [agent1, agent2, agent3, ...]
**Objective**: [coordination goal]
**Status**: [planning|executing|validating|complete]
**Created**: [timestamp]

## COORDINATION REQUIREMENTS
### [Agent 1] Requirements:
- [ ] Requirement 1 (needs: agent2)
- [ ] Requirement 2 (needs: agent3)

### [Agent 2] Requirements:
- [ ] Requirement 1 (needs: agent1) 
- [ ] Requirement 2 (needs: agent3)

## COORDINATION PLAN
1. **Phase 1**: [agent] does [task] → provides [deliverable] to [agent]
2. **Phase 2**: [agent] does [task] using [input] → provides [deliverable]
3. **Phase 3**: [agent] validates [deliverable] from [agent]

## COORDINATION LOG
- [timestamp] [agent]: [message/update/blocker/completion]
- [timestamp] [agent]: [response/validation/requirement]

## DELIVERABLES
### [Agent 1] Deliverables:
- [ ] Deliverable 1 (for: agent2)
- [ ] Deliverable 2 (for: agent3)

### [Agent 2] Deliverables:
- [ ] Deliverable 1 (for: agent1)
- [ ] Deliverable 2 (for: agent3)

## COORDINATION CHECKPOINTS
- [ ] Requirements gathering complete
- [ ] Implementation plan agreed
- [ ] Execution coordination active
- [ ] Cross-validation complete
- [ ] Integration tested
- [ ] Coordination session complete
```

## Communication Patterns

### 1. INFORMATION REQUEST
```
[Agent A] → Coordination Log: "Need [specific information] from [Agent B] for [purpose]"
[Agent B] → Coordination Log: "Providing [information]: [details]"
```

### 2. REQUIREMENT SPECIFICATION  
```
[Agent A] → Requirements: "Need [Agent B] to implement [specification] with [constraints]"
[Agent B] → Requirements: "Acknowledged. Will deliver [deliverable] by [checkpoint]"
```

### 3. BLOCKER RESOLUTION
```
[Agent A] → Coordination Log: "BLOCKER: Cannot proceed with [task] due to [issue]"
[Agent B] → Coordination Log: "RESOLUTION: [solution/workaround/alternative]"
```

### 4. VALIDATION REQUEST
```
[Agent A] → Coordination Log: "VALIDATION REQUEST: Please review [deliverable]"
[Agent B] → Coordination Log: "VALIDATION RESULT: [approved/needs-changes] - [feedback]"
```

## Conflict Resolution

### Level 1: Direct Agent Communication
- Agents resolve through coordination log
- Timeline: 30 minutes

### Level 2: Requirements Clarification
- Clarify conflicting requirements
- Update coordination plan
- Timeline: 1 hour

### Level 3: Architectural Decision
- System-architecture-lead provides guidance
- Update coordination based on architectural direction
- Timeline: 2 hours

## Success Criteria

### Technical Success:
- All coordination requirements met
- Cross-agent validation successful
- Integration testing passed
- No coordination blockers remaining

### Communication Success:
- Clear information relay between all agents
- No misunderstandings or conflicts
- Efficient coordination with minimal overhead
- Knowledge transfer documented

### Business Success:
- Coordination enhances rather than blocks progress
- Quality of coordinated work exceeds individual work
- Timeline and scope requirements met
- Business continuity maintained