import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../hooks/useTheme';
import AccordionItem from './AccordionItem';
import '../styles/Sidebar.css';

// Import footer icons
import byNcSa from '../assets/icons/ui/by-nc-sa.svg';
import byNcNd from '../assets/icons/ui/by-nc-nd.svg';
import lfdsLogoDark from '../assets/icons/ui/lfds-logo-dark.webp';
import lfdsLogoLight from '../assets/icons/ui/lfds-logo-light.webp';
import tirthaLogoDark from '../assets/icons/ui/tirtha-logo-dark.webp';
import tirthaLogoLight from '../assets/icons/ui/tirtha-logo-light.webp';

function Sidebar({ isVisible, onMobileClose }) {
  const { t } = useTranslation(['sidebar', 'common']);
  const { isDark } = useTheme();
  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isResizing, setIsResizing] = useState(false);
  const [closeNonce, setCloseNonce] = useState(0);

  const menuItems = t('sidebar:menuItems', { returnObjects: true });
  const lfdsLogo = isDark ? lfdsLogoDark : lfdsLogoLight;
  const tirthaLogo = isDark ? tirthaLogoDark : tirthaLogoLight;
  
  // Define footer icons with imported images
  const footerIcons = [
    {
      image: byNcSa,
      title: "CC BY-NC-SA License",
      href: "https://creativecommons.org/licenses/by-nc-sa/4.0/"
    },
    {
      image: byNcNd,
      title: "CC BY-NC-ND License",
      href: "https://creativecommons.org/licenses/by-nc-nd/4.0/"
    }
  ];

  // Create accordion ID mapping for internal links
  const getAccordionId = useCallback((title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }, []);

  const visibleMenuItems = useMemo(
    () => menuItems.filter((item) => item.title !== 'About Meditation Center'),
    [menuItems]
  );

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  const handleMouseMove = useCallback((e) => {
    if (!isResizing) return;
    
    // Constrain width between 250px and 500px
    const newWidth = e.clientX;
    if (newWidth >= 250 && newWidth <= 500) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  React.useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [handleMouseMove, isResizing]);

  React.useEffect(() => {
    if (!isVisible) {
      // Closing the sidebar should reset all accordion items to collapsed state.
      setCloseNonce((prev) => prev + 1);
    }
  }, [isVisible]);

  return (
    <aside 
      className={`sidebar ${isVisible ? 'visible' : 'hidden'}`}
      style={{ width: `${sidebarWidth}px` }}
    >
      <>
        <div className="sidebar-header">
          <img src={tirthaLogo} alt="Project Tirtha" className="sidebar-logo" />
          <div className="sidebar-title-container">
            <h1 className="sidebar-title">Project Tirtha</h1>
            <span className="beta-badge">Beta</span>
          </div>
          <button
            type="button"
            className="sidebar-mobile-close"
            onClick={() => onMobileClose?.()}
            aria-label="Close sidebar"
          >
            <span className="material-icons">chevron_left</span>
          </button>
        </div>
        <div className="sidebar-content">
          {visibleMenuItems.map((item) => (
            <div key={`${getAccordionId(item.title)}-${closeNonce}`} data-accordion-id={getAccordionId(item.title)}>
              <AccordionItem
                title={item.title}
                content={item.content}
                isOpen={false}
                isCelebration={item.isCelebration || false}
              />
            </div>
          ))}

          <div className="sidebar-footer">
            <div className="footer-icons">
              {footerIcons.map((iconItem, index) => (
                <a 
                  key={index}
                  href={iconItem.href} 
                  target="_blank"
                  rel="noopener noreferrer"
                  title={iconItem.title} 
                  className="icon-link"
                >
                  <img src={iconItem.image} alt={iconItem.title} className="footer-icon-img" />
                </a>
              ))}
            </div>

            <div className="footer-logo">
              <img src={lfdsLogo} alt="Dassault Systèmes La Fondation" />
            </div>

            <div className="copyright">
              <small>
                © 2023-26 Project Tirtha, <a href="https://www.niser.ac.in/~smishra/" target="_blank" rel="noopener noreferrer" className="footer-link">Subhankar Mishra's Lab</a>, <a href="https://www.niser.ac.in/scos/" target="_blank" rel="noopener noreferrer" className="footer-link">School of Computer Sciences</a>, NISER. All rights reserved.
              </small>
            </div>
          </div>
        </div>
      </>
      <div 
        className="sidebar-resize-handle"
        onMouseDown={handleMouseDown}
        title="Drag to resize sidebar"
      />
    </aside>
  );
}

export default React.memo(Sidebar);
