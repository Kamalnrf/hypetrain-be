import * as dotenv from 'dotenv'
if (process.env.ENVIROMENT === 'development') {
  dotenv.config()
}

import startServer from './start'
import {streamTweets} from './twitter'
import logger from './utils/logger'

startServer({port: 8080})
streamTweets()

process.on('uncaughtException', err => {
  logger.error({
    error: err,
    method: 'uncaughtException',
  })
  process.exit(1)
})

process.on('unhandledRejection', err => {
  logger.error({
    error: err,
    method: 'unhandledRejection',
  })
  process.exit(1)
})
