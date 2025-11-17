import { withCurrentUser } from '../lib/with-current-user'
import axios from 'axios'
import Link from 'next/link'

const LandingPage = ({ currentUser, products = [] }) => {
    return (
        <div className="mt-4">
            {/* Hero */}
            <div className="hero brand-gradient mb-4">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div>
                        <span className="badge rounded-pill badge-brand mb-2">E-Commerce</span>
                        <h1 className="display-6 mb-2">Discover. Shop. Enjoy.</h1>
                        <p className="mb-3">Your favorite products with a smooth, secure checkout.</p>
                        {!currentUser && (
                            <div className="d-flex gap-2">
                                <a className="btn btn-outline-brand btn-sm" href="/auth/signin">Sign in</a>
                                <a className="btn btn-brand btn-sm" href="/auth/signup">Create account</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Products */}
            <div className="mb-3">
                <h4 className="section-title">Available Products</h4>
            </div>
            {products.length === 0 ? (
                <div className="alert alert-light border" role="alert">
                    No products yet.
                </div>
            ) : (
                <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                    {products.map((p) => {
                        const isOutOfStock = p.quantity === 0
                        const productImage = p.imageUrl || '/images/no-image.svg'
                        return (
                            <div className="col" key={p.id}>
                                <Link href={`/products/${p.id}`} className="text-decoration-none text-reset">
                                    <div className="card card-product h-100">
                                        <img 
                                            src={productImage} 
                                            className="card-img-top" 
                                            alt={p.title}
                                            style={{ height: '200px', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.target.src = '/images/no-image.svg'
                                            }}
                                        />
                                        <div className="card-body">
                                            <div className="d-flex align-items-start justify-content-between mb-2">
                                                <h5 className="card-title mb-0">{p.title}</h5>
                                                {isOutOfStock ? (
                                                    <span className="badge text-bg-danger">Out of Stock</span>
                                                ) : (
                                                    <span className="badge text-bg-success">{p.quantity} left</span>
                                                )}
                                            </div>
                                            <div className="d-flex align-items-center justify-content-between">
                                                <span className="price">${p.price}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export const getServerSideProps = withCurrentUser(async (context) => {
    // Fetch products directly from product service inside the cluster
    // Keep cookie header so auth-aware endpoints can work consistently
    let products = []
    try {
        const { data } = await axios.get('http://product-svc:3000/api/products', {
            headers: { Cookie: context.req.headers.cookie || '' }
        })
        products = Array.isArray(data) ? data : []
    } catch (err) {
        // Ignore and show empty list
    }
    return { products }
})

export default LandingPage