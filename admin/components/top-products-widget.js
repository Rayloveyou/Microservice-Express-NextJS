'use client'

export default function TopProductsWidget({ products }) {
  const maxSales = products && products.length > 0
    ? Math.max(...products.map(p => p.salesCount))
    : 1

  return (
    <div className="top-products-widget">
      <h3 className="widget-title">🏆 Top Products</h3>
      <div>
        {products && products.length > 0 ? (
          products.map((product, index) => (
            <div key={product.productId || index} className="product-item">
              <div className="product-thumbnail" style={{
                background: 'linear-gradient(135deg, #00f2ea, #ff0050)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                {index + 1}
              </div>
              <div className="product-info">
                <div className="product-name">{product.title}</div>
                <div className="product-sales">{product.salesCount} sales</div>
              </div>
              <div className="product-bar">
                <div
                  className="product-bar-fill"
                  style={{
                    width: `${(product.salesCount / maxSales) * 100}%`
                  }}
                />
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#71717a' }}>
            No product data
          </div>
        )}
      </div>
    </div>
  )
}
