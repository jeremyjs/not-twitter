import { filter, find, uniq, uniqWith } from 'lodash'

import { Nullable } from './types'

// Users

export interface DbUser {
  id: string
  name: string
  email: string
  phone: string
  password_hash: string
}

let users: Array<DbUser> = []

export const storeUser = (user: DbUser) => {
  users = uniqWith(users.concat(user), (u1, u2) => u1.email === u2.email || u1.phone === u2.phone)
}

export const retrieveUserById = (id: string): Nullable<DbUser> => (
  find(users, (user) => user.id === id)
)

export const retrieveUserByEmail = (email: string): Nullable<DbUser> => (
  find(users, (user) => user.email === email)
)

export const retrieveUserByPhone = (phone: string): Nullable<DbUser> => (
  find(users, (user) => user.phone === phone)
)

// Posts

export interface DbPost {
  id: string
  authorId: string
  content: string
}

let posts: Array<DbPost> = []

export const storePost = (post: DbPost) => {
  posts = uniq(posts.concat(post))
}

export const retrievePostById = (postId: string): Nullable<DbPost> => (
  find(posts, (post) => post.id === postId)
)

export const retrievePostsByUserId = (userId: string): DbPost[] => (
  filter(posts, post => post.authorId === userId)
)

export const updatePostContent = (postId: string, updatedPostContent: string): DbPost => {
  let updated_post

  posts = posts.map(
    (post) => {
      if (post.id !== postId) {
        return post
      }

      updated_post = Object.assign({}, post, { content: updatedPostContent })

      return updated_post
    }
  )

  return updated_post
}

export const deletePostById = (postId: string) => {
  console.log('before:', posts)
  posts = filter(posts, (post) => post.id !== postId)
  console.log('after:', posts)
}
