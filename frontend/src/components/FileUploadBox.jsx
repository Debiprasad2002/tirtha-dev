import React, { useState, useRef } from 'react';

function FileUploadBox({ selectedFile, onFileChange }) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  const handleFileSelect = (files) => {
    if (files && files.length > 0) {
      onFileChange(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
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

  const fileName = selectedFile ? selectedFile.name : 'No files selected';

  return (
    <div
      className={`file-upload-box ${dragActive ? 'drag-active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') inputRef.current?.click(); }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFileSelect(e.target.files)}
      />
      <span className="material-icons upload-icon">cloud_upload</span>
      <div className="upload-text">
        <strong>{fileName}</strong>
        <p>Drag & drop to upload, or click to browse</p>
      </div>
    </div>
  );
}

export default FileUploadBox;
