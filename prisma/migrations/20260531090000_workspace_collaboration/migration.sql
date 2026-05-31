ALTER TYPE "TeamRole" ADD VALUE 'ADMIN';
ALTER TYPE "TeamInvitationStatus" ADD VALUE 'EXPIRED';
CREATE TYPE "QuizCollaboratorRole" AS ENUM ('MANAGER', 'EDITOR', 'VIEWER');

ALTER TABLE "Quiz" ADD COLUMN "teamId" TEXT;

ALTER TABLE "TeamInvitation" ADD COLUMN "email" TEXT;
ALTER TABLE "TeamInvitation" ADD COLUMN "tokenHash" TEXT;
ALTER TABLE "TeamInvitation" ADD COLUMN "role" "TeamRole" NOT NULL DEFAULT 'MEMBER';
ALTER TABLE "TeamInvitation" ADD COLUMN "quizRole" "QuizCollaboratorRole";
ALTER TABLE "TeamInvitation" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "TeamInvitation" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "TeamInvitation" ADD COLUMN "quizId" TEXT;

UPDATE "TeamInvitation" AS invitation
SET
    "email" = "User"."email",
    "tokenHash" = 'legacy-' || invitation."id",
    "expiresAt" = invitation."createdAt" + INTERVAL '7 days',
    "acceptedAt" = CASE WHEN invitation."status" = 'ACCEPTED' THEN invitation."respondedAt" ELSE NULL END
FROM "User"
WHERE invitation."invitedUserId" = "User"."id";

ALTER TABLE "TeamInvitation" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "TeamInvitation" ALTER COLUMN "tokenHash" SET NOT NULL;
ALTER TABLE "TeamInvitation" ALTER COLUMN "expiresAt" SET NOT NULL;
ALTER TABLE "TeamInvitation" ALTER COLUMN "invitedUserId" DROP NOT NULL;

DROP INDEX "TeamInvitation_teamId_invitedUserId_key";
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE INDEX "Quiz_teamId_idx" ON "Quiz"("teamId");
CREATE INDEX "TeamInvitation_teamId_email_status_idx" ON "TeamInvitation"("teamId", "email", "status");
CREATE INDEX "TeamInvitation_expiresAt_idx" ON "TeamInvitation"("expiresAt");

CREATE TABLE "QuizCollaborator" (
    "id" TEXT NOT NULL,
    "role" "QuizCollaboratorRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "quizId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "QuizCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizCollaborator_quizId_userId_key" ON "QuizCollaborator"("quizId", "userId");
CREATE INDEX "QuizCollaborator_userId_idx" ON "QuizCollaborator"("userId");

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizCollaborator" ADD CONSTRAINT "QuizCollaborator_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuizCollaborator" ADD CONSTRAINT "QuizCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
