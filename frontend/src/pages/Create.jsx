import React, { useState, useEffect, useRef } from "react";
import "./create.css";
// Import useNavigate and useLocation for History features
import { Link, useNavigate, useLocation } from "react-router-dom";
import background_video from "../assets/landing_page_vid.mp4";
import { Scene } from '../Scene.jsx';
import { supabase } from "../supabaseClient";
import { LibraryPanel } from "../components/LibraryPanel";
// Import Store for Emotional Loadout
import { useStore } from '../store'; 

const sentences = [
  "Imagine your dream space...",
  "What room shall we design today?",
];

const Typewriter = () => {
  const [text, setText] = useState("");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  
  useEffect(() => {
    const currentSentence = sentences[sentenceIndex];
    const handleTyping = () => {
      if (isDeleting) {
        if (charIndex > 0) {
          setText(currentSentence.substring(0, charIndex - 1));
          setCharIndex((prev) => prev - 1);
        } else {
          setIsDeleting(false);
          setSentenceIndex((prev) => (prev + 1) % sentences.length);
        }
      } else {
        if (charIndex < currentSentence.length) {
          setText(currentSentence.substring(0, charIndex + 1));
          setCharIndex((prev) => prev + 1);
        } else {
          setTimeout(() => setIsDeleting(true), 2500);
        }
      }
    };
    const timeoutId = setTimeout(handleTyping, isDeleting ? 40 : 80);
    return () => clearTimeout(timeoutId);
  }, [charIndex, isDeleting, sentenceIndex]);
  
  return <p className="typewriter-text">{text}</p>;
};

const Create = () => {
  const navigate = useNavigate();
  const location = useLocation(); // For loading history
  const sceneRef = useRef(); // For screenshots

  // --- GLOBAL STATE (From Your Emotion Logic) ---
  const emotionalLoadout = useStore((state) => state.emotionalLoadout);

  // --- LOCAL STATE ---
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [models, setModels] = useState([]);
  const [transformMode, setTransformMode] = useState("translate");
  const [furnitureLibrary, setFurnitureLibrary] = useState([]);
  const [selectedObject, setSelectedObject] = useState(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [lightIntensity, setLightIntensity] = useState(10);
  const [auraAnalysisEnabled, setAuraAnalysisEnabled] = useState(false);
  const [currentDesign, setCurrentDesign] = useState(null);

  // --- NEW: User & Save State ---
  const [designName, setDesignName] = useState("My New Room");
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);

  // --- 1. CHECK AUTH (For Profile & Saving) ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profile && profile.full_name) {
          setUserName(profile.full_name);
        } else {
          setUserName(user.email.split('@')[0]);
        }
      }
    };
    checkUser();
  }, []);

  // --- 2. LOAD DESIGN FROM HISTORY (If navigated from History Page) ---
  useEffect(() => {
    if (location.state && location.state.loadedModels) {
      console.log("📥 Loading design from History:", location.state.loadedName);
      
      const loadedData = location.state.loadedModels;
      // Handle legacy array format vs new object format
      if (Array.isArray(loadedData)) {
        setModels(loadedData);
      } else if (loadedData.models) {
        setModels(loadedData.models);
        if (loadedData.messages) setMessages(loadedData.messages);
      }

      setDesignName(location.state.loadedName || "Untitled Load");
      
      // Clear state so refresh doesn't reload it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // --- 3. AUTO-LOAD EMOTIONAL ITEMS (YOUR ORIGINAL LOGIC) ---
  useEffect(() => {
    // If the store has items (from the Discover page), load them immediately
    if (emotionalLoadout && emotionalLoadout.length > 0) {
      console.log("🎁 Loading Emotional Loadout into Scene:", emotionalLoadout);
      
      const newSceneModels = emotionalLoadout.map((item, index) => ({
        instanceId: Date.now() + index, // unique ID
        position: [
          (Math.random() - 0.5) * 3, // Random X scatter (-1.5 to 1.5)
          0, 
          (Math.random() - 0.5) * 3  // Random Z scatter (-1.5 to 1.5)
        ], 
        rotation: [0, 0, 0],
        scale: item.scale || 1,
        models: { 
          file_url: item.file_url, 
          category: item.category 
        },
        modelType: item.category // specific for lighting analysis
      }));

      // Append to scene
      setModels(prev => [...prev, ...newSceneModels]);
      
      // Notify user
      setMessages(prev => [
        ...prev, 
        { text: `I've added ${emotionalLoadout.length} items that matched your happy vibe!`, sender: "system" }
      ]);
    }
  }, [emotionalLoadout]); 

  // --- 4. FETCH LIBRARY ---
  useEffect(() => {
    const fetchLibrary = async () => {
      const { data, error } = await supabase
        .from("models")
        .select("*")
        .neq("category", "room_base");
      if (error) console.error("Error fetching furniture library:", error);
      else setFurnitureLibrary(data);
    };
    fetchLibrary();
  }, []);

  // --- ACTIONS ---

  const handleNewChat = () => {
    setModels([]); 
    setMessages([]);
    setInputValue("");
    setDesignName("My New Room");
    setSelectedObject(null);
    setCurrentDesign(null);
  };

  const handleSaveDesign = async () => {
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to save a design!");
      // navigate("/login"); // Optional: Redirect to login
      setIsSaving(false);
      return;
    }

    let screenshotUrl = "";
    // Note: This requires your Scene component to expose a 'capture' method via forwardRef
    if (sceneRef.current && sceneRef.current.capture) {
      try {
        screenshotUrl = sceneRef.current.capture();
        console.log("📸 Screenshot captured!");
      } catch (err) {
        console.error("Screenshot failed:", err);
      }
    }

    const roomDataPackage = {
      models: models,
      messages: messages
    };

    const designData = {
      user_id: user.id,
      design_name: designName,
      room_data: roomDataPackage,
      thumbnail_url: screenshotUrl
    };

    const { error } = await supabase
      .from('saved_designs')
      .insert([designData]);

    if (error) {
      console.error("Error saving design:", error);
      alert("Failed to save design.");
    } else {
      alert("Design saved successfully!");
    }
    
    setIsSaving(false);
  };

  const updateModelTransform = (instanceId, newPosition, newRotation, newScale) => {
    setModels((currentModels) =>
      currentModels.map((model) => {
        if (model.instanceId === instanceId) {
          return {
            ...model,
            position: newPosition,
            rotation: newRotation,
            scale: newScale,
          };
        }
        return model;
      })
    );
  };

  const getPositionFromPlacement = (placement) => {
    const roomBoundary = 3.5;
    switch (placement) {
      case "center": return [0, 0, 0];
      case "back-wall": return [0, 0, -roomBoundary];
      case "front-wall": return [0, 0, roomBoundary];
      case "left-wall": return [-roomBoundary, 0, 0];
      case "right-wall": return [roomBoundary, 0, 0];
      case "back-left-corner": return [-roomBoundary, 0, -roomBoundary];
      case "back-right-corner": return [roomBoundary, 0, -roomBoundary];
      default: return [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
    }
  };

  // --- YOUR AI LOGIC (Preserved) ---
  const processAiResponse = async (aiResponse) => {
    const newSceneModels = [];

    // 1. Check if the Room Base is missing
    const roomBaseExists = models.some(m => m.models.category === 'room_base');

    if (!roomBaseExists) {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from("models")
          .select("file_url, category")
          .eq("category", "room_base")
          .limit(1)
          .single();

        if (roomError) throw roomError;

        newSceneModels.push({
          instanceId: Date.now() + Math.random(),
          position: [0, 0, 0],
          rotation: [0, 0, 0],
          scale: 1,
          models: { file_url: roomData.file_url, category: roomData.category },
        });
        console.log("🏠 Room base added to scene.");
      } catch (error) {
        console.error("Could not load the base room model:", error);
      }
    }

    // 2. Get the furniture items
    const furnitureItems = (aiResponse.items || []);

    for (const item of furnitureItems) {
      if (item.name === "room_base") continue;

      let modelData = null;
      let queryError = null;

      // Try finding by tags
      if (item.qualifiers && item.qualifiers.length > 0) {
        const { data, error } = await supabase
          .from("models")
          .select("file_url, category")
          .eq("category", item.name)
          .overlaps("tags", item.qualifiers)
          .limit(1)
          .single();
        if (!error && data) modelData = data;
      }

      // Fallback: Find by category
      if (!modelData) {
        const { data, error } = await supabase
          .from("models")
          .select("file_url, category")
          .eq("category", item.name)
          .limit(1)
          .single();
        modelData = data;
        queryError = error;
      }

      if (modelData) {
        const position = getPositionFromPlacement(item.placement);
        newSceneModels.push({
          instanceId: Date.now() + Math.random(),
          position: position,
          rotation: [0, 0, 0],
          scale: 1,
          models: {
            file_url: modelData.file_url,
            category: modelData.category,
          },
        });
      } else if (queryError) {
        console.warn(`Could not find a model for category: ${item.name}`, queryError.message);
      }
    }

    setModels((prevModels) => {
      const updatedModels = [...prevModels, ...newSceneModels];
      
      const newDesign = {
        id: 'design_' + Date.now(),
        type: 'ai_generated_update',
        elements: updatedModels,
        prompt: inputValue,
        furnitureCount: updatedModels.length
      };
      
      setCurrentDesign(newDesign);
      return updatedModels;
    });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const userPrompt = inputValue.trim().toLowerCase();
    if (!userPrompt) return;
    
    setInputValue("");
    // Add to history
    setMessages(prev => [...prev, { text: userPrompt, sender: "user" }]);
    
    if (userPrompt === "living room") {
      const { data, error } = await supabase
        .from("room_layouts")
        .select(`position, rotation, scale, models ( file_url, id, category )`)
        .eq("room_name", userPrompt);
      
      if (error) {
        console.error("Error fetching room layout:", error);
      } else if (data) {
        const modelsWithIds = data.map((model) => ({
          ...model,
          instanceId: Date.now() + Math.random(),
        }));
        
        const layoutDesign = {
          id: 'layout_' + Date.now(),
          type: 'premade_layout',
          elements: modelsWithIds,
          prompt: userPrompt,
          furnitureCount: modelsWithIds.length
        };
        
        setCurrentDesign(layoutDesign);
        setModels(modelsWithIds); 
      }
    } else {
      try {
        const response = await fetch("http://localhost:3002/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            prompt: userPrompt,
            sceneState: models 
          }),
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        const aiResponse = await response.json();
        await processAiResponse(aiResponse); 
      } catch (error) {
        console.error("Failed to get AI response:", error);
      }
    }
  };

  const addModelToScene = (item) => {
    const newModel = {
      instanceId: Date.now(),
      position: [0, 0.5, 0],
      rotation: [0, 0, 0],
      scale: 1,
      models: { file_url: item.file_url, category: item.category },
    };
    
    setModels((prevModels) => {
      const updatedModels = [...prevModels, newModel];

      if (currentDesign) {
        const updatedDesign = {
          ...currentDesign,
          elements: updatedModels,
          type: 'manual_addition',
          lastAdded: item.category
        };
        setCurrentDesign(updatedDesign);
      } else {
        const newDesign = {
          id: 'design_' + Date.now(),
          type: 'manual_addition',
          elements: updatedModels,
          prompt: 'manual',
          furnitureCount: updatedModels.length
        };
        setCurrentDesign(newDesign);
      }

      return updatedModels;
    });
    
    if (models.length === 0 && messages.length === 0) {
      setMessages([{ text: "Starting design...", sender: "system" }]);
    }
  };

  const deleteSelectedModel = () => {
    if (!selectedObject) return;
    
    setModels((prevModels) => {
      const remainingModels = prevModels.filter(
        (model) => model.instanceId !== selectedObject.userData.instanceId
      );

      if (currentDesign) {
        const updatedDesign = { ...currentDesign, elements: remainingModels };
        setCurrentDesign(updatedDesign);
      }

      return remainingModels;
    });
    
    setSelectedObject(null);
  };

  const handleDiscoverClick = () => {
    navigate('/discover-style');
  };

  const toggleSidebar = () => setSidebarCollapsed(!isSidebarCollapsed);
  const hasMessages = messages.length > 0 || models.length > 0;

  return (
    <div className="create-page">
      <video
        autoPlay
        loop
        muted
        className="create-page-bg-video"
        src={background_video}
      />
      <div className="create-layout">
        {/* --- UPDATED SIDEBAR --- */}
        <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <button onClick={toggleSidebar} className="sidebar-toggle">
            {isSidebarCollapsed ? "☰" : "✖"}
          </button>

          {/* PROFILE SECTION */}
          {!isSidebarCollapsed && user && (
            <div className="sidebar-profile-container" style={{padding: '10px', marginBottom: '10px', borderBottom: '1px solid #333'}}>
              <Link to="/profile" className="sidebar-profile-btn" style={{textDecoration: 'none', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px'}}>
                <span className="profile-icon">👤</span> 
                <span className="profile-text">{userName || "User"}</span>
              </Link>
            </div>
          )}

          <ul className="sidebar-menu">
            <li className="sidebar-menu-item" onClick={handleNewChat}>
              <span className="label">➕ New Chat</span>
            </li>
            
            <li className="sidebar-menu-item" onClick={handleDiscoverClick}>
              <span className="label">✨ Discover My Style</span>
            </li>

            <li className="sidebar-menu-item">
                <Link className="item" to="/history">
                    <span className="label">History</span>
                </Link>
            </li>
            <li className="sidebar-menu-item">
                <Link className="item" to="/settings">
                    <span className="label">Settings</span>
                </Link>
            </li>
            <li className="sidebar-menu-item">
              <Link className="item" to="/">
                Home
              </Link>
            </li>
            <div className="furniture-library-toggle">
              <h3 onClick={() => setLibraryOpen(true)} className="library-title">
                📚 Open Library
              </h3>
            </div>
          </ul>

          {/* --- SCROLLABLE PROMPT HISTORY --- */}
          {!isSidebarCollapsed && (
            <div className="sidebar-scrollable-section" style={{marginTop: '20px', overflowY: 'auto', maxHeight: '40%', padding: '0 15px'}}>
              <span className="history-title" style={{color: '#888', fontSize: '0.8rem', textTransform: 'uppercase'}}>Session History</span>
              {messages
                .filter(msg => msg.sender === 'user')
                .map((msg, index) => (
                  <div key={index} className="history-prompt-item" style={{padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.1)', fontSize: '0.9rem', color: '#ccc'}}>
                    "{msg.text}"
                  </div>
              ))}
              {messages.length === 0 && (
                <div style={{color: '#444', fontSize: '0.8rem', fontStyle: 'italic', marginTop: '10px'}}>
                  No prompts yet...
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="layout-container">
          {isLibraryOpen && (
            <LibraryPanel
              library={furnitureLibrary}
              onAddModel={addModelToScene}
              onClose={() => setLibraryOpen(false)}
            />
          )}
          
          <div className="scene-wrapper">
            {hasMessages ? (
              <div className="scene-container">
                <div className="transform-controls-ui">
                  <button onClick={() => setTransformMode("translate")} className={transformMode === "translate" ? "active" : ""}>Move</button>
                  <button onClick={() => setTransformMode("rotate")} className={transformMode === "rotate" ? "active" : ""}>Rotate</button>
                  <button onClick={() => setTransformMode("scale")} className={transformMode === "scale" ? "active" : ""}>Scale</button>
                  
                  <button
                    onClick={() => setAuraAnalysisEnabled(!auraAnalysisEnabled)}
                    className={`aura-button ${auraAnalysisEnabled ? "active" : ""}`}
                  >
                    {auraAnalysisEnabled ? "Exit Aura Analysis" : "Generate Aura"}
                  </button>

                  {/* SAVE CONTROLS */}
                  <div className="save-controls" style={{display: 'flex', gap: '5px', alignItems: 'center', marginLeft: '10px'}}>
                    <input 
                      type="text" 
                      value={designName} 
                      onChange={(e) => setDesignName(e.target.value)}
                      className="design-name-input"
                      placeholder="Design Name"
                      style={{background: 'rgba(0,0,0,0.5)', border: '1px solid #555', color: '#fff', padding: '5px', borderRadius: '4px'}}
                    />
                    <button onClick={handleSaveDesign} disabled={isSaving} className="save-button" style={{background: '#4CAF50', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', color: 'white'}}>
                      {isSaving ? "Saving..." : "💾 Save"}
                    </button>
                  </div>

                  {selectedObject && (
                    <button onClick={deleteSelectedModel} className="delete-button">Delete</button>
                  )}
                </div>

                {selectedObject?.userData?.isLamp && (
                  <div className="light-controls-ui">
                    <label>Light Intensity</label>
                    <input
                      type="range"
                      min="0" max="50" step="1"
                      value={lightIntensity}
                      onChange={(e) => setLightIntensity(Number(e.target.value))}
                    />
                  </div>
                )}

                {/* AURA LEGEND */}
                {auraAnalysisEnabled && (
                  <div className="aura-legend">
                    <h4>Lighting Analysis</h4>
                    <div className="legend-item"><div className="color-box" style={{backgroundColor: '#ff0000'}}></div><span>Very Bright (&gt;750 lux)</span></div>
                    <div className="legend-item"><div className="color-box" style={{backgroundColor: '#000066'}}></div><span>Dark (&lt;50 lux)</span></div>
                  </div>
                )}

                <div className="scene-viewport">
                  {/* Pass Ref to Scene for Screenshots */}
                  <Scene
                    ref={sceneRef}
                    models={models}
                    transformMode={transformMode}
                    selectedObject={selectedObject}
                    setSelectedObject={setSelectedObject}
                    onTransformEnd={updateModelTransform}
                    lightIntensity={lightIntensity}
                    auraAnalysisEnabled={auraAnalysisEnabled}
                  />
                </div>
              </div>
            ) : (
              <div className="typewriter-container">
                <Typewriter />
              </div>
            )}
            
            <div className="chat-input-area">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Send a message..."
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
                <button type="submit" className="submit">
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Create;