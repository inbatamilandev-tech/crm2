import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export const usePagination = (fetchDataCallback, defaultLimit = 25) => {
  const abortControllerRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Parse URL params
  const queryParams = new URLSearchParams(location.search);
  const initialPage = parseInt(queryParams.get('page')) || 1;
  const initialLimit = parseInt(queryParams.get('limit')) || defaultLimit;

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [rowsPerPage, setRowsPerPage] = useState(initialLimit);
  console.log(`[usePagination] initialLimit: ${initialLimit}, query limit: ${queryParams.get('limit')}`);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state with URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlPage = parseInt(params.get('page'));
    const urlLimit = parseInt(params.get('limit'));

    if (urlPage !== currentPage || urlLimit !== rowsPerPage) {
      params.set('page', currentPage.toString());
      params.set('limit', rowsPerPage.toString());
      console.log(`[usePagination] Syncing URL: page=${currentPage}, limit=${rowsPerPage}`);
      navigate({ search: params.toString() }, { replace: true });
    }
  }, [currentPage, rowsPerPage, navigate, location.search]);

  const loadData = useCallback(async (params = {}) => {
    setIsLoading(true);
    setError(null);

    // Abort previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    // Create a new AbortController for the current request
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetchDataCallback({
        page: currentPage,
        limit: rowsPerPage,
        ...params
      }, { signal: abortControllerRef.current.signal });

      // Handle both formats (standard DRF or user specified)
      const data = Array.isArray(response) ? response : (response.data || response.results || []);
      const total = response.count || response.total || (Array.isArray(response) ? response.length : 0);
      const pages = response.totalPages || Math.ceil(total / rowsPerPage) || 1;

      // Client-side pagination fallback for plain arrays
      const paginatedData = Array.isArray(response) 
        ? response.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)
        : data;

      setTotalRecords(total);
      setTotalPages(pages);

      // Smart page handling: if current page is empty and we are not on page 1
      if (paginatedData.length === 0 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }

      return paginatedData;
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED') {
        // Ignore aborted requests to prevent flickering and race conditions
        return [];
      }
      setError('Failed to fetch data');
      console.error(err);
      return [];
    } finally {
      // Only set loading to false if this is the current request
      if (!abortControllerRef.current?.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [currentPage, rowsPerPage, fetchDataCallback]);

  const setPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const changeRowsPerPage = (limit) => {
    setRowsPerPage(limit);
    setCurrentPage(1); // Reset to page 1 on limit change
  };

  return {
    currentPage,
    rowsPerPage,
    totalRecords,
    totalPages,
    isLoading,
    error,
    setPage,
    changeRowsPerPage,
    loadData,
    setCurrentPage
  };
};
