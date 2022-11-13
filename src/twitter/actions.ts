import axios, {AxiosError} from 'axios'
import {PrismaClient} from '@prisma/client'
import logger from '../utils/logger'
import qs from 'qs'

const prisma = new PrismaClient()

type TweetDetails = {
  twitterId: string
  userId: number
  twitterAccessToken: string
  tweetId: string
}

async function refreshToken(twitterId: string, refreshToken: string) {
  const formData = qs.stringify({
    grant_type: 'refresh_token',
    client_id: process.env.TWITTER_CLIENT_ID,
    refresh_token: refreshToken,
  })

  try {
    logger.info({
      message: 'Refreshing token for user',
      twitterId,
      method: 'refreshToken',
    })
    const {data} = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    await prisma.userTwitter.update({
      where: {
        twitterId: twitterId,
      },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
      },
    })

    return await lookUpUser(twitterId)
  } catch (error) {
    logger.error({
      event: 'TWITTER-TOKEN-REFRESH-FAILURE',
      message: 'Unable to refresh token for user',
      error,
      twitterId,
      method: 'refreshToken',
    })
    throw new Error(error)
  }
}

export async function lookUpUser(twitterId: string): Promise<string> {
  const userTokens = await prisma.userTwitter.findUnique({
    where: {
      twitterId: twitterId,
    },
    select: {
      accessToken: true,
      refreshToken: true,
    },
  })

  try {
    const {data} = await axios.get('https://api.twitter.com/2/users/me', {
      headers: {
        Authorization: `Bearer ${userTokens.accessToken}`,
      },
    })

    await prisma.user.update({
      where: {
        twitterId: twitterId,
      },
      data: {
        name: data.name,
        username: data.username,
      },
    })

    return userTokens.accessToken
  } catch (error) {
    if (error instanceof AxiosError && error.response.status === 401) {
      return await refreshToken(twitterId, userTokens.refreshToken)
    } else {
      logger.error({
        message: 'Unable to fetch user',
        twitterId,
        method: 'lookUpUser',
      })
    }
  }
}

export async function retweet(tweetDetails: TweetDetails) {
  try {
    await axios.post(
      `https://api.twitter.com/2/users/${tweetDetails.twitterId}/retweets`,
      {
        tweet_id: tweetDetails.tweetId,
      },
      {
        headers: {
          Authorization: `Bearer ${tweetDetails.twitterAccessToken}`,
        },
      },
    )

    logger.info({
      event: 'TWEET-RETWEETED',
      message: `Tweet ${tweetDetails.tweetId} retweeted`,
      method: 'retweet',
      tweetId: tweetDetails.tweetId,
      userId: tweetDetails.userId,
    })

    return true
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.warn({
        event: 'TWEET-RETWEET-FAILED',
        message: 'Tweet to retweet cannot be found',
        tweeetId: tweetDetails.tweetId,
        error: error.response.data,
        method: 'retweet',
      })
    }
  }

  return false
}

export async function likeTweet(tweetDetails: TweetDetails) {
  try {
    await axios.post(
      `https://api.twitter.com/2/users/${tweetDetails.twitterId}/likes`,
      {
        tweet_id: tweetDetails.tweetId,
      },
      {
        headers: {
          Authorization: `Bearer ${tweetDetails.twitterAccessToken}`,
        },
      },
    )

    logger.info({
      event: 'TWEET-LIKED',
      message: `Tweet ${tweetDetails.tweetId} liked`,
      method: 'retweet',
      tweetId: tweetDetails.tweetId,
      userId: tweetDetails.userId,
    })

    return true
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.warn({
        event: 'TWEET-LIKE-FAILED',
        message: `Tweet to like cannot be found.`,
        tweetId: tweetDetails.tweetId,
        error: error.response.data,
        method: 'likeTweet',
      })
    }
  }

  return false
}
