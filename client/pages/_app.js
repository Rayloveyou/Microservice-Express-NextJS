import 'bootstrap/dist/css/bootstrap.css' // Global CSS
import '../styles/theme.css' // Theme CSS (blue + purple)
import Header from '../components/header'
import { CartProvider } from '../context/cart-context'

const AppComponent = ({ Component, pageProps }) => {
    return (
        <CartProvider currentUser={pageProps.currentUser}>
            <div>
                <Header currentUser={pageProps.currentUser} />
                <div className='container'>
                    <Component {...pageProps} />
                </div>
            </div>
        </CartProvider>
    )
}

export default AppComponent