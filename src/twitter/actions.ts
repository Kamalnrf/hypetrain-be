import axios, {AxiosError} from 'axios'
import {PrismaClient} from '@prisma/client'
import logger from 'loglevel'
import qs from 'qs'

const prisma = new PrismaClient()

type TweetDetails = {
  twitterId: string
  userId: number
  twitterAccessToken: string
  tweetId: string
}

export async function lookUpUser(twitterId: string) {
  const userTokens = await prisma.userTwitter.findUnique({
    where: {
      twitterId: twitterId,
    },
    select: {
      accessToken: true,
      refreshToken: true,
    },
  })

  async function refreshToken() {
    const formData = qs.stringify({
      grant_type: 'refresh_token',
      client_id: process.env.TWITTER_CLIENT_ID,
      refresh_token: userTokens.refreshToken,
    })

    try {
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

      await lookUpUser(twitterId)

      console.log('data =>', data)
    } catch (error) {
      logger.error(
        `Unable to refresh token for user twitterId:${twitterId}`,
        error,
      )
      throw new Error(error)
    }
  }

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
      await refreshToken()
    } else {
      logger.info(`Unable to fetch user details for ${twitterId}`)
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

    return true
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(
        `This tweet cannot be found. ${tweetDetails.tweetId}`,
        error.response.data,
      )
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

    return true
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error(
        `This tweet cannot be found. ${tweetDetails.tweetId}`,
        error.response.data,
      )
    }
  }

  return false
}
