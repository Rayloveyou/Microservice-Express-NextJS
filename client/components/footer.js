const Footer = () => {
  const year = new Date().getFullYear()

  return (
    <footer className="app-footer text-white mt-auto">
      <div className="container py-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <div className="fw-semibold">E-Commerce Platform</div>
          <small className="text-white-50">Mua sắm bảo mật với kiến trúc microservices</small>
        </div>
        <div className="d-flex gap-4 text-white-50 small">
          <span>© {year} DatNX</span>
          <span>Minikube · NATS · Stripe</span>
        </div>
      </div>
    </footer>
  )
}

export default Footer

