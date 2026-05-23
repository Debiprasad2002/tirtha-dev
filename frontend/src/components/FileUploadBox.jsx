import React, { useState, useRef } from 'react';

function FileUploadBox({ selectedFiles = [], onFilesChange, allowOpen = true, onAuthRequired = null }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (files) => {
    if (!allowOpen) {
      if (typeof onAuthRequired === 'function') onAuthRequired();
      return;
    }
    if (files && files.length > 0) {
      onFilesChange(Array.from(files));
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!allowOpen) {
      return;
    }
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const fileCount = selectedFiles.length;
  const fileNames = selectedFiles.map((file) => file.name).slice(0, 3).join(', ');
  const fileLabel = fileCount
    ? `${fileCount} file${fileCount > 1 ? 's' : ''} selected: ${fileNames}${fileCount > 3 ? '...' : ''}`
    : 'No files selected';

  const handleOpenRequest = () => {
    if (!allowOpen) {
      if (typeof onAuthRequired === 'function') onAuthRequired();
      return;
    }
    inputRef.current?.click();
  };

  return (
    <div
      className={`file-upload-box ${dragActive ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleOpenRequest}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleOpenRequest(); }}
    >
        <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <span className="material-icons upload-icon">cloud_upload</span>
      <div className="upload-text">
        <strong>{fileLabel}</strong>
        <p>Drag & drop to upload, or click to browse</p>
      </div>
    </div>
  );
}

export default FileUploadBox;
