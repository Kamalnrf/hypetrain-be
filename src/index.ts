import * as dotenv from 'dotenv'
if (process.env.ENVIROMENT === 'development') {
  dotenv.config()
}

import logger, {LogLevelDesc} from 'loglevel'
import startServer from './start'

const logLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevelDesc
logger.setLevel(logLevel)

startServer({port: 8080})
