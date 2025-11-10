/* Amélioration automatique des composants existants pour la responsivité mobile */

// Fonction utilitaire pour détecter mobile
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return isMobile;
};

// Classes CSS utilitaires pour mobile
export const mobileClasses = {
  // Conteneurs
  container: (isMobile) => isMobile ? 'px-2' : 'px-4',
  card: (isMobile) => isMobile ? 'mb-3' : 'mb-4',
  cardBody: (isMobile) => isMobile ? 'p-2' : 'p-3',
  cardHeader: (isMobile) => isMobile ? 'p-2' : 'p-3',
  
  // Grilles
  row: (isMobile) => isMobile ? 'g-2' : 'g-3',
  col: (isMobile) => isMobile ? 'col-12' : 'col-md-auto',
  
  // Boutons
  btn: (isMobile) => isMobile ? 'w-100 mb-2' : '',
  btnGroup: (isMobile) => isMobile ? 'btn-group-vertical w-100' : 'btn-group',
  
  // Texte
  title: (isMobile) => isMobile ? 'fs-5' : 'fs-4',
  subtitle: (isMobile) => isMobile ? 'fs-6' : 'fs-5',
  
  // Espacement
  mb: (isMobile) => isMobile ? 'mb-2' : 'mb-3',
  mt: (isMobile) => isMobile ? 'mt-2' : 'mt-3',
  p: (isMobile) => isMobile ? 'p-2' : 'p-3',
  
  // Tables
  table: (isMobile) => isMobile ? 'table-sm' : '',
  tableContainer: (isMobile) => isMobile ? 'table-responsive' : 'table-responsive',
};

// Fonction pour adapter automatiquement les propriétés de styles
export const adaptiveStyle = (mobileStyle, desktopStyle, isMobile) => {
  return isMobile ? { ...desktopStyle, ...mobileStyle } : desktopStyle;
};

// Hook pour les breakpoints responsive
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState('lg');
  
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 576) setBreakpoint('xs');
      else if (width < 768) setBreakpoint('sm');
      else if (width < 992) setBreakpoint('md');
      else if (width < 1200) setBreakpoint('lg');
      else setBreakpoint('xl');
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return breakpoint;
};

// Composant wrapper pour rendre n'importe quel composant responsive
export const MobileWrapper = ({ children, className = '', ...props }) => {
  const isMobile = useIsMobile();
  
  return (
    <div 
      className={`mobile-wrapper ${isMobile ? 'mobile-mode' : 'desktop-mode'} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

// Fonction pour optimiser les props de composants existants
export const optimizeProps = (props, isMobile) => {
  const optimized = { ...props };
  
  // Adapter les classes CSS
  if (optimized.className) {
    let className = optimized.className;
    
    // Remplacer les classes courantes par des versions responsive
    className = className.replace(/\bcol-md-(\d+)\b/g, isMobile ? 'col-12' : 'col-md-$1');
    className = className.replace(/\bmb-(\d+)\b/g, isMobile ? 'mb-2' : 'mb-$1');
    className = className.replace(/\bp-(\d+)\b/g, isMobile ? 'p-2' : 'p-$1');
    
    // Ajouter des classes mobile si nécessaire
    if (isMobile) {
      if (className.includes('btn') && !className.includes('w-100')) {
        className += ' w-100 mb-2';
      }
      if (className.includes('table') && !className.includes('table-responsive')) {
        className += ' table-sm';
      }
    }
    
    optimized.className = className;
  }
  
  // Adapter les styles inline
  if (optimized.style) {
    optimized.style = adaptiveStyle(
      { fontSize: '0.85rem', padding: '0.5rem' }, // Mobile
      optimized.style, // Desktop
      isMobile
    );
  }
  
  return optimized;
};

export default {
  useIsMobile,
  mobileClasses,
  adaptiveStyle,
  useBreakpoint,
  MobileWrapper,
  optimizeProps
};
