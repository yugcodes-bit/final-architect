// src/components/LibraryPanel.jsx
import React, { useState } from 'react';
import { useStore } from '../store';
import './LibraryPanel.css';

export const LibraryPanel = ({ library, onAddModel, onClose }) => {
  const recommendedLibrary = useStore(state => state.recommendedLibrary);
  const [searchQuery, setSearchQuery] = useState("");

  const handleDragStart = (e, item) => {
    e.dataTransfer.setData("furniture_item", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  const filteredLibrary = library.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="library-panel">
      <div className="library-header">
        <h3>Library</h3>
        <button onClick={onClose} className="close-button">✖</button>
      </div>

      <div className="library-search-container">
        <input 
          type="text" 
          placeholder="Search furniture..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="library-search-input"
        />
      </div>
      
      <div className="library-content">
        
        {/* Recommended Section */}
        {recommendedLibrary && recommendedLibrary.length > 0 && !searchQuery && (
          <div className="library-section">
            <h4 className="section-title">✨ Selected For You</h4>
            
            {/* 👇 UPDATED CLASS NAME: library-vertical-list 👇 */}
            <div className="library-vertical-list">
              {recommendedLibrary.map(item => (
                <div 
                  key={`rec-${item.id}`} 
                  className="library-card recommended-card"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item)}
                >
                  <div className="card-badge">Match</div>
                  <img src={item.thumbnail_url} alt={item.name} className="library-thumbnail" />
                  <div className="library-card-footer">
                    <span className="library-item-name">{item.name}</span>
                    <button onClick={() => onAddModel(item)} className="add-button">+</button>
                  </div>
                </div>
              ))}
            </div>
            <hr className="library-divider" />
          </div>
        )}

        {/* Full Catalog Section */}
        <div className="library-section">
          <h4 className="section-title">
            {searchQuery ? `🔍 Results for "${searchQuery}"` : ""}
          </h4>
          
          {/* 👇 UPDATED CLASS NAME: library-vertical-list 👇 */}
          <div className="library-vertical-list">
            {filteredLibrary.length > 0 ? (
              filteredLibrary.map(item => (
                <div 
                  key={item.id} 
                  className="library-card"
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, item)}
                >
                  <img src={item.thumbnail_url} alt={item.name} className="library-thumbnail" />
                  <div className="library-card-footer">
                    <span className="library-item-name">{item.name}</span>
                    <button onClick={() => onAddModel(item)} className="add-button">+</button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{color: '#888', padding: '10px', textAlign: 'center'}}>
                No items found.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};