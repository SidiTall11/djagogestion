import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Composant de pagination universel (côté serveur).
 * 
 * Props:
 *  - currentPage: numéro de page actuel
 *  - totalCount: nombre total d'éléments (fourni par l'API)
 *  - pageSize: nombre d'éléments par page (défaut: 20)
 *  - onPageChange: fonction appelée avec le nouveau numéro de page
 */
export default function Pagination({ currentPage, totalCount, pageSize = 20, onPageChange }) {
  if (!totalCount || totalCount <= pageSize) return null;

  const totalPages = Math.ceil(totalCount / pageSize);

  // Génère les numéros de pages à afficher (ex: 1 2 3 ... 8 9 10)
  const getPageNumbers = () => {
    const pages = [];
    const delta = 2; // pages autour de la page actuelle
    const left = currentPage - delta;
    const right = currentPage + delta;
    let last;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        if (last && i - last > 1) pages.push('...');
        pages.push(i);
        last = i;
      }
    }
    return pages;
  };

  const btnStyle = (isActive) => ({
    padding: '6px 12px',
    borderRadius: '8px',
    border: isActive ? 'none' : '1px solid var(--glass-border)',
    background: isActive ? 'var(--primary)' : 'transparent',
    color: isActive ? 'white' : 'var(--text-muted)',
    cursor: isActive ? 'default' : 'pointer',
    fontWeight: isActive ? '700' : '400',
    fontSize: '0.9rem',
    transition: 'all 0.15s',
    minWidth: '36px',
    textAlign: 'center',
  });

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '20px 0 4px', flexWrap: 'wrap' }}>
      {/* Bouton Précédent */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{ ...btnStyle(false), display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
      >
        <ChevronLeft size={16} /> Préc.
      </button>

      {/* Numéros de pages */}
      {getPageNumbers().map((page, idx) =>
        page === '...' ? (
          <span key={`dots-${idx}`} style={{ color: 'var(--text-muted)', padding: '0 4px' }}>…</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={btnStyle(page === currentPage)}
          >
            {page}
          </button>
        )
      )}

      {/* Bouton Suivant */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{ ...btnStyle(false), display: 'flex', alignItems: 'center', gap: '4px', opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
      >
        Suiv. <ChevronRight size={16} />
      </button>

      {/* Info total */}
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginLeft: '8px' }}>
        {totalCount} résultat{totalCount > 1 ? 's' : ''}
      </span>
    </div>
  );
}
