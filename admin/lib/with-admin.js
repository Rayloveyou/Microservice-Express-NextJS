import { withCurrentUser } from './with-current-user'

/**
 * HOC cho các trang admin:
 * - Luôn inject currentUser vào props
 * - Nếu không phải admin thì redirect về /auth/signin
 * - Cho phép truyền thêm logic GSSP qua handler (nhận context, currentUser)
 */
export function withAdminPage(handler) {
  return withCurrentUser(async (context, currentUser) => {
    if (!currentUser || currentUser.role !== 'admin') {
      return {
        redirect: {
          destination: '/auth/signin',
          permanent: false
        }
      }
    }

    if (!handler) {
      return {}
    }

    return handler(context, currentUser)
  })
}
