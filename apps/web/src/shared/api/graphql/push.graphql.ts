import { graphql } from './generated/gql'

export const SubscribePushDocument = graphql(`
  mutation SubscribePush($subscription: JSON!) {
    subscribePush(subscription: $subscription)
  }
`)

export const UnsubscribePushDocument = graphql(`
  mutation UnsubscribePush($endpoint: String!) {
    unsubscribePush(endpoint: $endpoint)
  }
`)
