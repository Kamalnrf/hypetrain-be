import { Request } from "express-jwt";
import { Response } from "express";
import { PrismaClient } from "@prisma/client";
import { undoLikeTweet } from "../twitter/actions";
import { undoRetweetTweet } from "../twitter/actions";
import { deleteTweet } from "../twitter/actions";

const prisma = new PrismaClient()

export async function undoTweet(req: Request, res: Response) {
  const tweetId = req.params.tweetId

  const allTweets = await prisma.activity.findMany({
    where: {
      tweetId: tweetId,
    },
    select: {
      id: true,
      authorId: true,
      isLike: true,
      isRetweet: true,
      user: {
        select: {
          twitterId: true,
          userTwitter: {
            select: {
              accessToken: true,
              refreshToken: true
            }
          }
        }
      }
    }
  })

  allTweets.forEach(async tweet => {
    if(tweet.isLike){
      await undoLikeTweet({
        twitterId: tweet.user.twitterId,
        twitterAccessToken: tweet.user.userTwitter.accessToken,
        tweetId: tweetId,
        refreshToken: tweet.user.userTwitter.refreshToken
      })
    }
    if(tweet.isRetweet){
      await undoRetweetTweet({
        twitterId: tweet.user.twitterId,
        twitterAccessToken: tweet.user.userTwitter.accessToken,
        tweetId: tweetId,
        refreshToken: tweet.user.userTwitter.refreshToken
      })
    }

    await prisma.activity.update({
      where: {
        id: tweet.id
      },
      data: {
        isDeleted: true 
      }
    })
  })

  const author = await prisma.userTwitter.findUnique({
    where: {
      twitterId: allTweets[0].authorId
    },
    select: {
      twitterId: true,
      accessToken: true,
      refreshToken: true
    }
  })

  await deleteTweet({
    twitterId: author.twitterId,
    twitterAccessToken: author.accessToken,
    refreshToken: author.refreshToken,
    tweetId: tweetId
  })

  res.status(200).json({
    success: true,
    data: {
      message: `Undone all user likes and retweets for ${tweetId}`
    }
  })
}
