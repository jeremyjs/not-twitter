import Fastify from 'fastify'
import FastifyCookie from 'fastify-cookie'
import FastifySession from 'fastify-session'
import GQL from 'fastify-gql'
import Redis from 'ioredis'

import graphqlConfig from './graphql'
import { readSecret } from './lib'

export default () => {
  const service = Fastify({
    logger: true,
  })

  service.register(FastifyCookie)
  service.register(FastifySession, {
    cookieName: 'sessionId',
    secret: readSecret('keys/session.key'),
    cookie: { secure: false }, // this would be `true` in production
    expires: 86400000,         // 24 hours in milliseconds
  })

  service.register(GQL, Object.assign({}, graphqlConfig, {
    context: async (req, reply) => ({
      redis: new Redis(),
      session: req.session,
    }),
    graphiql: 'playground',
  }))

  service.get('/', async (req, reply) => {
    return reply.redirect('/playground')
  })

  return service
}
