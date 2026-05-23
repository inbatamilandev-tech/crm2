import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage,
  totalPages,
  totalRecords,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}) {
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Compact pagination logic
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endRecord = Math.min(currentPage * rowsPerPage, totalRecords);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-[#0F172A] border-t border-slate-200 dark:border-slate-700 transition-colors duration-200">
      {/* Showing X-Y of Z */}
      <div className="text-sm text-slate-500 dark:text-slate-400 mb-4 sm:mb-0">
        Showing <span className="font-semibold text-slate-900 dark:text-white">{startRecord}</span>–
        <span className="font-semibold text-slate-900 dark:text-white">{endRecord}</span> of 
        <span className="font-semibold text-slate-900 dark:text-white"> {totalRecords}</span> Records
      </div>

      <div className="flex items-center space-x-4">
        {/* Rows Per Page Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-slate-500 dark:text-slate-400">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(parseInt(e.target.value))}
            className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-[#F59E0B] transition-colors"
          >
            {[10, 25, 50, 100].map(option => (
              <option key={option} value={option} className="bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white">
                {option}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          {/* First */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="First Page"
          >
            <ChevronsLeft className="w-5 h-5" />
          </button>

          {/* Previous */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((page, index) => (
            <button
              key={index}
              onClick={() => typeof page === 'number' && onPageChange(page)}
              disabled={page === '...'}
              className={`px-3 py-1 text-sm font-semibold rounded-lg transition-colors ${
                page === currentPage
                  ? 'bg-[#F59E0B] text-white shadow-sm'
                  : page === '...'
                    ? 'text-slate-400 cursor-default'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {page}
            </button>
          ))}

          {/* Next */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Next Page"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Last */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages || totalPages === 0}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Last Page"
          >
            <ChevronsRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
