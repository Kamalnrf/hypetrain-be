-- CreateTable
CREATE TABLE "TweetQueue" (
    "id" SERIAL NOT NULL,
    "tweetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "TweetQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "tweetId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isLike" BOOLEAN NOT NULL,
    "isRetweet" BOOLEAN NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TweetQueue_tweetId_key" ON "TweetQueue"("tweetId");
