import { graphql } from './generated/gql'

export const RegistrationPolicyDocument = graphql(`
  query RegistrationPolicy { registrationPolicy { registration invitations } }
`)

export const GuestChatDocument = graphql(`
  query GuestChat($username: String!) {
    guestChat(username: $username) {
      active
      bot { id name username description online avatar welcome }
      commands { name description shortcut }
      messages { id chatId seq sender content status createdAt editedAt replyTo deleted }
    }
  }
`)
export const OpenGuestChatDocument = graphql(`
  mutation OpenGuestChat($username: String!) { openGuestChat(username: $username) }
`)
export const SendGuestCommandDocument = graphql(`
  mutation SendGuestCommand($username: String!, $command: String!, $clientId: String!) {
    sendGuestCommand(username: $username, command: $command, clientId: $clientId)
  }
`)
