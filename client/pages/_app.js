import 'bootstrap/dist/css/bootstrap.css' // Global CSS
import buildClient from '../api/build-client'
import Header from '../components/header'

const AppComponent = ({ Component, pageProps, currentUser }) => {
    return <div>
        <Header currentUser={currentUser} />
        <Component currentUser={currentUser} {...pageProps} />
    </div>
}

// information about the current user is now available in all pages via props
AppComponent.getInitialProps = async (appContext) => {
    const client = buildClient(appContext.ctx)
    let data = {}
    
    try {
        const response = await client.get('/api/users/currentuser')
        data = response.data
    } catch (error) {
        // User is not authenticated (401), or other errors
        // This is fine - just means currentUser will be null
    }

    const pageProps = await appContext.Component.getInitialProps?.(appContext.ctx) || {} // Call the page's getInitialProps if it exists

    return { 
        pageProps,
        ...data
    }
}

export default AppComponent