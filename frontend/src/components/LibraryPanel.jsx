// src/components/LibraryPanel.jsx
import React from 'react';
import { useStore } from '../store'; // Import global store
import './LibraryPanel.css'; // Import the new CSS

export const LibraryPanel = ({ library, onAddModel, onClose }) => {
  // Get recommendations from Voice Session
  const recommendedLibrary = useStore(state => state.recommendedLibrary);

  // --- 🖱️ HANDLE DRAG START ---
  const handleDragStart = (e, item) => {
    // Pack the furniture data into the drag event so the Scene knows what it is
    e.dataTransfer.setData("furniture_item", JSON.stringify(item));
    e.dataTransfer.effectAllowed = "copy";
  };

  return (
    <div className="library-panel">
      <div className="library-header">
        <h3>Furniture Library</h3>
        <button onClick={onClose} className="close-button">✖</button>
      </div>
      
      <div className="library-content">
        
        {/* --- SECTION 1: FOR YOU (Voice Recommendations) --- */}
        {recommendedLibrary && recommendedLibrary.length > 0 && (
          <div className="library-section">
            <h4 className="section-title">✨ Selected For You</h4>
            <div className="library-grid">
              {recommendedLibrary.map(item => (
                <div 
                  key={`rec-${item.id}`} 
                  className="library-card recommended-card"
                  // 👇 DRAG LOGIC ADDED HERE 👇
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

        {/* --- SECTION 2: FULL CATALOG --- */}
        <div className="library-section">
          <h4 className="section-title">📚 Full Catalog</h4>
          <div className="library-grid">
            {library.map(item => (
              <div 
                key={item.id} 
                className="library-card"
                // 👇 DRAG LOGIC ADDED HERE 👇
                draggable={true}
                onDragStart={(e) => handleDragStart(e, item)}
              >
                <img src={item.thumbnail_url} alt={item.name} className="library-thumbnail" />
                <div className="library-card-footer">
                  <span className="library-item-name">{item.name}</span>
                  <button onClick={() => onAddModel(item)} className="add-button">+</button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};