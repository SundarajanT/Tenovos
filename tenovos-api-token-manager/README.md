# **tenovos-event-listener**

- **RAM**: [DEFAULT]
- **TIMEOUT**: `75 Second`
- **POLICIES**: `AdministratorAccess`
- **REQUIRES**: `None`

---
### Environment

| NAME | Description |
| ----------- | ----------- |

---
### Process

1. Read customerId from the event
2. Check the global cache for the already retrieved session for that specific customer Id.
3. if the cache is empty or the stored session is expired then either fetches the new session or just refreshes the current one based on the condition.
4. returns the session.

---
### Post Deployment
