/*
  Warnings:

  - You are about to drop the `Perference` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Twitter` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Perference";

-- DropTable
DROP TABLE "Twitter";

-- CreateTable
CREATE TABLE "UserTwitter" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "twitterId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTwitter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "likeTweets" BOOLEAN NOT NULL,
    "retweetTweets" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserTwitter_userId_key" ON "UserTwitter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserTwitter_twitterId_key" ON "UserTwitter"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "Perferences_userId_key" ON "Perferences"("userId");
