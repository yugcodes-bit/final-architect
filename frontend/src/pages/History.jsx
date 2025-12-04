// src/pages/History.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "./history.css";

const History = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data, error } = await supabase
        .from('saved_designs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setHistoryItems(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadDesign = (design) => {
    navigate('/create', { 
      state: { 
        loadedModels: design.room_data,
        loadedName: design.design_name 
      } 
    });
  };

  // --- NEW: DELETE FUNCTION ---
  const handleDelete = async (e, id) => {
    e.stopPropagation(); // Stop the card from opening
    
    // 1. Confirm with user
    if (!window.confirm("Are you sure you want to permanently delete this design?")) return;

    try {
      // 2. Delete from Supabase
      const { error } = await supabase
        .from('saved_designs')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // 3. Update UI immediately (remove item from list)
      setHistoryItems(prevItems => prevItems.filter(item => item.id !== id));
      
    } catch (error) {
      console.error("Error deleting design:", error);
      alert("Failed to delete design.");
    }
  };

  if (loading) return <div className="history-page" style={{paddingTop: '100px', textAlign: 'center'}}>Loading...</div>;

  return (
    <div className="history-page">
      <div className="history-container">
        <header className="history-header">
          <h1>Your Saved Spaces</h1>
          <Link to="/create" className="back-button">← Back to Designer</Link>
        </header>

        {historyItems.length > 0 ? (
          <div className="history-grid">
            {historyItems.map((item) => (
              <div key={item.id} className="history-card" onClick={() => handleLoadDesign(item)}>
  
                  <button 
                    className="delete-btn" 
                    onClick={(e) => handleDelete(e, item.id)}
                    title="Delete Design"
                  >
                    🗑️
                  </button>

                  {/* --- NEW IMAGE LOGIC --- */}
                  {item.thumbnail_url ? (
                    <div 
                      className="card-thumbnail" 
                      style={{ backgroundImage: `url(${item.thumbnail_url})` }} 
                    />
                  ) : (
                    <div className="card-icon">🏠</div>
                  )}
                  {/* ----------------------- */}

                  <div className="card-info">
                    <h3>{item.design_name || "Untitled Room"}</h3>
                    <p>
                      {new Date(item.created_at).toLocaleDateString()} • 
                      {Array.isArray(item.room_data) ? item.room_data.length : 0} items
                    </p>
                  </div>
                  <button className="load-btn">Open Design</button>
                </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>You haven't saved any designs yet.</p>
            <Link to="/create" style={{color: '#00f3ff', marginTop: '20px', display: 'inline-block'}}>Start Creating</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;