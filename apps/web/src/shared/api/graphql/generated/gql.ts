/* eslint-disable */
import * as types from './graphql';



/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {\n    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {\n      toast\n    }\n  }\n": typeof types.PressButtonDocument,
    "\n  mutation MarkRead($chatId: ID!, $seq: Int!) {\n    markRead(chatId: $chatId, seq: $seq)\n  }\n": typeof types.MarkReadDocument,
    "\n  mutation ClearChat($chatId: ID!) {\n    clearChat(chatId: $chatId)\n  }\n": typeof types.ClearChatDocument,
    "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n": typeof types.BlockBotDocument,
    "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n": typeof types.MessagesDocument,
    "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n": typeof types.SendMessageDocument,
    "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n    }\n  }\n": typeof types.SyncDocument,
    "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": typeof types.SessionDocument,
    "\n  mutation Login($username: String!, $password: String!) {\n    login(username: $username, password: $password) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": typeof types.RegisterDocument,
    "\n  mutation Logout {\n    logout\n  }\n": typeof types.LogoutDocument,
};
const documents: Documents = {
    "\n  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {\n    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {\n      toast\n    }\n  }\n": types.PressButtonDocument,
    "\n  mutation MarkRead($chatId: ID!, $seq: Int!) {\n    markRead(chatId: $chatId, seq: $seq)\n  }\n": types.MarkReadDocument,
    "\n  mutation ClearChat($chatId: ID!) {\n    clearChat(chatId: $chatId)\n  }\n": types.ClearChatDocument,
    "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n": types.BlockBotDocument,
    "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n": types.MessagesDocument,
    "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n": types.SendMessageDocument,
    "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n    }\n  }\n": types.SyncDocument,
    "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": types.SessionDocument,
    "\n  mutation Login($username: String!, $password: String!) {\n    login(username: $username, password: $password) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": types.LoginDocument,
    "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Logout {\n    logout\n  }\n": types.LogoutDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {\n    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {\n      toast\n    }\n  }\n"): typeof import('./graphql').PressButtonDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation MarkRead($chatId: ID!, $seq: Int!) {\n    markRead(chatId: $chatId, seq: $seq)\n  }\n"): typeof import('./graphql').MarkReadDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ClearChat($chatId: ID!) {\n    clearChat(chatId: $chatId)\n  }\n"): typeof import('./graphql').ClearChatDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n"): typeof import('./graphql').BlockBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n"): typeof import('./graphql').MessagesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n    }\n  }\n"): typeof import('./graphql').SendMessageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n    }\n  }\n"): typeof import('./graphql').SyncDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n"): typeof import('./graphql').SessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Login($username: String!, $password: String!) {\n    login(username: $username, password: $password) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n"): typeof import('./graphql').LoginDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        isAdmin\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n        }\n        roles\n        blocked\n        unread\n        lastMessageAt\n        createdAt\n        commands {\n          name\n          description\n        }\n      }\n      vapidPublicKey\n    }\n  }\n"): typeof import('./graphql').RegisterDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout {\n    logout\n  }\n"): typeof import('./graphql').LogoutDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
