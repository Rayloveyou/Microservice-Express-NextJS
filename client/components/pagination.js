'use client'

import { useRouter, useSearchParams } from 'next/navigation'

export default function Pagination({ currentPage, totalPages, hasNext, hasPrev }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return

    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())

    router.push(`/?${params.toString()}`)
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxPagesToShow = 5

    if (totalPages <= maxPagesToShow) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Show current page and surrounding pages
      let startPage = Math.max(1, currentPage - 2)
      let endPage = Math.min(totalPages, currentPage + 2)

      // Adjust if at beginning or end
      if (currentPage <= 3) {
        endPage = maxPagesToShow
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxPagesToShow + 1
      }

      // Add first page and ellipsis
      if (startPage > 1) {
        pages.push(1)
        if (startPage > 2) {
          pages.push('...')
        }
      }

      // Add page numbers
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }

      // Add ellipsis and last page
      if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
          pages.push('...')
        }
        pages.push(totalPages)
      }
    }

    return pages
  }

  if (totalPages <= 1) return null

  return (
    <div className="pagination">
      <button
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={!hasPrev}
        className="pagination-btn pagination-prev"
        aria-label="Previous page"
      >
        <span>←</span>
        <span className="pagination-btn-text">Previous</span>
      </button>

      <div className="pagination-numbers">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="pagination-ellipsis">
                ...
              </span>
            )
          }

          return (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`pagination-number ${
                currentPage === page ? 'active' : ''
              }`}
            >
              {page}
            </button>
          )
        })}
      </div>

      <button
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={!hasNext}
        className="pagination-btn pagination-next"
        aria-label="Next page"
      >
        <span className="pagination-btn-text">Next</span>
        <span>→</span>
      </button>
    </div>
  )
}