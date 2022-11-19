import {Request} from 'express-jwt'
import {Response} from 'express'
import {PrismaClient} from '@prisma/client'
import logger from '../utils/logger'

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
    await prisma.user.delete({
      where: {
        id: id,
      },
    })

    logger.info({
      event: 'DELETE-ACCOUNT',
      userId: id,
      message: 'User Account Deleted',
      method: 'deactivateUser',
    })

    res.status(200).json({
      success: true,
      data: {
        message: 'User Account Deleted',
      },
    })
  } catch (error) {
    logger.error({
      event: 'DELETE-ACCOUNT-FAILED',
      userId: id,
      message: 'Deleting account failed',
      method: 'deactivateAccount',
    })
    res.status(500).json({
      success: false,
      error: {
        message: 'Unable to delete user',
      },
    })
  }
}

export {deactivateUser}
