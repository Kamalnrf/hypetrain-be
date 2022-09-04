import logger, {LogLevelDesc} from 'loglevel'
import startServer from './start'

const logLevel = (process.env.LOG_LEVEL ?? 'info') as LogLevelDesc

logger.setLevel(logLevel)

startServer({port: 8080})
