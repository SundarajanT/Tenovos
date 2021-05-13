# **cust-pantry-update-handler**

- **RAM**: [DEFAULT]
- **TIMEOUT**: `75 Second`
- **POLICIES**: `Administrative Access`
- **REQUIRES**: `None`

---

### Environment

| NAME | Description |
| ----------- | ----------- |
| TRANSFORM_API_KEY | Transformations Custom Api Key |
| SENDER_EMAIL | Automated Sender Email Associated to SES |

---

### Process

1. Gets the session from the Token Manager.
2. Read the Asset Action Id from the event body.
3. Calls the API to get the Asset Information.
4. Checks the status of the request based off the metadata attribute `request_status` in the Asset Information.
5. If request status is 
    - `Done`
        - Filters the Approved Asset Ids from `request_context`.
        - Creates the transform payload and calls the transformation API.
    - `Cancelled`
        - Picks the value from notes metadata attribute of the action asset.
        - Sends the mail out to the requester CC: `Assignee` to inform that `the request has been rejected` and attach the reviewer notes 
6. If the assignee is changed
    - Email is sent to the Assignee about the `assigned request`