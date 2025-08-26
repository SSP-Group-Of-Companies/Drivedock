# Admin Safety Processing — Frontend Guide (`/api/v1/onboarding/:id/drug-test`)

> **Audience:** Admin UI (Safety team)  
> **Endpoints in this file:** `GET` and `PATCH` to `/api/v1/onboarding/:id/drug-test` (admin route).  
> **Purpose:** Manage **Drug Test** and **CarriersEdge Training** artifacts for a driver, and update tracker notes.


## TL;DR — What to send when

| Admin Action | Body to Send | Must-Have Rules |
|---|---|---|
| Add/update **Drug Test** photos | `{"drugTest":{"documents":[{s3Key,url}, ...]}}` | `documents` array (if provided) **must contain ≥ 1** item. Temp keys starting with `temp-files/` will be finalized. |
| Set **Drug Test status** | `{"drugTest":{"status":"AWAITING_REVIEW" \| "APPROVED" \| "REJECTED" \| "NOT_UPLOADED"}}` | You **cannot** move *away from* `APPROVED`. Setting `APPROVED` requires **≥ 1 document** (existing or in this request). |
| Mark **CarriersEdge email sent** | `{"carriersEdgeTraining":{"emailSent":true,"emailSentBy":"Admin Name","emailSentAt":"2025-08-26T15:30:00Z"}}` | Once `emailSent` is `true`, it **cannot** be turned `false`. `emailSentBy` and `emailSentAt` are **required** the first time you set it `true` and then **immutable**. |
| Add/update **CarriersEdge certificates** | `{"carriersEdgeTraining":{"certificates":[{s3Key,url}, ...]}}` | List you send replaces the server list. Temp keys are finalized; removed finalized keys get deleted in S3. |
| Mark **CarriersEdge completed** | `{"carriersEdgeTraining":{"completed":true}}` | Can only go from `false → true`. Requires **≥ 1 certificate** on file *after* this update. |
| Update **notes** | `{"notes":"text..."}` | Just a string; stored on the tracker. |

> ⚠️ **Case-sensitive keys**: Use `completed` (lowercase). `Completed` will be ignored by JSON parsing and validation.


## Request/Response

### GET `/api/v1/onboarding/:id/drug-test`
Returns data to render the admin view.

**Response shape**
```jsonc
{
  "success": true,
  "message": "Onboarding test data retrieved",
  "data": {
    "onboardingContext": {
      "id": "<trackerId>",
      "companyId": "ssp-ca",
      "applicationType": "FLAT_BED",
      "needsFlatbedTraining": true,
      "status": { "currentStep": "carriers-edge-training", "completed": false },
      "prevStep": "drive-test",
      "nextStep": "drug-test",
      "notes": "some notes",
      "itemSummary": { "driverName": "John Doe", "driverEmail": "john@example.com" }
    },
    "drugTest": { /* DrugTest doc or {} if none */ },
    "carriersEdge": { /* CarriersEdgeTraining doc or {} if none */ },
    "driveTest": { /* DriveTest doc or {} if none */ },
    "identifications": { "driverLicenseExpiration": "2026-12-27T00:00:00.000Z" } // optional
  }
}
```


### PATCH `/api/v1/onboarding/:id/drug-test`
Sends admin updates. **All top-level fields are optional**—send only what you’re changing.

**Top-level body shape**
```jsonc
{
  "notes": "string?",
  "drugTest": {
    "documents": [ { "s3Key": "temp-files/.../file.jpg", "url": "https://..." } ],
    "status": "NOT_UPLOADED" // or "AWAITING_REVIEW" | "APPROVED" | "REJECTED"
  },
  "carriersEdgeTraining": {
    "certificates": [ { "s3Key": "temp-files/.../file.png", "url": "https://..." } ],
    "emailSent": true,
    "emailSentBy": "Admin Name",
    "emailSentAt": "2025-08-26T15:30:00Z",
    "completed": true
  }
}
```

**Response shape (mirrors GET)**
```jsonc
{
  "success": true,
  "message": "Onboarding safety data updated",
  "data": {
    "onboardingContext": { /* enriched like GET */ },
    "drugTest": { /* updated or fresh snapshot */ },
    "carriersEdge": { /* updated or fresh snapshot */ },
    "driveTest": { /* fresh snapshot */ },
    "identifications": { "driverLicenseExpiration": "..." } // optional
  }
}
```


## Validation, Step Gating & No-Go-Back Rules

### Step gating
- **Drug Test block** requires the tracker to have **reached** `DRUG_TEST`. Otherwise `401`.
- **CarriersEdge block** requires the tracker to have **reached** `CARRIERS_EDGE_TRAINING`. Otherwise `401`.

### Drug Test
- **documents**: If you include `"documents"`, it must be an array with **≥ 1** item.  
  - Temp keys (`s3Key` starting with `temp-files/`) are **finalized** to permanent keys.  
  - Any finalized objects removed from the new list are **deleted** from S3.
- **status**:  
  - You **cannot** change status **away from** `APPROVED`.  
  - To set `status: "APPROVED"`, there must be **≥ 1** document **either already on file or included in this request**.  
  - Allowed: `"NOT_UPLOADED"`, `"AWAITING_REVIEW"`, `"APPROVED"`, `"REJECTED"`.

### CarriersEdge Training
- **certificates**: Full **replacement** of the list. Temp keys are finalized; removed finalized keys deleted from S3.
- **emailSent**:  
  - Once `true`, it **cannot** be set back to `false`.  
  - **First time** setting `true` requires `emailSentBy` and **valid** `emailSentAt` ISO date.  
  - After `true`, `emailSentBy` and `emailSentAt` are **immutable**.
- **completed**:  
  - You can only go `false → true`.  
  - Setting `true` **requires ≥ 1 certificate** on file after this update.  
  - Attempting to set `false` after `true` yields `400`.

### Tracker
- **notes**: simple string update.
- On successful updates of DrugTest or CarriersEdge, the tracker’s `resumeExpiresAt` is **refreshed** and status may **advance** internally.


## Example Requests

### 1) Notes only
```json
{ "notes": "Called driver; awaiting upload this week." }
```

### 2) Drug Test — upload first document and set AWAITING_REVIEW
```json
{
  "drugTest": {
    "documents": [
      {
        "s3Key": "temp-files/drug-test/6f2a2b1e-abc1-4d3f-ae10-1b2c3d4e5f67.jpg",
        "url": "https://your-bucket.s3.region.amazonaws.com/temp-files/drug-test/6f2a2b1e-abc1-4d3f-ae10-1b2c3d4e5f67.jpg"
      }
    ],
    "status": "AWAITING_REVIEW"
  }
}
```

### 3) Drug Test — approve (requires ≥ 1 doc already or incoming)
```json
{ "drugTest": { "status": "APPROVED" } }
```

### 4) CarriersEdge — mark email sent (first time)
```json
{
  "carriersEdgeTraining": {
    "emailSent": true,
    "emailSentBy": "Jane Admin",
    "emailSentAt": "2025-08-26T15:30:00Z"
  }
}
```

### 5) CarriersEdge — upload certificates and complete (requires ≥ 1 cert)
```json
{
  "carriersEdgeTraining": {
    "certificates": [
      {
        "s3Key": "temp-files/carriers-edge/1b3c5d7e-1111-2222-3333-444455556666.png",
        "url": "https://your-bucket.s3.region.amazonaws.com/temp-files/carriers-edge/1b3c5d7e-1111-2222-3333-444455556666.png"
      }
    ],
    "completed": true
  }
}
```

### 6) CarriersEdge — replace certificates (delete removed finalized ones)
```json
{
  "carriersEdgeTraining": {
    "certificates": [
      {
        "s3Key": "temp-files/carriers-edge/new-2025-08-26-01.jpg",
        "url": "https://your-bucket.s3.region.amazonaws.com/temp-files/carriers-edge/new-2025-08-26-01.jpg"
      }
    ]
  }
}
```

### 7) Combined: notes + approve drug test + add one CE cert
```json
{
  "notes": "Docs reviewed; approving drug test and saving first CE cert.",
  "drugTest": { "status": "APPROVED" },
  "carriersEdgeTraining": {
    "certificates": [
      {
        "s3Key": "temp-files/carriers-edge/9aa0b3c7-7777-8888-9999-aaaaaaaabbbb.jpg",
        "url": "https://your-bucket.s3.region.amazonaws.com/temp-files/carriers-edge/9aa0b3c7-7777-8888-9999-aaaaaaaabbbb.jpg"
      }
    ]
  }
}
```


## Error Scenarios (What the UI should show)

| Case | Status | Message (example) | What to prompt the admin |
|---|---:|---|---|
| Payload missing or wrong type | 400 | `Invalid payload` | “Please retry; if this continues contact support.” |
| Not reached **Drug Test** step | 401 | `Driver has not reached the Drug Test step yet` | “Complete prior steps before updating Drug Test.” |
| Not reached **CarriersEdge** step | 401 | `Driver has not reached the CarriersEdge Training step yet` | “Complete prior steps before updating CarriersEdge.” |
| Drug Test `documents` empty when provided | 400 | `At least one drug test document is required` | “Attach at least one document.” |
| Approving Drug Test with no docs (existing or incoming) | 400 | `Cannot approve Drug Test until at least one document is uploaded` | “Attach a document before approving.” |
| CarriersEdge `emailSent` → `true` missing `by/at` | 400 | `emailSentBy is required ...` / `emailSentAt must be a valid date ...` | “Provide sender & timestamp.” |
| CarriersEdge `completed` → `true` with no certificates | 400 | `Cannot mark CarriersEdge training as completed until at least one certificate is uploaded` | “Upload at least one certificate.” |
| Attempt to revert immutable flags | 400 | e.g., `emailSent is already true and cannot be changed back to false` | “These fields cannot be reversed.” |


## S3 Handling Details

- **Temp → Final**: Any `s3Key` that starts with `temp-files/` will be finalized to a permanent folder by the backend:
  - Drug Test → `submissions/drug-test-docs/:trackerId/...`
  - CarriersEdge Certificates → `submissions/carriers-edge-certificates/:trackerId/...`
- **Deletions**: When you send the new list, any finalized keys that are *not present* in the new list are **deleted** from S3 by the backend.  
  - Tip: To **remove** a file, send a list that **omits** it.


## Implementation Tips for Frontend

- Always send **lowercase** `completed`, never `Completed`.
- Use ISO dates for `emailSentAt` (e.g., `new Date().toISOString()`).
- For uploads: first PUT to a **temp presigned URL** → then use the returned `s3Key`/`url` in the PATCH body.
- Build your form so that **CarriersEdge → Complete** button is disabled until there is **≥ 1 certificate** in your local state.
- When **approving Drug Test**, check that there’s at least one document in local state or on the server (you can read the current `drugTest.documents` from GET).


---

**Questions / edge cases?** Ping the backend team with the request/response logs attached.
