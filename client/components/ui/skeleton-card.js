export default function SkeletonCard() {
  return (
    <div className="card card-product">
      <div className="skeleton" style={{ height: '200px', borderRadius: '12px 12px 0 0' }} />
      <div className="card-body">
        <div className="skeleton" style={{ height: '24px', marginBottom: '12px', width: '80%' }} />
        <div className="skeleton" style={{ height: '20px', marginBottom: '16px', width: '40%' }} />
        <div className="skeleton" style={{ height: '40px', borderRadius: '12px' }} />
      </div>
    </div>
  )
}
