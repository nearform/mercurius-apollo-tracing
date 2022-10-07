let idCount = 1

const notifications = [
  {
    id: idCount,
    message: 'Notification message'
  }
]

export const schema = `
type Notification {
  id: ID!
  message: String
}
type Query {
  notifications: [Notification]
}
type Mutation {
  addNotification(message: String): Notification
}
type Subscription {
  notificationAdded: Notification
}
`

export const resolvers = {
  Query: {
    notifications: () => notifications
  },
  Mutation: {
    addNotification: async (_, { message }, { pubsub }) => {
      const id = idCount++
      const notification = {
        id,
        message
      }
      await pubsub.publish({
        topic: 'NOTIFICATION_ADDED',
        payload: {
          notificationAdded: notification
        }
      })

      return notification
    }
  },
  Subscription: {
    notificationAdded: {
      subscribe: (_, __, { pubsub }) => pubsub.subscribe('NOTIFICATION_ADDED')
    }
  }
}
