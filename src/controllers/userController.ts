import {Request} from 'express-jwt'
import {Response} from 'express'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function me(req: Request, res: Response) {
  const id = req.auth.id

  const user = await prisma.user.findUnique({
    where: {
      id: id,
    },
    select: {
      username: true,
      name: true,
      email: true,
      twitterId: true,
    },
  })

  const activity = await prisma.activity.findFirst({
    where: {
      authorId: user.twitterId,
    },
    select: {
      id: true,
    },
  })

  res.status(200).json({
    success: true,
    data: {
      username: user.username,
      name: user.name,
      hasTweeted: Boolean(activity?.id),
    },
  })
}

export {me}
