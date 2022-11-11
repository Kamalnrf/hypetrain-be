import {Request} from 'express-jwt'
import {Response} from 'express'
import {PrismaClient} from '@prisma/client'

const prisma = new PrismaClient()

async function deactivateUser(req: Request, res: Response) {
  const id = req.auth.id
  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'invalid token',
      },
    })
  }

  try {
    const userTwitter = await prisma.userTwitter.findUnique({
      where: {
        userId: id,
      },
      select: {
        twitterId: true,
      },
    })

    await prisma.activity.deleteMany({
      where: {
        userId: id,
      },
    })

    await prisma.preferences.delete({
      where: {
        userId: id,
      },
    })

    await prisma.tweetQueue.deleteMany({
      where: {
        authorId: userTwitter.twitterId,
      },
    })

    await prisma.user.delete({
      where: {
        id: id,
      },
    })

    await prisma.userTwitter.delete({
      where: {
        userId: id,
      },
    })

    res.status(200).json({
      success: true,
      data: {
        message: 'User Account Deleted',
      },
    })
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        message: 'Unable to delete user',
      },
    })
  }
}

export {deactivateUser}
