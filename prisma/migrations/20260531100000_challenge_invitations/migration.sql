-- CreateEnum
CREATE TYPE "TeamChallengeInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "TeamChallengeInvitation" (
    "id" TEXT NOT NULL,
    "status" "TeamChallengeInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,

    CONSTRAINT "TeamChallengeInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TeamChallengeInvitation_userId_status_idx" ON "TeamChallengeInvitation"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TeamChallengeInvitation_challengeId_userId_key" ON "TeamChallengeInvitation"("challengeId", "userId");

-- AddForeignKey
ALTER TABLE "TeamChallengeInvitation" ADD CONSTRAINT "TeamChallengeInvitation_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "TeamChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChallengeInvitation" ADD CONSTRAINT "TeamChallengeInvitation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamChallengeInvitation" ADD CONSTRAINT "TeamChallengeInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: existing challenge participants (team members) get accepted invitations
INSERT INTO "TeamChallengeInvitation" ("id", "status", "createdAt", "respondedAt", "challengeId", "userId", "invitedById")
SELECT
    gen_random_uuid()::text,
    'ACCEPTED',
    tc."createdAt",
    tc."createdAt",
    tc."id",
    tm."userId",
    tc."createdById"
FROM "TeamChallenge" tc
INNER JOIN "TeamMember" tm ON tm."teamId" = tc."teamId"
ON CONFLICT DO NOTHING;
