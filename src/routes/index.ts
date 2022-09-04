import express from 'express'

function getRouter() {
  const router = express.Router()
  router.get('/', (_, res) => {
    res.json({
      success: true,
    })
  })
  return router
}
export default getRouter
