import express from 'express'
import cors from 'cors'
import logger from 'loglevel'
import 'express-async-errors'
import detectPort from 'detect-port'
import getRouter from './routes'
import errorMiddleware from './utils/error-middleware'

async function startServer({
  port = process.env.SERVER_PORT,
}: {
  port: string | number | undefined
}) {
  port = port ?? (await detectPort(8888))
  const app = express()
  app.use(cors())
  app.use(express.urlencoded({extended: true}))
  app.use(express.json())

  const router = getRouter()
  app.use('/api', router)
  app.use(errorMiddleware)

  return new Promise(resolve => {
    const server = app.listen(port, () => {
      logger.info(`Listening on port ${port}`)
      resolve(server)
    })
  })
}

export default startServer
