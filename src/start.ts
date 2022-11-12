import express from 'express'
import cors from 'cors'
import logger from './utils/logger'
import 'express-async-errors'
import detectPort from 'detect-port'
import getRouter from './routes'
import errorMiddleware from './utils/error-middleware'
import pinoHTTP from 'pino-http'

async function startServer({
  port = process.env.SERVER_PORT,
}: {
  port: string | number | undefined
}) {
  port = port ?? (await detectPort(8888))
  const app = express()
  app.use(
    pinoHTTP({
      logger,
      customLogLevel: function (req, res, err) {
        if (res.statusCode >= 400 && res.statusCode < 500) {
          return 'warn'
        } else if (res.statusCode >= 500 || err) {
          return 'error'
        }
        return 'info'
      },
    }),
  )
  app.use(cors())
  app.use(express.urlencoded({extended: true}))
  app.use(express.json())
  // app.use(pinoHTTP)

  const router = getRouter()
  app.use('/api', router)
  app.use(errorMiddleware)

  return new Promise(resolve => {
    const server = app.listen(port, () => {
      logger.info({
        message: `Listening on port ${port}`,
        port,
        method: 'startServer',
      })
      resolve(server)
    })
  })
}

export default startServer
