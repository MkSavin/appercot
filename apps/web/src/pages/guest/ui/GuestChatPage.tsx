import { useParams } from 'wouter'
import { GuestChat } from './GuestChat'

export const GuestChatPage = () => {
  const { username = '' } = useParams<{ username: string }>()
  return <GuestChat key={username} username={username} />
}
