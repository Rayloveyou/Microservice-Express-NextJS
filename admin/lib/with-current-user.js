import buildClient from '../api/build-client'

export function withCurrentUser(getServerSidePropsFunc) {
  return async context => {
    const client = buildClient(context)
    let currentUser = null
    try {
      const { data } = await client.get('/api/users/currentuser')
      currentUser = data.currentUser
    } catch (err) {
      // ignore
    }

    if (getServerSidePropsFunc) {
      const extra = await getServerSidePropsFunc(context, currentUser)
      if (extra?.redirect) return { redirect: extra.redirect }
      if (extra?.notFound) return { notFound: true }
      return { props: { currentUser, ...(extra || {}) } }
    }

    return { props: { currentUser } }
  }
}
