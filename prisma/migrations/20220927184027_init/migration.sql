-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "twitterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Twitter" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "twitterId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Twitter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Perference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "likeTweets" BOOLEAN NOT NULL,
    "retweetTweets" BOOLEAN NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Perference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_twitterId_key" ON "User"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "Twitter_userId_key" ON "Twitter"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Twitter_twitterId_key" ON "Twitter"("twitterId");

-- CreateIndex
CREATE UNIQUE INDEX "Perference_userId_key" ON "Perference"("userId");
