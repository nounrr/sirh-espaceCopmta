import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Log for diagnostics (Safari/macOS often throws NotFoundError when DOM is mutated externally)
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] Render error caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '1rem',
          margin: '1rem',
          borderRadius: 8,
          background: '#fff3e0',
          color: '#6d4c41',
          border: '1px solid #ffe0b2',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif'
        }}>
          <h2 style={{ marginTop: 0 }}>Une erreur d'affichage est survenue</h2>
          <p>
            Si vous voyez une page blanche (souvent sur Safari/macOS), une librairie a peut-être manipulé le DOM pendant le rendu.
            Essayez de recharger. Si le problème persiste, envoyez une capture de la console.
          </p>
          <pre style={{
            background: '#fff8e1',
            padding: '0.75rem',
            overflow: 'auto',
            borderRadius: 6,
            whiteSpace: 'pre-wrap'
          }}>{String(this.state.error?.message || this.state.error)}</pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderRadius: 6,
              border: 'none',
              background: '#fb8c00',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

import PropTypes from 'prop-types';

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};

export default ErrorBoundary;
