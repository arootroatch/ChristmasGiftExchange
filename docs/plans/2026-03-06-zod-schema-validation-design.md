# Zod Schema Validation for Netlify API Functions

## Problem

Schema knowledge is scattered across handlers as implicit assumptions — `|| []` fallbacks, inline null checks, undocumented request body shapes. There's no single place to see what a User or Exchange looks like, and no validation on incoming request bodies beyond ad-hoc checks.

## Goals

- Centralize data shape definitions as self-documenting Zod schemas
- Validate incoming request bodies with field-level error messages
- Conform DB documents on read (apply defaults like `wishlists: []`)
- Eliminate scattered `|| []` fallbacks and implicit shape knowledge from handlers

## Approach: Zod

Zod is a runtime validation library with a declarative schema API. Schemas serve as documentation, type-checking, and validation in one.

## Schema File Structure

```
netlify/shared/schemas/
  user.mjs       -- User document + wishlist/wishItem sub-schemas
  exchange.mjs   -- Exchange document + assignment/house sub-schemas
```

Request body schemas live at the top of the endpoint file that consumes them (not in a shared file), since each is used by exactly one handler.

### user.mjs

```js
import {z} from "zod";

export const wishlistSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const wishItemSchema = z.object({
    url: z.string(),
    title: z.string(),
});

export const userSchema = z.object({
    _id: z.any().optional(),
    name: z.string(),
    email: z.string().email(),
    token: z.string(),
    wishlists: z.array(wishlistSchema).default([]),
    wishItems: z.array(wishItemSchema).default([]),
});
```

### exchange.mjs

```js
import {z} from "zod";

export const assignmentSchema = z.object({
    giverId: z.any(),
    recipientId: z.any(),
});

export const houseSchema = z.object({
    name: z.string(),
    members: z.array(z.any()),
});

export const exchangeSchema = z.object({
    _id: z.any().optional(),
    exchangeId: z.string(),
    createdAt: z.date(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseSchema),
    participants: z.array(z.any()),
    assignments: z.array(assignmentSchema),
});
```

`z.any()` for MongoDB ObjectIds — we don't need to validate ObjectId format, just that the field exists.

## Two Usage Patterns

### 1. Request Body Validation

A `validateBody` helper in `middleware.mjs`:

```js
export function validateBody(schema, event) {
    const result = schema.safeParse(JSON.parse(event.body));
    if (!result.success) {
        return {error: formatZodError(result.error)};
    }
    return {data: result.data};
}
```

`formatZodError` produces field-level messages: `"Missing required field: exchangeId"` or `"Expected string for email, got number"`.

Handler usage:

```js
const {data, error} = validateBody(myRequestSchema, event);
if (error) return badRequest(error);
```

### 2. DB Document Conforming

Call `.parse()` on documents from MongoDB to apply defaults:

```js
const user = userSchema.parse(await usersCol.findOne({token}));
// user.wishlists is guaranteed [] not undefined
```

`getUserByToken` in `auth.mjs` automatically conforms:

```js
export async function getUserByToken(token) {
    const usersCol = await getUsersCollection();
    const doc = await usersCol.findOne({token});
    return doc ? userSchema.parse(doc) : null;
}
```

Handlers querying directly call `userSchema.parse()` or `exchangeSchema.parse()` at that point.

## Handler Impact

| Handler | Request validation | DB conforming | Other |
|---|---|---|---|
| api-user-get | None | getUserByToken conforms | Remove `\|\| []` |
| api-user-wishlist-put | wishlistPutBody | getUserByToken conforms | Remove `\|\| []` in wasEmpty |
| api-user-contact-post | contactPostBody (defaults "Not provided"/"None") | getUserByToken conforms | Defaults move to schema |
| api-exchange-get | None | userSchema.parse() on recipient | Remove `\|\| []` |
| api-exchange-post | exchangePostBody | None (creating) | Validated data to helpers |
| api-exchange-search | None | exchangeSchema.parse() + userSchema.parse() in enrichExchange | Minor |
| api-recipient-get | None | userSchema.parse() on recipient | Remove `\|\| []` / `&& .length` |
| dispatchEmail | dispatchEmailBody | None | Full refactor: apiHandler, response helpers, sendNotificationEmail, drop node-fetch |

### Request Body Schemas (colocated in endpoint files)

**api-exchange-post.mjs:**
```js
const participantSchema = z.object({name: z.string(), email: z.string().email()});
const assignmentInputSchema = z.object({giver: z.string(), recipient: z.string()});
const houseInputSchema = z.object({
    id: z.string(),
    name: z.string(),
    members: z.array(z.string()),
});
const exchangePostBody = z.object({
    exchangeId: z.string(),
    isSecretSanta: z.boolean(),
    houses: z.array(houseInputSchema),
    participants: z.array(participantSchema),
    assignments: z.array(assignmentInputSchema),
});
```

**api-user-wishlist-put.mjs:**
```js
const wishlistPutBody = z.object({
    wishlists: z.array(wishlistSchema),
    wishItems: z.array(wishItemSchema),
});
```

**api-user-contact-post.mjs:**
```js
const contactPostBody = z.object({
    address: z.string().default("Not provided"),
    phone: z.string().default("Not provided"),
    notes: z.string().default("None"),
});
```

**dispatchEmail.mjs:**
```js
const dispatchEmailBody = z.object({
    email: z.string().email(),
    name: z.string(),
    recipient: z.string(),
    wishlistEditUrl: z.string().nullable().optional(),
});
```

## Additional Changes

- `ok()` in `responses.mjs` updated to default to `{}` when called with no args: `ok(data = {})`
- `dispatchEmail.mjs` gets full refactor: apiHandler, response helpers, sendNotificationEmail, drop node-fetch import

## Out of Scope

- `get_name.mjs` and `postToDb.mjs` (legacy functions, untouched)
- ObjectId format validation (z.any() is sufficient)
- Schema tests (validated indirectly through existing handler integration tests)
