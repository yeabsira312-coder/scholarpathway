function getPagination(page = 1, pageSize = 10) {
  const parsedPage = Math.max(1, parseInt(page) || 1);
  const parsedPageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 10));
  
  const offset = (parsedPage - 1) * parsedPageSize;
  const from = offset;
  const to = from + parsedPageSize - 1;

  return {
    page: parsedPage,
    pageSize: parsedPageSize,
    offset,
    from,
    to
  };
}

function getPaginationData(currentPage, totalItems, pageSize) {
  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  
  return {
    currentPage,
    totalPages,
    totalItems,
    hasNext,
    hasPrev,
    nextPage: hasNext ? currentPage + 1 : null,
    prevPage: hasPrev ? currentPage - 1 : null
  };
}

module.exports = {
  getPagination,
  getPaginationData
};