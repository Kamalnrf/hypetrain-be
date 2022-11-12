import {Request, Response} from 'express'
import {Request as JWTRequest} from 'express-jwt'
import logger from '../utils/logger'
import axios, {AxiosError} from 'axios'
import qs from 'qs'
import {getUserToken} from '../utils/auth'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function register(req: Request, res: Response) {
  const code = req.body.code
  const redirectURI = req.body.redirect_uri

  const formData = qs.stringify({
    grant_type: 'authorization_code',
    client_id: process.env.TWITTER_CLIENT_ID,
    redirect_uri: redirectURI,
    code_verifier: process.env.TWITTER_CODE_VERIFIER,
    code,
  })

  try {
    const {data} = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      formData,
      {
        headers: {
          Authorization: `Basic ${process.env.TWITTER_BEARER_TOKEN}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    const accessToken = data.access_token
    const refreshToken = data.refresh_token

    const {data: twitter} = await axios.get(
      'https://api.twitter.com/2/users/me?',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )

    const user = await prisma.user.upsert({
      where: {twitterId: twitter.data.id},
      create: {
        twitterId: twitter.data.id,
        name: twitter.data.name,
        username: twitter.data.username,
      },
      update: {},
    })

    await prisma.preferences.upsert({
      where: {
        userId: user.id,
      },
      create: {
        likeTweets: true,
        retweetTweets: true,
        userId: user.id,
      },
      update: {},
    })

    await prisma.userTwitter.upsert({
      where: {
        userId: user.id,
      },
      create: {
        accessToken: accessToken,
        refreshToken: refreshToken,
        twitterId: user.twitterId,
        userId: user.id,
      },
      update: {
        accessToken: accessToken,
        refreshToken: refreshToken,
      },
    })

    res.json({
      success: true,
      data: {
        name: user.name,
        username: user.username,
        token: getUserToken({
          id: user.id,
          name: user.name,
          username: user.username,
        }),
      },
    })
  } catch (error) {
    if (error instanceof AxiosError) {
      logger.error({
        message: 'Bad Response from Twitter API',
        method: 'register',
        code: error.code,
        satus: error.response.status,
        error,
      })
      res.status(error.response.status).json({
        success: false,
        code: error.code,
        error: {
          message: error.response.data.error_description,
        },
      })
    } else {
      logger.error({
        message: 'Bad Response from Twitter API',
        error,
        method: 'register',
      })
      res.status(500).json({
        success: false,
        error: {
          message: 'Unable to create an user',
          error,
        },
      })
    }
  }
}

async function registerEmail(req: JWTRequest, res: Response) {
  const id = req.auth?.id
  const email = req.body.email

  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'Invalid token',
      },
    })
  }

  const user = await prisma.user.update({
    where: {id: Number(id)},
    data: {
      email: email,
    },
    select: {
      name: true,
      username: true,
      email: true,
    },
  })

  res.status(200).json({
    success: true,
    data: user,
  })
}

export {register, registerEmail}
