import 'bootstrap/dist/css/bootstrap.css'
import '../styles/theme.css'
import Header from '../components/header'
import Footer from '../components/footer'
import { CartProvider } from '../context/cart-context'
import buildClient from '../api/build-client'

const AppComponent = ({ Component, pageProps }) => {
  return (
    <CartProvider currentUser={pageProps.currentUser}>
      <div className="app-shell d-flex flex-column min-vh-100">
        <Header currentUser={pageProps.currentUser} />
        <div className="container flex-grow-1 py-4">
          <Component {...pageProps} />
        </div>
        <Footer />
      </div>
    </CartProvider>
  )
}

AppComponent.getInitialProps = async (appContext) => {
  const client = buildClient(appContext.ctx)
  const { data } = await client.get('/api/users/currentuser')

  let pageProps = {}
  if (appContext.Component.getInitialProps) {
    pageProps = await appContext.Component.getInitialProps(
      appContext.ctx,
      client,
      data.currentUser
    )
  }

  return {
    pageProps: {
      ...pageProps,
      currentUser: data.currentUser
    }
  }
}

export default AppComponent