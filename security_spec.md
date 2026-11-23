# Choy Chat Firestore Security Specification (Phase 0)

## Data Invariants
1. **Default Deny:** Unmatched paths are denied for all read/write operations.
2. **Verified Authentication:** All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Admin Isolation:** `/ledger/{rowId}`, `/settings/{settingId}`, and `/admins/{userId}` are strictly restricted to verified admins (`choycounterflow@gmail.com` or `choyjiez07@gmail.com` with `email_verified == true` or a document in `/admins/{uid}`).
4. **PII Split Collection:** Public user profiles in `/users/{userId}` contain zero email/phone PII; private PII (`email`, `phone`, `blockedUsers`) lives under `/users/{userId}/private/info` and is gated by parent `/users/{userId}` existence + `isOwner(userId) || isAdmin()`.
5. **Identity Integrity:** Posts and messages must set `authorId` / `senderId` equal to `request.auth.uid`, and these fields plus `createdAt` are immutable after creation.
6. **Strict Schema & Bounds:** Every string and array enforces `.size()` limits, every ID enforces `isValidId()`, and every update uses `isValid[Entity](incoming())` + `affectedKeys().hasOnly(...)`.
7. **Temporal Integrity:** `createdAt` must equal `request.time` on create; `updatedAt` must equal `request.time` on update.

## The "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Shadow Field Injection (Post):** Creating a post with extra `"isAdmin": true` ghost field.
2. **Email Spoofing (Admin):** Request with `token.email in ["choyjiez07@gmail.com", "choycounterflow@gmail.com"]` but `token.email_verified == false` attempting to read `/ledger/row1`.
3. **PII Leak (Cross-User Read):** Authenticated non-admin user B reading `/users/userA/private/info`.
4. **Self-Assigned Admin:** Non-admin user creating `/admins/{uid}` for themselves.
5. **Identity Spoofing (Post):** User A creating `/posts/p1` with `authorId: "userB"`.
6. **Identity Spoofing (Message):** User A creating `/messages/m1` with `senderId: "userB"`.
7. **State Shortcutting (User Approval):** Non-admin user creating `/users/{uid}` with `status: "approved"` instead of `"pending"`, or updating their own `status` to `"approved"`.
8. **Immutable Field Tampering:** Updating `createdAt` or `senderId` on an existing message.
9. **Value Poisoning (Reactions):** Updating `reactions` on a message with 50 items or non-string elements.
10. **ID Poisoning:** Creating a document at `/posts/$$$bad..id###` or with an ID > 128 chars.
11. **Client Timestamp Forgery:** Creating a post with a forged `createdAt` timestamp != `request.time`.
12. **Unauthorized Ledger Write:** Non-admin user attempting to create or list `/ledger/{rowId}`.
13. **Cloud Account Vault Access (Non-Admin):** Non-admin authenticated user attempting to `get`, `list`, `create`, `update`, or `delete` `/cloud_accounts/{accountId}` (contains `phone` and `pinHash`).
14. **Cloud Config / Announcement Forgery:** Non-admin user writing `/cloud_newsfeed_config/{docId}` or `/cloud_announcements/{annId}`, or admin writing oversized `avatar` (> 200,000 chars) or extra shadow fields.
