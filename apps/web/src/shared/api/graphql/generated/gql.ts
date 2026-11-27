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
    "\n  mutation UpdateProfile($displayName: String!, $username: String!, $bio: String!) {\n    updateProfile(displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n": typeof types.UpdateProfileDocument,
    "\n  query AdminUser($userId: ID!) {\n    adminUser(userId: $userId) { id displayName username bio role twoFactorEnabled }\n  }\n": typeof types.AdminUserDocument,
    "\n  mutation UpdateAdminUser($userId: ID!, $displayName: String!, $username: String!, $bio: String!) {\n    updateAdminUser(userId: $userId, displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n": typeof types.UpdateAdminUserDocument,
    "\n  mutation ResetUserPassword($userId: ID!, $newPassword: String!) {\n    resetUserPassword(userId: $userId, newPassword: $newPassword)\n  }\n": typeof types.ResetUserPasswordDocument,
    "\n  mutation ChangePassword($password: String!, $newPassword: String!, $otp: String) {\n    changePassword(password: $password, newPassword: $newPassword, otp: $otp)\n  }\n": typeof types.ChangePasswordDocument,
    "\n  mutation BeginTotp($password: String!) { beginTotp(password: $password) }\n": typeof types.BeginTotpDocument,
    "\n  mutation EnableTotp($password: String!, $code: String!) { enableTotp(password: $password, code: $code) }\n": typeof types.EnableTotpDocument,
    "\n  mutation DisableTotp($password: String!, $otp: String!) { disableTotp(password: $password, otp: $otp) }\n": typeof types.DisableTotpDocument,
    "\n  query MySessions { mySessions { id current userAgent createdAt expiresAt } }\n": typeof types.MySessionsDocument,
    "\n  mutation RevokeMySession($id: ID!) { revokeMySession(id: $id) }\n": typeof types.RevokeMySessionDocument,
    "\n  mutation RevokeMyOtherSessions { revokeMyOtherSessions }\n": typeof types.RevokeMyOtherSessionsDocument,
    "\n  mutation DeleteMyAccount($password: String!, $otp: String) { deleteMyAccount(password: $password, otp: $otp) }\n": typeof types.DeleteMyAccountDocument,
    "\n  query AdminUsers($query: String) {\n    adminUsers(query: $query) {\n      id\n      username\n      displayName\n      role\n    }\n  }\n": typeof types.AdminUsersDocument,
    "\n  query AdminInvites {\n    adminInvites {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n": typeof types.AdminInvitesDocument,
    "\n  mutation CreateInvite($maxUses: Int, $expiresInDays: Int, $role: InviteRole) {\n    createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays, role: $role) {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n": typeof types.CreateInviteDocument,
    "\n  query AdminBots {\n    adminBots {\n      id\n      username\n      name\n      description\n      online\n      stopped\n      listed\n      access\n      memberCount\n      avatar\n    }\n  }\n": typeof types.AdminBotsDocument,
    "\n  mutation CreateBot($username: String!, $name: String!, $description: String!) {\n    createBot(username: $username, name: $name, description: $description) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n": typeof types.CreateBotDocument,
    "\n  mutation ResetBotToken($botId: ID!) {\n    resetBotToken(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n": typeof types.ResetBotTokenDocument,
    "\n  mutation SetBotStopped($botId: ID!, $stopped: Boolean!) {\n    setBotStopped(botId: $botId, stopped: $stopped) {\n      id username name description online stopped listed access memberCount avatar welcome guestAccess tags\n    }\n  }\n": typeof types.SetBotStoppedDocument,
    "\n  mutation DeleteBot($botId: ID!) {\n    deleteBot(botId: $botId)\n  }\n": typeof types.DeleteBotDocument,
    "\n  mutation SetBotOwner($botId: ID!, $username: String) {\n    setBotOwner(botId: $botId, username: $username)\n  }\n": typeof types.SetBotOwnerDocument,
    "\n  mutation SetUserRole($userId: ID!, $role: PlatformRole!) {\n    setUserRole(userId: $userId, role: $role) { id username displayName role }\n  }\n": typeof types.SetUserRoleDocument,
    "\n  mutation SetBotAccess($botId: ID!, $access: BotAccess!) {\n    setBotAccess(botId: $botId, access: $access) {\n      id username name description online stopped listed access guestAccess\n    }\n  }\n": typeof types.SetBotAccessDocument,
    "\n  mutation IssueBotInvite($botId: ID!, $roles: [String!], $maxUses: Int, $expiresInDays: Int) {\n    issueBotInvite(botId: $botId, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n": typeof types.IssueBotInviteDocument,
    "\n  query AdminBotDiagnostics($botId: ID!) {\n    adminBotDiagnostics(botId: $botId) {\n      online\n      connectedAt\n      disconnectedAt\n      lastActivityAt\n      lastErrorCode\n      lastErrorAt\n      pendingEvents\n    }\n  }\n": typeof types.AdminBotDiagnosticsDocument,
    "\n  query AdminBot($botId: ID!) {\n    adminBot(botId: $botId) { id username name description online stopped listed access memberCount avatar welcome guestAccess tags }\n  }\n": typeof types.AdminBotDocument,
    "\n  mutation InviteBotMember($botId: ID!, $username: String!, $roles: [String!]!) {\n    inviteBotMember(botId: $botId, username: $username, roles: $roles)\n  }\n": typeof types.InviteBotMemberDocument,
    "\n  mutation RevokeBotInvite($botId: ID!, $id: ID!) {\n    revokeBotInvite(botId: $botId, id: $id)\n  }\n": typeof types.RevokeBotInviteDocument,
    "\n  query BotInvitations($botId: ID!) {\n    botInvitations(botId: $botId) { id url expiresAt revokedAt uses maxUses roles }\n  }\n": typeof types.BotInvitationsDocument,
    "\n  mutation EditBotInvite($botId: ID!, $id: ID!, $roles: [String!]!, $maxUses: Int, $expiresInDays: Int) {\n    editBotInvite(botId: $botId, id: $id, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n": typeof types.EditBotInviteDocument,
    "\n  mutation EditPlatformInvite($code: String!, $role: InviteRole, $maxUses: Int, $expiresInDays: Int) {\n    editPlatformInvite(code: $code, role: $role, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      code url expiresAt revokedAt uses maxUses role\n    }\n  }\n": typeof types.EditPlatformInviteDocument,
    "\n  mutation RevokePlatformInvite($code: String!) { revokePlatformInvite(code: $code) }\n": typeof types.RevokePlatformInviteDocument,
    "\n  query BotMemberships($botId: ID!) {\n    botMemberships(botId: $botId) {\n      roles\n      roleDefinitions { code name virtual }\n      members { chatId username displayName revoked roles }\n    }\n  }\n": typeof types.BotMembershipsDocument,
    "\n  mutation SetBotMemberRoles($botId: ID!, $chatId: ID!, $roles: [String!]!) {\n    setBotMemberRoles(botId: $botId, chatId: $chatId, roles: $roles)\n  }\n": typeof types.SetBotMemberRolesDocument,
    "\n  mutation SetBotMemberRevoked($botId: ID!, $chatId: ID!, $revoked: Boolean!) {\n    setBotMemberRevoked(botId: $botId, chatId: $chatId, revoked: $revoked)\n  }\n": typeof types.SetBotMemberRevokedDocument,
    "\n  query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {\n    chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {\n      bot { id username name description online listed avatar welcome }\n      blocked\n      notifications\n      notificationsMutedUntil\n      media\n      olderMediaBefore\n    }\n  }\n": typeof types.ChatProfileDocument,
    "\n  mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String, $tags: [String!]) {\n    updateBotProfile(botId: $botId, description: $description, welcome: $welcome, avatar: $avatar, tags: $tags) {\n      id username name description online listed access avatar welcome tags\n    }\n  }\n": typeof types.UpdateBotProfileDocument,
    "\n  mutation SetBotGuestAccess($botId: ID!, $enabled: Boolean!) { setBotGuestAccess(botId: $botId, enabled: $enabled) { guestAccess } }\n": typeof types.SetBotGuestAccessDocument,
    "\n  mutation DeleteChat($chatId: ID!) { deleteChat(chatId: $chatId) }\n": typeof types.DeleteChatDocument,
    "\n  mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) {\n    setChatNotifications(chatId: $chatId, mode: $mode) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n": typeof types.SetChatNotificationsDocument,
    "\n  mutation SetChatMute($chatId: ID!, $mutedUntil: Float) {\n    setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n": typeof types.SetChatMuteDocument,
    "\n  query BrowseBots($query: String) {\n    browseBots(query: $query) {\n      id\n      username\n      name\n      description\n      online\n      listed\n      avatar\n      welcome\n      tags\n    }\n  }\n": typeof types.BrowseBotsDocument,
    "\n  query BrowseBot($botId: ID!) {\n    browseBot(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        access\n        avatar\n        welcome\n        tags\n      }\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n": typeof types.BrowseBotDocument,
    "\n  mutation AddBot($username: String!, $invite: String) {\n    addBot(username: $username, invite: $invite) {\n      id\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        avatar\n        welcome\n      }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n": typeof types.AddBotDocument,
    "\n  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {\n    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {\n      toast\n    }\n  }\n": typeof types.PressButtonDocument,
    "\n  mutation MarkRead($chatId: ID!, $seq: Int!) {\n    markRead(chatId: $chatId, seq: $seq)\n  }\n": typeof types.MarkReadDocument,
    "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n": typeof types.BlockBotDocument,
    "\n  query RegistrationPolicy { registrationPolicy { registration invitations } }\n": typeof types.RegistrationPolicyDocument,
    "\n  query GuestChat($username: String!) {\n    guestChat(username: $username) {\n      active\n      bot { id name username description online avatar welcome }\n      commands { name description shortcut }\n      messages { id chatId seq sender content status createdAt editedAt replyTo deleted }\n    }\n  }\n": typeof types.GuestChatDocument,
    "\n  mutation OpenGuestChat($username: String!) { openGuestChat(username: $username) }\n": typeof types.OpenGuestChatDocument,
    "\n  mutation SendGuestCommand($username: String!, $command: String!, $clientId: String!) {\n    sendGuestCommand(username: $username, command: $command, clientId: $clientId)\n  }\n": typeof types.SendGuestCommandDocument,
    "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n": typeof types.MessagesDocument,
    "\n  query SearchMessages($chatId: ID!, $query: String!, $beforeSeq: Int, $limit: Int = 30) {\n    searchMessages(chatId: $chatId, query: $query, beforeSeq: $beforeSeq, limit: $limit) {\n      items {\n        message {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        snippet\n      }\n      hasMore\n    }\n  }\n": typeof types.SearchMessagesDocument,
    "\n  query MessageContext($chatId: ID!, $seq: Int!, $before: Int = 25, $after: Int = 25) {\n    messageContext(chatId: $chatId, seq: $seq, before: $before, after: $after) {\n      messages {\n        id\n        chatId\n        seq\n        sender\n        content\n        status\n        replyTo\n        createdAt\n        editedAt\n        deleted\n      }\n      targetSeq\n      hasEarlier\n      hasLater\n      latestSeq\n    }\n  }\n": typeof types.MessageContextDocument,
    "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n": typeof types.SendMessageDocument,
    "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n      checkpoint\n      hasMore\n    }\n  }\n": typeof types.SyncDocument,
    "\n  query PushStatus($endpoint: String!) {\n    pushStatus(endpoint: $endpoint)\n  }\n": typeof types.PushStatusDocument,
    "\n  mutation SubscribePush($subscription: JSON!) {\n    subscribePush(subscription: $subscription)\n  }\n": typeof types.SubscribePushDocument,
    "\n  mutation UnsubscribePush($endpoint: String!) {\n    unsubscribePush(endpoint: $endpoint)\n  }\n": typeof types.UnsubscribePushDocument,
    "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": typeof types.SessionDocument,
    "\n  mutation Login($username: String!, $password: String!, $otp: String) {\n    login(username: $username, password: $password, otp: $otp) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": typeof types.LoginDocument,
    "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": typeof types.RegisterDocument,
    "\n  mutation Logout($pushEndpoint: String) {\n    logout(pushEndpoint: $pushEndpoint)\n  }\n": typeof types.LogoutDocument,
};
const documents: Documents = {
    "\n  mutation UpdateProfile($displayName: String!, $username: String!, $bio: String!) {\n    updateProfile(displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n": types.UpdateProfileDocument,
    "\n  query AdminUser($userId: ID!) {\n    adminUser(userId: $userId) { id displayName username bio role twoFactorEnabled }\n  }\n": types.AdminUserDocument,
    "\n  mutation UpdateAdminUser($userId: ID!, $displayName: String!, $username: String!, $bio: String!) {\n    updateAdminUser(userId: $userId, displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n": types.UpdateAdminUserDocument,
    "\n  mutation ResetUserPassword($userId: ID!, $newPassword: String!) {\n    resetUserPassword(userId: $userId, newPassword: $newPassword)\n  }\n": types.ResetUserPasswordDocument,
    "\n  mutation ChangePassword($password: String!, $newPassword: String!, $otp: String) {\n    changePassword(password: $password, newPassword: $newPassword, otp: $otp)\n  }\n": types.ChangePasswordDocument,
    "\n  mutation BeginTotp($password: String!) { beginTotp(password: $password) }\n": types.BeginTotpDocument,
    "\n  mutation EnableTotp($password: String!, $code: String!) { enableTotp(password: $password, code: $code) }\n": types.EnableTotpDocument,
    "\n  mutation DisableTotp($password: String!, $otp: String!) { disableTotp(password: $password, otp: $otp) }\n": types.DisableTotpDocument,
    "\n  query MySessions { mySessions { id current userAgent createdAt expiresAt } }\n": types.MySessionsDocument,
    "\n  mutation RevokeMySession($id: ID!) { revokeMySession(id: $id) }\n": types.RevokeMySessionDocument,
    "\n  mutation RevokeMyOtherSessions { revokeMyOtherSessions }\n": types.RevokeMyOtherSessionsDocument,
    "\n  mutation DeleteMyAccount($password: String!, $otp: String) { deleteMyAccount(password: $password, otp: $otp) }\n": types.DeleteMyAccountDocument,
    "\n  query AdminUsers($query: String) {\n    adminUsers(query: $query) {\n      id\n      username\n      displayName\n      role\n    }\n  }\n": types.AdminUsersDocument,
    "\n  query AdminInvites {\n    adminInvites {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n": types.AdminInvitesDocument,
    "\n  mutation CreateInvite($maxUses: Int, $expiresInDays: Int, $role: InviteRole) {\n    createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays, role: $role) {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n": types.CreateInviteDocument,
    "\n  query AdminBots {\n    adminBots {\n      id\n      username\n      name\n      description\n      online\n      stopped\n      listed\n      access\n      memberCount\n      avatar\n    }\n  }\n": types.AdminBotsDocument,
    "\n  mutation CreateBot($username: String!, $name: String!, $description: String!) {\n    createBot(username: $username, name: $name, description: $description) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n": types.CreateBotDocument,
    "\n  mutation ResetBotToken($botId: ID!) {\n    resetBotToken(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n": types.ResetBotTokenDocument,
    "\n  mutation SetBotStopped($botId: ID!, $stopped: Boolean!) {\n    setBotStopped(botId: $botId, stopped: $stopped) {\n      id username name description online stopped listed access memberCount avatar welcome guestAccess tags\n    }\n  }\n": types.SetBotStoppedDocument,
    "\n  mutation DeleteBot($botId: ID!) {\n    deleteBot(botId: $botId)\n  }\n": types.DeleteBotDocument,
    "\n  mutation SetBotOwner($botId: ID!, $username: String) {\n    setBotOwner(botId: $botId, username: $username)\n  }\n": types.SetBotOwnerDocument,
    "\n  mutation SetUserRole($userId: ID!, $role: PlatformRole!) {\n    setUserRole(userId: $userId, role: $role) { id username displayName role }\n  }\n": types.SetUserRoleDocument,
    "\n  mutation SetBotAccess($botId: ID!, $access: BotAccess!) {\n    setBotAccess(botId: $botId, access: $access) {\n      id username name description online stopped listed access guestAccess\n    }\n  }\n": types.SetBotAccessDocument,
    "\n  mutation IssueBotInvite($botId: ID!, $roles: [String!], $maxUses: Int, $expiresInDays: Int) {\n    issueBotInvite(botId: $botId, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n": types.IssueBotInviteDocument,
    "\n  query AdminBotDiagnostics($botId: ID!) {\n    adminBotDiagnostics(botId: $botId) {\n      online\n      connectedAt\n      disconnectedAt\n      lastActivityAt\n      lastErrorCode\n      lastErrorAt\n      pendingEvents\n    }\n  }\n": types.AdminBotDiagnosticsDocument,
    "\n  query AdminBot($botId: ID!) {\n    adminBot(botId: $botId) { id username name description online stopped listed access memberCount avatar welcome guestAccess tags }\n  }\n": types.AdminBotDocument,
    "\n  mutation InviteBotMember($botId: ID!, $username: String!, $roles: [String!]!) {\n    inviteBotMember(botId: $botId, username: $username, roles: $roles)\n  }\n": types.InviteBotMemberDocument,
    "\n  mutation RevokeBotInvite($botId: ID!, $id: ID!) {\n    revokeBotInvite(botId: $botId, id: $id)\n  }\n": types.RevokeBotInviteDocument,
    "\n  query BotInvitations($botId: ID!) {\n    botInvitations(botId: $botId) { id url expiresAt revokedAt uses maxUses roles }\n  }\n": types.BotInvitationsDocument,
    "\n  mutation EditBotInvite($botId: ID!, $id: ID!, $roles: [String!]!, $maxUses: Int, $expiresInDays: Int) {\n    editBotInvite(botId: $botId, id: $id, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n": types.EditBotInviteDocument,
    "\n  mutation EditPlatformInvite($code: String!, $role: InviteRole, $maxUses: Int, $expiresInDays: Int) {\n    editPlatformInvite(code: $code, role: $role, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      code url expiresAt revokedAt uses maxUses role\n    }\n  }\n": types.EditPlatformInviteDocument,
    "\n  mutation RevokePlatformInvite($code: String!) { revokePlatformInvite(code: $code) }\n": types.RevokePlatformInviteDocument,
    "\n  query BotMemberships($botId: ID!) {\n    botMemberships(botId: $botId) {\n      roles\n      roleDefinitions { code name virtual }\n      members { chatId username displayName revoked roles }\n    }\n  }\n": types.BotMembershipsDocument,
    "\n  mutation SetBotMemberRoles($botId: ID!, $chatId: ID!, $roles: [String!]!) {\n    setBotMemberRoles(botId: $botId, chatId: $chatId, roles: $roles)\n  }\n": types.SetBotMemberRolesDocument,
    "\n  mutation SetBotMemberRevoked($botId: ID!, $chatId: ID!, $revoked: Boolean!) {\n    setBotMemberRevoked(botId: $botId, chatId: $chatId, revoked: $revoked)\n  }\n": types.SetBotMemberRevokedDocument,
    "\n  query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {\n    chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {\n      bot { id username name description online listed avatar welcome }\n      blocked\n      notifications\n      notificationsMutedUntil\n      media\n      olderMediaBefore\n    }\n  }\n": types.ChatProfileDocument,
    "\n  mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String, $tags: [String!]) {\n    updateBotProfile(botId: $botId, description: $description, welcome: $welcome, avatar: $avatar, tags: $tags) {\n      id username name description online listed access avatar welcome tags\n    }\n  }\n": types.UpdateBotProfileDocument,
    "\n  mutation SetBotGuestAccess($botId: ID!, $enabled: Boolean!) { setBotGuestAccess(botId: $botId, enabled: $enabled) { guestAccess } }\n": types.SetBotGuestAccessDocument,
    "\n  mutation DeleteChat($chatId: ID!) { deleteChat(chatId: $chatId) }\n": types.DeleteChatDocument,
    "\n  mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) {\n    setChatNotifications(chatId: $chatId, mode: $mode) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n": types.SetChatNotificationsDocument,
    "\n  mutation SetChatMute($chatId: ID!, $mutedUntil: Float) {\n    setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n": types.SetChatMuteDocument,
    "\n  query BrowseBots($query: String) {\n    browseBots(query: $query) {\n      id\n      username\n      name\n      description\n      online\n      listed\n      avatar\n      welcome\n      tags\n    }\n  }\n": types.BrowseBotsDocument,
    "\n  query BrowseBot($botId: ID!) {\n    browseBot(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        access\n        avatar\n        welcome\n        tags\n      }\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n": types.BrowseBotDocument,
    "\n  mutation AddBot($username: String!, $invite: String) {\n    addBot(username: $username, invite: $invite) {\n      id\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        avatar\n        welcome\n      }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n": types.AddBotDocument,
    "\n  mutation PressButton($chatId: ID!, $messageId: ID!, $data: String!) {\n    pressButton(chatId: $chatId, messageId: $messageId, data: $data) {\n      toast\n    }\n  }\n": types.PressButtonDocument,
    "\n  mutation MarkRead($chatId: ID!, $seq: Int!) {\n    markRead(chatId: $chatId, seq: $seq)\n  }\n": types.MarkReadDocument,
    "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n": types.BlockBotDocument,
    "\n  query RegistrationPolicy { registrationPolicy { registration invitations } }\n": types.RegistrationPolicyDocument,
    "\n  query GuestChat($username: String!) {\n    guestChat(username: $username) {\n      active\n      bot { id name username description online avatar welcome }\n      commands { name description shortcut }\n      messages { id chatId seq sender content status createdAt editedAt replyTo deleted }\n    }\n  }\n": types.GuestChatDocument,
    "\n  mutation OpenGuestChat($username: String!) { openGuestChat(username: $username) }\n": types.OpenGuestChatDocument,
    "\n  mutation SendGuestCommand($username: String!, $command: String!, $clientId: String!) {\n    sendGuestCommand(username: $username, command: $command, clientId: $clientId)\n  }\n": types.SendGuestCommandDocument,
    "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n": types.MessagesDocument,
    "\n  query SearchMessages($chatId: ID!, $query: String!, $beforeSeq: Int, $limit: Int = 30) {\n    searchMessages(chatId: $chatId, query: $query, beforeSeq: $beforeSeq, limit: $limit) {\n      items {\n        message {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        snippet\n      }\n      hasMore\n    }\n  }\n": types.SearchMessagesDocument,
    "\n  query MessageContext($chatId: ID!, $seq: Int!, $before: Int = 25, $after: Int = 25) {\n    messageContext(chatId: $chatId, seq: $seq, before: $before, after: $after) {\n      messages {\n        id\n        chatId\n        seq\n        sender\n        content\n        status\n        replyTo\n        createdAt\n        editedAt\n        deleted\n      }\n      targetSeq\n      hasEarlier\n      hasLater\n      latestSeq\n    }\n  }\n": types.MessageContextDocument,
    "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n": types.SendMessageDocument,
    "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n      checkpoint\n      hasMore\n    }\n  }\n": types.SyncDocument,
    "\n  query PushStatus($endpoint: String!) {\n    pushStatus(endpoint: $endpoint)\n  }\n": types.PushStatusDocument,
    "\n  mutation SubscribePush($subscription: JSON!) {\n    subscribePush(subscription: $subscription)\n  }\n": types.SubscribePushDocument,
    "\n  mutation UnsubscribePush($endpoint: String!) {\n    unsubscribePush(endpoint: $endpoint)\n  }\n": types.UnsubscribePushDocument,
    "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": types.SessionDocument,
    "\n  mutation Login($username: String!, $password: String!, $otp: String) {\n    login(username: $username, password: $password, otp: $otp) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": types.LoginDocument,
    "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n": types.RegisterDocument,
    "\n  mutation Logout($pushEndpoint: String) {\n    logout(pushEndpoint: $pushEndpoint)\n  }\n": types.LogoutDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateProfile($displayName: String!, $username: String!, $bio: String!) {\n    updateProfile(displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n"): typeof import('./graphql').UpdateProfileDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminUser($userId: ID!) {\n    adminUser(userId: $userId) { id displayName username bio role twoFactorEnabled }\n  }\n"): typeof import('./graphql').AdminUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateAdminUser($userId: ID!, $displayName: String!, $username: String!, $bio: String!) {\n    updateAdminUser(userId: $userId, displayName: $displayName, username: $username, bio: $bio) { id displayName username bio role twoFactorEnabled }\n  }\n"): typeof import('./graphql').UpdateAdminUserDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetUserPassword($userId: ID!, $newPassword: String!) {\n    resetUserPassword(userId: $userId, newPassword: $newPassword)\n  }\n"): typeof import('./graphql').ResetUserPasswordDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ChangePassword($password: String!, $newPassword: String!, $otp: String) {\n    changePassword(password: $password, newPassword: $newPassword, otp: $otp)\n  }\n"): typeof import('./graphql').ChangePasswordDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation BeginTotp($password: String!) { beginTotp(password: $password) }\n"): typeof import('./graphql').BeginTotpDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation EnableTotp($password: String!, $code: String!) { enableTotp(password: $password, code: $code) }\n"): typeof import('./graphql').EnableTotpDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DisableTotp($password: String!, $otp: String!) { disableTotp(password: $password, otp: $otp) }\n"): typeof import('./graphql').DisableTotpDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MySessions { mySessions { id current userAgent createdAt expiresAt } }\n"): typeof import('./graphql').MySessionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeMySession($id: ID!) { revokeMySession(id: $id) }\n"): typeof import('./graphql').RevokeMySessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeMyOtherSessions { revokeMyOtherSessions }\n"): typeof import('./graphql').RevokeMyOtherSessionsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteMyAccount($password: String!, $otp: String) { deleteMyAccount(password: $password, otp: $otp) }\n"): typeof import('./graphql').DeleteMyAccountDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminUsers($query: String) {\n    adminUsers(query: $query) {\n      id\n      username\n      displayName\n      role\n    }\n  }\n"): typeof import('./graphql').AdminUsersDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminInvites {\n    adminInvites {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n"): typeof import('./graphql').AdminInvitesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateInvite($maxUses: Int, $expiresInDays: Int, $role: InviteRole) {\n    createInvite(maxUses: $maxUses, expiresInDays: $expiresInDays, role: $role) {\n      code\n      uses\n      maxUses\n      url\n      role\n      expiresAt\n      revokedAt\n    }\n  }\n"): typeof import('./graphql').CreateInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminBots {\n    adminBots {\n      id\n      username\n      name\n      description\n      online\n      stopped\n      listed\n      access\n      memberCount\n      avatar\n    }\n  }\n"): typeof import('./graphql').AdminBotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation CreateBot($username: String!, $name: String!, $description: String!) {\n    createBot(username: $username, name: $name, description: $description) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n"): typeof import('./graphql').CreateBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation ResetBotToken($botId: ID!) {\n    resetBotToken(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        stopped\n        listed\n        access\n      }\n      token\n    }\n  }\n"): typeof import('./graphql').ResetBotTokenDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotStopped($botId: ID!, $stopped: Boolean!) {\n    setBotStopped(botId: $botId, stopped: $stopped) {\n      id username name description online stopped listed access memberCount avatar welcome guestAccess tags\n    }\n  }\n"): typeof import('./graphql').SetBotStoppedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteBot($botId: ID!) {\n    deleteBot(botId: $botId)\n  }\n"): typeof import('./graphql').DeleteBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotOwner($botId: ID!, $username: String) {\n    setBotOwner(botId: $botId, username: $username)\n  }\n"): typeof import('./graphql').SetBotOwnerDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetUserRole($userId: ID!, $role: PlatformRole!) {\n    setUserRole(userId: $userId, role: $role) { id username displayName role }\n  }\n"): typeof import('./graphql').SetUserRoleDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotAccess($botId: ID!, $access: BotAccess!) {\n    setBotAccess(botId: $botId, access: $access) {\n      id username name description online stopped listed access guestAccess\n    }\n  }\n"): typeof import('./graphql').SetBotAccessDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation IssueBotInvite($botId: ID!, $roles: [String!], $maxUses: Int, $expiresInDays: Int) {\n    issueBotInvite(botId: $botId, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n"): typeof import('./graphql').IssueBotInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminBotDiagnostics($botId: ID!) {\n    adminBotDiagnostics(botId: $botId) {\n      online\n      connectedAt\n      disconnectedAt\n      lastActivityAt\n      lastErrorCode\n      lastErrorAt\n      pendingEvents\n    }\n  }\n"): typeof import('./graphql').AdminBotDiagnosticsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query AdminBot($botId: ID!) {\n    adminBot(botId: $botId) { id username name description online stopped listed access memberCount avatar welcome guestAccess tags }\n  }\n"): typeof import('./graphql').AdminBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation InviteBotMember($botId: ID!, $username: String!, $roles: [String!]!) {\n    inviteBotMember(botId: $botId, username: $username, roles: $roles)\n  }\n"): typeof import('./graphql').InviteBotMemberDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokeBotInvite($botId: ID!, $id: ID!) {\n    revokeBotInvite(botId: $botId, id: $id)\n  }\n"): typeof import('./graphql').RevokeBotInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BotInvitations($botId: ID!) {\n    botInvitations(botId: $botId) { id url expiresAt revokedAt uses maxUses roles }\n  }\n"): typeof import('./graphql').BotInvitationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation EditBotInvite($botId: ID!, $id: ID!, $roles: [String!]!, $maxUses: Int, $expiresInDays: Int) {\n    editBotInvite(botId: $botId, id: $id, roles: $roles, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      id url expiresAt revokedAt uses maxUses roles\n    }\n  }\n"): typeof import('./graphql').EditBotInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation EditPlatformInvite($code: String!, $role: InviteRole, $maxUses: Int, $expiresInDays: Int) {\n    editPlatformInvite(code: $code, role: $role, maxUses: $maxUses, expiresInDays: $expiresInDays) {\n      code url expiresAt revokedAt uses maxUses role\n    }\n  }\n"): typeof import('./graphql').EditPlatformInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation RevokePlatformInvite($code: String!) { revokePlatformInvite(code: $code) }\n"): typeof import('./graphql').RevokePlatformInviteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BotMemberships($botId: ID!) {\n    botMemberships(botId: $botId) {\n      roles\n      roleDefinitions { code name virtual }\n      members { chatId username displayName revoked roles }\n    }\n  }\n"): typeof import('./graphql').BotMembershipsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotMemberRoles($botId: ID!, $chatId: ID!, $roles: [String!]!) {\n    setBotMemberRoles(botId: $botId, chatId: $chatId, roles: $roles)\n  }\n"): typeof import('./graphql').SetBotMemberRolesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotMemberRevoked($botId: ID!, $chatId: ID!, $revoked: Boolean!) {\n    setBotMemberRevoked(botId: $botId, chatId: $chatId, revoked: $revoked)\n  }\n"): typeof import('./graphql').SetBotMemberRevokedDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query ChatProfile($chatId: ID!, $beforeMediaSeq: Int) {\n    chatProfile(chatId: $chatId, beforeMediaSeq: $beforeMediaSeq) {\n      bot { id username name description online listed avatar welcome }\n      blocked\n      notifications\n      notificationsMutedUntil\n      media\n      olderMediaBefore\n    }\n  }\n"): typeof import('./graphql').ChatProfileDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UpdateBotProfile($botId: ID!, $description: String!, $welcome: String!, $avatar: String, $tags: [String!]) {\n    updateBotProfile(botId: $botId, description: $description, welcome: $welcome, avatar: $avatar, tags: $tags) {\n      id username name description online listed access avatar welcome tags\n    }\n  }\n"): typeof import('./graphql').UpdateBotProfileDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetBotGuestAccess($botId: ID!, $enabled: Boolean!) { setBotGuestAccess(botId: $botId, enabled: $enabled) { guestAccess } }\n"): typeof import('./graphql').SetBotGuestAccessDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation DeleteChat($chatId: ID!) { deleteChat(chatId: $chatId) }\n"): typeof import('./graphql').DeleteChatDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetChatNotifications($chatId: ID!, $mode: ChatNotifications!) {\n    setChatNotifications(chatId: $chatId, mode: $mode) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n"): typeof import('./graphql').SetChatNotificationsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SetChatMute($chatId: ID!, $mutedUntil: Float) {\n    setChatMute(chatId: $chatId, mutedUntil: $mutedUntil) {\n      id\n      bot { id username name description online listed avatar welcome tags }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands { name description shortcut }\n    }\n  }\n"): typeof import('./graphql').SetChatMuteDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BrowseBots($query: String) {\n    browseBots(query: $query) {\n      id\n      username\n      name\n      description\n      online\n      listed\n      avatar\n      welcome\n      tags\n    }\n  }\n"): typeof import('./graphql').BrowseBotsDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query BrowseBot($botId: ID!) {\n    browseBot(botId: $botId) {\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        access\n        avatar\n        welcome\n        tags\n      }\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n"): typeof import('./graphql').BrowseBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation AddBot($username: String!, $invite: String) {\n    addBot(username: $username, invite: $invite) {\n      id\n      bot {\n        id\n        username\n        name\n        description\n        online\n        listed\n        avatar\n        welcome\n      }\n      roles\n      blocked\n      notifications\n      notificationsMutedUntil\n      unread\n      lastMessageAt\n      createdAt\n      commands {\n        name\n        description\n        shortcut\n      }\n    }\n  }\n"): typeof import('./graphql').AddBotDocument;
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
export function graphql(source: "\n  mutation BlockBot($chatId: ID!, $blocked: Boolean!) {\n    blockBot(chatId: $chatId, blocked: $blocked)\n  }\n"): typeof import('./graphql').BlockBotDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query RegistrationPolicy { registrationPolicy { registration invitations } }\n"): typeof import('./graphql').RegistrationPolicyDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query GuestChat($username: String!) {\n    guestChat(username: $username) {\n      active\n      bot { id name username description online avatar welcome }\n      commands { name description shortcut }\n      messages { id chatId seq sender content status createdAt editedAt replyTo deleted }\n    }\n  }\n"): typeof import('./graphql').GuestChatDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation OpenGuestChat($username: String!) { openGuestChat(username: $username) }\n"): typeof import('./graphql').OpenGuestChatDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendGuestCommand($username: String!, $command: String!, $clientId: String!) {\n    sendGuestCommand(username: $username, command: $command, clientId: $clientId)\n  }\n"): typeof import('./graphql').SendGuestCommandDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Messages($chatId: ID!, $before: Int, $limit: Int = 50) {\n    messages(chatId: $chatId, before: $before, limit: $limit) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n"): typeof import('./graphql').MessagesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query SearchMessages($chatId: ID!, $query: String!, $beforeSeq: Int, $limit: Int = 30) {\n    searchMessages(chatId: $chatId, query: $query, beforeSeq: $beforeSeq, limit: $limit) {\n      items {\n        message {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        snippet\n      }\n      hasMore\n    }\n  }\n"): typeof import('./graphql').SearchMessagesDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query MessageContext($chatId: ID!, $seq: Int!, $before: Int = 25, $after: Int = 25) {\n    messageContext(chatId: $chatId, seq: $seq, before: $before, after: $after) {\n      messages {\n        id\n        chatId\n        seq\n        sender\n        content\n        status\n        replyTo\n        createdAt\n        editedAt\n        deleted\n      }\n      targetSeq\n      hasEarlier\n      hasLater\n      latestSeq\n    }\n  }\n"): typeof import('./graphql').MessageContextDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SendMessage($input: SendMessageInput!) {\n    sendMessage(input: $input) {\n      id\n      chatId\n      seq\n      sender\n      content\n      status\n      replyTo\n      createdAt\n      editedAt\n      deleted\n    }\n  }\n"): typeof import('./graphql').SendMessageDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Sync($since: Int!) {\n    sync(since: $since) {\n      updates {\n        seq\n        payload\n      }\n      resetRequired\n      checkpoint\n      hasMore\n    }\n  }\n"): typeof import('./graphql').SyncDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query PushStatus($endpoint: String!) {\n    pushStatus(endpoint: $endpoint)\n  }\n"): typeof import('./graphql').PushStatusDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation SubscribePush($subscription: JSON!) {\n    subscribePush(subscription: $subscription)\n  }\n"): typeof import('./graphql').SubscribePushDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation UnsubscribePush($endpoint: String!) {\n    unsubscribePush(endpoint: $endpoint)\n  }\n"): typeof import('./graphql').UnsubscribePushDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  query Session {\n    session {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n"): typeof import('./graphql').SessionDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Login($username: String!, $password: String!, $otp: String) {\n    login(username: $username, password: $password, otp: $otp) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n"): typeof import('./graphql').LoginDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Register(\n    $username: String!\n    $password: String!\n    $displayName: String!\n    $invite: String!\n  ) {\n    register(\n      username: $username\n      password: $password\n      displayName: $displayName\n      invite: $invite\n    ) {\n      user {\n        id\n        username\n        displayName\n        bio\n        twoFactorEnabled\n        role\n      }\n      chats {\n        id\n        bot {\n          id\n          username\n          name\n          description\n          online\n          listed\n          avatar\n          welcome\n        }\n        roles\n        blocked\n        notifications\n        notificationsMutedUntil\n        unread\n        lastMessageAt\n        preview {\n          id\n          chatId\n          seq\n          sender\n          content\n          status\n          replyTo\n          createdAt\n          editedAt\n          deleted\n        }\n        createdAt\n        commands {\n          name\n          description\n          shortcut\n        }\n      }\n      vapidPublicKey\n      botWebSocketUrl\n      checkpoint\n    }\n  }\n"): typeof import('./graphql').RegisterDocument;
/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: "\n  mutation Logout($pushEndpoint: String) {\n    logout(pushEndpoint: $pushEndpoint)\n  }\n"): typeof import('./graphql').LogoutDocument;


export function graphql(source: string) {
  return (documents as any)[source] ?? {};
}
