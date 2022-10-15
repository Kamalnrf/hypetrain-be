/*
  Warnings:

  - You are about to drop the `Perferences` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "Perferences";

-- CreateTable
CREATE TABLE "Preferences" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "likeTweets" BOOLEAN NOT NULL,
    "retweetTweets" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Preferences_userId_key" ON "Preferences"("userId");
