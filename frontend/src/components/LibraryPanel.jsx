import React from 'react';

export const LibraryPanel = ({ library, onAddModel, onClose }) => {
  return (
    <div className="library-panel">
      <div className="library-header">
        <h3>Library</h3>
        <button onClick={onClose} className="close-button">✖</button>
      </div>
      <div className="library-content">
        {library.map(item => (
          <div key={item.id} className="library-card">
            <img src={item.thumbnail_url} alt={item.name} className="library-thumbnail" />
            <div className="library-card-footer">
              <span className="library-item-name">{item.name}</span>
              <button onClick={() => onAddModel(item)} className="add-button">+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};