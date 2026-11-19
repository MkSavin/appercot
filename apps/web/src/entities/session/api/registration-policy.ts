import { useEffect, useState } from 'react'
import { graphqlClient, RegistrationPolicyDocument } from '@/shared/api'

export const useRegistrationPolicy = () => {
  const [policy, setPolicy] = useState<{ registration: boolean; invitations: boolean }>()
  useEffect(() => {
    const abort = new AbortController()
    graphqlClient
      .request({ document: RegistrationPolicyDocument, signal: abort.signal })
      .then(({ registrationPolicy }) => setPolicy(registrationPolicy))
      .catch(() => {})
    return () => abort.abort()
  }, [])
  return policy
}
