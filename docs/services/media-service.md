# Media Service

Media service owns media records, upload/presign flows, and owner-scoped media access.

## Main Flow

```txt
HTTP/gRPC request
-> media DTO / gRPC request
-> service input type
-> MediaService
-> Prisma media table
-> response shape
```

## Important Concepts

Media service intentionally separates:

- `actorUserId`: the user performing the action
- `actorRole`: the actor's role
- `ownerId`: the user who owns the media

These can be the same user, but they are not the same concept.

## Why Actor And Owner Are Separate

Example:

```txt
regular user uploads their own file
actorUserId = user-1
ownerId = user-1
```

Admin example:

```txt
admin uploads a file for another user
actorUserId = admin-1
ownerId = user-9
```

This separation later supports permission checks before downloads or reads.

## Important Shapes

- `ActorContext`
- `OwnerScopedInput`
- `CreateMediaInput`
- `PresignUploadInput`
- `FinalizeUploadInput`

## Boundary Rule

Controllers resolve actor context and owner intent.

Service methods receive explicit input shapes instead of raw request objects.

## Access Direction

Future media access should check ownership before returning protected data or download URLs.

The intended order is:

```txt
resolve actor
-> check owner/scope/accessClass
-> then fetch or release media data
```
