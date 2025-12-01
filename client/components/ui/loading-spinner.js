export default function LoadingSpinner({ size = 'md' }) {
  const sizes = {
    sm: '24px',
    md: '48px',
    lg: '64px'
  }

  return (
    <div
      className="spinner-gradient"
      style={{
        width: sizes[size],
        height: sizes[size]
      }}
    />
  )
}
