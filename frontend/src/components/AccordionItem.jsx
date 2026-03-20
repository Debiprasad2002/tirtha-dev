import React, { useState, useEffect } from 'react';
import '../styles/AccordionItem.css';

function AccordionItem({ title, content, isOpen = false }) {
  const [open, setOpen] = useState(isOpen);

  const toggleAccordion = () => {
    setOpen(!open);
  };

  // Handle scroll to element and open accordion
  useEffect(() => {
    const handleScroll = () => {
      const url = window.location.hash;
      if (url) {
        const id = url.substring(1).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const titleId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        if (id === titleId) {
          setOpen(true);
        }
      }
    };

    handleScroll();
    window.addEventListener('hashchange', handleScroll);
    return () => window.removeEventListener('hashchange', handleScroll);
  }, [title]);

  // Parse markdown-style links [text](url) and code blocks
  const parseContent = (text) => {
    const elements = [];
    let lastIndex = 0;

    // Split by code blocks (```)
    const codeBlockRegex = /```([\s\S]*?)```/g;
    let codeMatch;
    const codeBlocks = [];

    while ((codeMatch = codeBlockRegex.exec(text)) !== null) {
      codeBlocks.push({
        start: codeMatch.index,
        end: codeMatch.index + codeMatch[0].length,
        content: codeMatch[1].trim()
      });
    }

    // Process text and code blocks
    let textIndex = 0;

    for (const block of codeBlocks) {
      // Process text before code block
      const beforeText = text.substring(textIndex, block.start);
      if (beforeText) {
        elements.push(...parseLinks(beforeText, textIndex));
      }

      // Add code block
      elements.push(
        <pre key={`code-${block.start}`} className="code-block">
          <code>{block.content}</code>
        </pre>
      );

      textIndex = block.end;
    }

    // Process remaining text
    if (textIndex < text.length) {
      const remainingText = text.substring(textIndex);
      if (remainingText.trim()) {
        elements.push(...parseLinks(remainingText, textIndex));
      }
    }

    return elements;
  };

  const parseLinks = (text, offset = 0) => {
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let lastIndex = 0;
    const elements = [];

    text.replace(linkRegex, (match, linkText, url, matchOffset) => {
      // Add text before link
      if (matchOffset > lastIndex) {
        elements.push(
          <span key={`text-${offset + lastIndex}`}>
            {text.substring(lastIndex, matchOffset)}
          </span>
        );
      }

      // Add link
      if (url.startsWith('#')) {
        // Internal link (anchor)
        elements.push(
          <a
            key={`link-${offset + matchOffset}`}
            href={url}
            className="sidebar-link"
            onClick={(e) => {
              e.preventDefault();
              // Scroll to the accordion item with matching id
              const element = document.querySelector(`[data-accordion-id="${url.substring(1)}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
              }
            }}
          >
            {linkText}
          </a>
        );
      } else {
        // External link
        elements.push(
          <a
            key={`link-${offset + matchOffset}`}
            href={url}
            className="sidebar-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            {linkText}
          </a>
        );
      }

      lastIndex = matchOffset + match.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      elements.push(
        <span key={`text-${offset + lastIndex}`}>
          {text.substring(lastIndex)}
        </span>
      );
    }

    return elements;
  };

  return (
    <div className="accordion-item">
      <button
        className="accordion-header"
        onClick={toggleAccordion}
        aria-expanded={open}
      >
        <span className="accordion-title">{title}</span>
        <span className={`accordion-icon ${open ? 'open' : ''}`}>▼</span>
      </button>
      {open && (
        <div className="accordion-content">
          {parseContent(content)}
        </div>
      )}
    </div>
  );
}

export default AccordionItem;
