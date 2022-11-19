import {expressjwt, Request} from 'express-jwt'
import {Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient();

const secret = process.env.AUTH_SECRET
const sixtyDaysInSeconds = 60 * 60 * 24 * 60

type UserDetails = {
  id: number
  username: string
  name: string
}

function getUserToken({id, username, name}: UserDetails) {
  const issuedAt = Math.floor(Date.now() / 1000)
  return jwt.sign(
    {
      id,
      username,
      name,
      iat: issuedAt,
      exp: issuedAt + sixtyDaysInSeconds,
    },
    secret,
  )
}

const authMiddleware = expressjwt({secret: secret, algorithms: ['HS256']})

function verifyUserId(req: Request, res: Response, next: NextFunction) {
  const id = req.auth.id
  if (!id) {
    res.status(401).json({
      success: false,
      error: {
        message: 'invalid token',
      },
    })
  } else {
    next()
  }
}

function verifyAdmin(req: Request, res: Response, next: NextFunction) {
  const id = req.auth.id
  prisma.user.findFirst({
    where: {
      id: id,
    },
    select: {
      isAdmin: true,
    }
  }).then(user => {
    if (user.isAdmin) {
      next()
    } else {
      res.status(401).json({
        success: false,
        error: {
          message: 'user not an admin'
        }
      })
    }
  })
}

export {authMiddleware, getUserToken, verifyUserId, verifyAdmin}
