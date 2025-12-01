import buildClient from '../api/build-client'

/**
 * HOC to inject currentUser into page props via getServerSideProps
 * Usage:
 *   export const getServerSideProps = withCurrentUser()
 *
 * Or with custom logic:
 *   export const getServerSideProps = withCurrentUser(async (context, currentUser) => {
 *     // Your custom server-side logic here
 *     return { additionalProp: 'value' }
 *   })
 */
export function withCurrentUser(getServerSidePropsFunc) {
  return async context => {
    const client = buildClient(context)
    let currentUser = null

    try {
      const { data } = await client.get('/api/users/currentuser')
      currentUser = data.currentUser
    } catch (error) {
      // User not authenticated
    }

    // If custom getServerSideProps provided, call it
    if (getServerSidePropsFunc) {
      const customResult = await getServerSidePropsFunc(context, currentUser)
      // Allow the wrapped function to return notFound / redirect shapes
      if (customResult && typeof customResult === 'object') {
        if (customResult.notFound) {
          return { notFound: true }
        }
        if (customResult.redirect) {
          return { redirect: customResult.redirect }
        }
      }
      // Treat returned object as extra props
      const customProps = customResult && typeof customResult === 'object' ? customResult : {}
      return {
        props: {
          currentUser,
          ...customProps
        }
      }
    }

    // Default: just return currentUser
    return {
      props: {
        currentUser
      }
    }
  }
}
