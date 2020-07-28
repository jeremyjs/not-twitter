import dotenv from 'dotenv'
dotenv.config()

import createService from './service'

const start = async () => {
  const port = 3000

  const service = createService()

  try {
    await service.listen(port)
    service.log.info(`server listening on ${port}`)
  } catch (err) {
    service.log.error(err)
    process.exit(1)
  }
}

start()
