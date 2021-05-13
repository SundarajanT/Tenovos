# **cust-pantry-created-handler**

- **RAM**: [DEFAULT]
- **TIMEOUT**: `75 Second`
- **POLICIES**: `Administrative Access`
- **REQUIRES**: `None`

---

### Environment

| NAME | Description |
| ----------- | ----------- |
| REVIEWER_SECURITY_TEMPLATE | Reviewer Security Template Id |
| SENDER_EMAIL | Automated Sender Email Associated to SES |

---

### Process

1. Gets the session from the Token Manager.
2. Read the Asset Action Id from the event body.
3. Calls the API to get the Asset Information.
4. Assign security template Id to the asset and call the update asset API.
4. Read the requester email from `createdBy` metadata attribute. Sends out the mail to inform that the request has been received.