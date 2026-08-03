-- Active refresh sessions are owned by auth-service Redis session families.
-- This removes the unused single-token storage path from user-service.
ALTER TABLE "User" DROP COLUMN "refreshToken";
