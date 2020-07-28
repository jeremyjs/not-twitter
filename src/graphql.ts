import bcrypt from 'bcrypt'
import { omit } from 'lodash'
import { v4 as uuidv4 } from 'uuid'

import { isBlank, isPresent } from './lib'
import {
  DbUser,
  storeUser,
  retrieveUserById,
  retrieveUserByEmail,
  retrieveUserByPhone,

  DbPost,
  storePost,
  retrievePostsByUserId,
  retrievePostById,
  updatePostContent,
  deletePostById,
} from './store'

// A schema is a collection of type definitions that together define the
// "shape" of queries that are executed against your data.
const schema = `
  type SuccessPayload {
    success: Boolean
  }

  type AuthPayload {
    sessionId: ID
    user: User
  }

  type User {
    id: ID
    name: String
    email: String
    phone: String
    posts: [Post]
  }

  type Post {
    id: ID
    author: User
    content: String
  }

  type Query {
    postsByUserId(userId: ID): [Post]
    postsByCurrentUser: [Post]
  }

  type Mutation {
    signup(name: String!, email: String!, phone: String!, password: String!): AuthPayload
    login(email: String!, phone: String!, password: String!): AuthPayload
    logout: SuccessPayload
    createPost(authorId: ID!, content: String!): Post
    updatePost(postId: ID!, content: String!): Post
    deletePost(postId: ID!): SuccessPayload
  }
`

const hashPassword = async (pwd: string): Promise<string> => (
  await bcrypt.hash(pwd, await bcrypt.genSalt(10))
)

const dbUserFromArgs = async ({ name, email, phone, password }): Promise<DbUser> => ({
  id: uuidv4(),
  name,
  email,
  phone,
  password_hash: await hashPassword(password),
})

const userFromDbUser = (db_user) => (
  omit(db_user, ['password', 'password_hash'])
)

const dbPostFromArgs = ({ authorId, content }): DbPost => ({
  id: uuidv4(),
  authorId,
  content,
})

const hydrateAuthor = (post) => (
  Object.assign({}, post, { author: retrieveUserById(post.authorId) })
)

// Sessions

const setSessionUser = async (redis, sessionId, user) => (
  await redis.set(`session-${sessionId}`, JSON.stringify(user))
)

const getSessionUser = async (redis, sessionId) => (
  JSON.parse(await redis.get(`session-${sessionId}`))
)

const clearSessionUser = async (redis, sessionId)=> (
  await redis.del(`session-${sessionId}`)
)

// Auth Helpers

const authForAuthor = (session_user, authorId) => {
  if (session_user == null || session_user.id !== authorId) {
    throw new Error('Unauthorized')
  }
}

const authForPost = (session_user, postId) => {
  const original_post = retrievePostById(postId)

  if (original_post == null) {
    throw new Error('Post not found')
  }

  if (session_user == null || session_user.id !== original_post.authorId) {
    throw new Error('Unauthorized')
  }
}

// Resolvers define the technique for fetching the types defined in the
// schema. This resolver retrieves books from the "books" array above.
const resolvers = {
  Query: {
    postsByUserId: (parent, { userId }, { redis, session: { sessionId } }) => {
      return retrievePostsByUserId(userId).map(hydrateAuthor)
    },

    postsByCurrentUser: async (parent, args, { redis, session: { sessionId } }) => {
      const session_user = await getSessionUser(redis, sessionId)

      if (session_user == null) {
        throw new Error('No user is currently authenticated')
      }

      return retrievePostsByUserId(session_user.id).map(hydrateAuthor)
    },
  },

  Mutation: {
    signup: async (parent, { name, email, phone, password }, { redis, session: { sessionId } }) => {
      if (isBlank(email) && isBlank(phone)) {
        throw new Error('Either email or phone is required to register')
      }

      if (isPresent(email) && (retrieveUserByEmail(email) != null)) {
        throw new Error('Email already registered')
      }

      if (isPresent(phone) && (retrieveUserByPhone(phone) != null)) {
        throw new Error('Phone number already registered')
      }

      const db_user = await dbUserFromArgs({ name, email, phone, password })

      storeUser(db_user)

      const user = userFromDbUser(db_user)

      await setSessionUser(redis, sessionId, user)

      return {
        sessionId,
        user,
      }
    },

    login: async (parent, { email, phone, password }, { redis, session: { sessionId } }) => {
      if (isBlank(email) && isBlank(phone)) {
        throw new Error('Either email or phone is required to login')
      }

      const db_user = isPresent(email) ? retrieveUserByEmail(email) : retrieveUserByPhone(phone)

      if (db_user == null) {
        throw new Error('Invalid Login')
      }

      const is_valid_password = await bcrypt.compare(password, db_user.password_hash)
      if (!is_valid_password) {
        throw new Error('Invalid Login')
      }

      const user = userFromDbUser(db_user)

      await setSessionUser(redis, sessionId, user)

      return {
        sessionId,
        user,
      }
    },

    logout: async (parent, args, { redis, session: { sessionId } }) => {
      await clearSessionUser(redis, sessionId)

      return {
        success: true,
      }
    },

    createPost: async (parent, { authorId, content }, { redis, session: { sessionId } }) => {
      authForAuthor(await getSessionUser(redis, sessionId), authorId)

      const db_post = dbPostFromArgs({ authorId, content })

      storePost(db_post)

      return hydrateAuthor(db_post)
    },

    updatePost: async (parent, { postId, content }, { redis, session: { sessionId } }) => {
      authForPost(await getSessionUser(redis, sessionId), postId)

      const updated_post = updatePostContent(postId, content)

      return hydrateAuthor(updated_post)
    },

    deletePost: async (parent, { postId }, { redis, session: { sessionId } }) => {
      authForPost(await getSessionUser(redis, sessionId), postId)

      deletePostById(postId)

      return {
        success: true,
      }
    },
  }
}

const config = {
  schema,
  resolvers,
}

export default config
