# Migration Design: Legacy "names" to New Schema

## Overview

A standalone Node.js script that reads all documents from the legacy `names` collection, groups them by exchange `id`, and populates the `users` and `exchanges` collections — non-destructively and idempotently.

## Legacy Schema

Each document in the `names` collection represents one giver-recipient assignment:

```json
{
  "_id": ObjectId,
  "name": "Zahra",
  "email": "xxvcin@gmail.com",
  "recipient": "Naurah",
  "date": "2026-02-13T16:15:48.459Z",
  "id": "11_0.a2i0h229g2ac_2026-02-13T16:15:48.459Z"
}
```

- `id` groups all documents from the same exchange
- Every recipient is also a giver in the same exchange (has their own document)

## New Schema

**users**: `{ _id, name, email, token (UUID), wishlists: [], wishItems: [] }`

**exchanges**: `{ _id, exchangeId, createdAt, isSecretSanta, houses: [], participants: [ObjectId], assignments: [{ giverId, recipientId }] }`

## Algorithm

1. Fetch all legacy documents from the `names` collection
2. Group by `id` field to reconstruct individual exchanges
3. For each unique participant (matched by email across all exchanges):
   - Upsert into `users` with `{ name, email }`, setting `token`, `wishlists`, `wishItems` only on insert (preserving existing data)
4. For each exchange group:
   - Build participant list by looking up user `_id`s
   - Build assignments array: giver email → recipient name → recipient's email (from their own giver doc in the same exchange) → user `_id`
   - Upsert into `exchanges` keyed on `exchangeId` to prevent duplicates
   - `isSecretSanta: true`, `houses: []`, `createdAt` from the `date` field
   - `exchangeId` is the legacy `id` field
5. Log summary — users created/skipped, exchanges created/skipped

## Constraints

- Non-destructive: does not modify or delete anything in the `names` collection
- Idempotent: safe to re-run; uses upsert pattern
- Standalone Node.js script run locally
- `--dry-run` flag for preview without writes
- Reads `MONGO_DB_URI` and `MONGODB_DATABASE` from env vars