import {Request} from 'express-jwt'
import {Response} from 'express'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function getPreferences(req: Request, res: Response) {
  const id = req.auth.id
  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'invalid token',
      },
    })
  }

  const preferences = await prisma.perferences.findUnique({
    where: {
      userId: id,
    },
    select: {
      likeTweets: true,
      retweetTweets: true,
    },
  })

  res.status(200).json({
    success: true,
    data: preferences,
  })
}

async function updatePreferences(req: Request, res: Response) {
  const id = req.auth.id
  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'invalid token',
      },
    })
  }

  const likeTweets = req.body.likeTweets
  const retweetTweets = req.body.retweetTweets

  if (likeTweets === undefined || retweetTweets === undefined) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Missing Fields for updating preference',
      },
    })
  }

  const preferences = await prisma.perferences.update({
    where: {
      userId: id,
    },
    data: {
      likeTweets: likeTweets,
      retweetTweets: retweetTweets,
    },
    select: {
      likeTweets,
      retweetTweets,
    },
  })

  res.status(200).json({
    success: true,
    data: preferences,
  })
}

export {updatePreferences, getPreferences}