import {Request} from 'express-jwt'
import {Response} from 'express'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function getUserActivity(req: Request, res: Response) {
  const id = req.auth.id
  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'invalid token',
      },
    })
  }

  const activity = await prisma.activity.findMany({
    where: {
      userId: id,
    },
    select: {
      tweetId: true,
      isLike: true,
      isRetweet: true,
      authorId: true,
      id: true,
    },
  })

  res.status(200).json({
    success: true,
    data: activity,
  })
}

export {getUserActivity}
