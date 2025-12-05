// src/pages/Create.jsx
import React, { useState, useEffect, useRef } from "react";
import "./create.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  AddComment,
  Apps,
  History,
  Settings,
  LibraryBooks
} from "@mui/icons-material";


// Components
import background_video from "../assets/landing_page_vid.mp4";
import { Scene } from '../Scene.jsx';
import { supabase } from "../supabaseClient";
import { LibraryPanel } from "../components/LibraryPanel";
import { emotionLogger } from '../utils/EmotionLogger';

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
  const location = useLocation();
  const sceneRef = useRef();

  const [isOutlinerOpen, setIsOutlinerOpen] = useState(false); // <--- ADD THIS

  // --- STATE ---
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [models, setModels] = useState([]);
  const [transformMode, setTransformMode] = useState("translate");
  const [furnitureLibrary, setFurnitureLibrary] = useState([]);

  // Existing state...
  const [selectedObject, setSelectedObject] = useState(null);
  const [isLibraryOpen, setLibraryOpen] = useState(false);
  const [lightIntensity, setLightIntensity] = useState(10);
  const [auraAnalysisEnabled, setAuraAnalysisEnabled] = useState(false);
  
  // --- NEW STATE ---
  const [selectionTarget, setSelectionTarget] = useState(null);
  
  // User/Save State
  const [designName, setDesignName] = useState("My New Room");
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState(null);
  const [currentDesign, setCurrentDesign] = useState(null);

  // --- 1. USER & PROFILE CHECK ---
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

  // --- 2. LOAD DESIGN FROM HISTORY ---
  useEffect(() => {
    if (location.state && location.state.loadedModels) {
      console.log("📥 Loading design from History:", location.state.loadedName);
      
      const loadedData = location.state.loadedModels;
      // Handle both old format (array) and new format (object with messages)
      if (Array.isArray(loadedData)) {
        setModels(loadedData);
      } else if (loadedData.models) {
        setModels(loadedData.models);
        if (loadedData.messages) setMessages(loadedData.messages);
      }

      setDesignName(location.state.loadedName);
      
      // Clear state so refresh doesn't reload it
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // --- 3. FETCH LIBRARY ---
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

  // --- 🧠 SMART POSITIONING LOGIC (Merged Feature) ---
  const calculateSmartPosition = (placement, relativeTo, currentSceneModels) => {
    const roomBoundary = 3.5;

    // 1. ABSOLUTE POSITIONING
    if (!relativeTo || relativeTo === "room") {
      switch (placement) {
        case "center": return [0, 0, 0];
        case "back-wall": return [0, 0, -roomBoundary];
        case "front-wall": return [0, 0, roomBoundary];
        case "left-wall": return [-roomBoundary, 0, 0];
        case "right-wall": return [roomBoundary, 0, 0];
        case "back-left-corner": return [-roomBoundary, 0, -roomBoundary];
        case "back-right-corner": return [roomBoundary, 0, -roomBoundary];
        case "front-left-corner": return [-roomBoundary, 0, roomBoundary];
        case "front-right-corner": return [roomBoundary, 0, roomBoundary];
        default: return [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
      }
    }

    // 2. RELATIVE POSITIONING
    const anchorObj = currentSceneModels.find(m => 
      m.models.category.toLowerCase().includes(relativeTo.toLowerCase())
    );

    if (!anchorObj) {
      console.warn(`Anchor object "${relativeTo}" not found. Placing in center.`);
      return [0, 0, 0];
    }

    const [ax, ay, az] = anchorObj.position;
    const offset = 2.0;

    switch (placement) {
      case "right": return [ax + offset, ay, az];
      case "left": return [ax - offset, ay, az];
      case "front": return [ax, ay, az + offset]; 
      case "back": return [ax, ay, az - offset];
      case "on_top": return [ax, ay + 1, az];
      default: return [ax + offset, ay, az];
    }
  };

  // --- ACTIONS ---

  const handleNewChat = () => {
    setModels([]); 
    setMessages([]);
    setInputValue("");
    setDesignName("My New Room");
    setSelectedObject(null);
    window.history.replaceState({}, document.title);
  };

  const handleSaveDesign = async () => {
    setIsSaving(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("You must be logged in to save a design!");
      navigate("/login");
      return;
    }

    let screenshotUrl = "";
    if (sceneRef.current) {
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
      room_data: roomDataPackage, // Save Models + Chat
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

  const processAiResponse = async (aiResponse) => {
    const newSceneModels = [];
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
      } catch (error) {
        console.error("Could not load the base room model:", error);
      }
    }

    const furnitureItems = (aiResponse.items || []);

    for (const item of furnitureItems) {
      if (item.name === "room_base") continue;

      let modelData = null;
      let queryError = null;

      // Find by Tags
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

      // Find by Category
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
        // USE SMART POSITION CALCULATOR HERE
        const position = calculateSmartPosition(item.placement, item.relative_to, models);
        
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
    // Append message (Sequential History)
    setMessages((prevMessages) => [
      ...prevMessages, 
      { text: userPrompt, sender: "user" }
    ]);
    
    if (userPrompt === "living room") {
      const { data, error } = await supabase
        .from("room_layouts")
        .select(`position, rotation, scale, models ( file_url, id, category )`)
        .eq("room_name", userPrompt);
      
      if (data) {
        const modelsWithIds = data.map((model) => ({
          ...model,
          instanceId: Date.now() + Math.random(),
          // 👇 ADD THIS FLAG: Tells Model.jsx "Don't touch the size/pivot!"
          isPredefined: true 
        }));
        setModels(modelsWithIds);
      }
      
    } else {
      try {
        const response = await fetch("http://192.168.1.17:3002/api/generate", {
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

  // Updated function signature
  const addModelToScene = (item, targetPosition = null) => {
    
    // Use targetPosition if provided (Drag & Drop), otherwise default center logic
    const position = targetPosition || [0, 0.5, 0];

    const newModel = {
      instanceId: Date.now(),
      position: position,
      rotation: [0, 0, 0],
      scale: 1,
      models: { file_url: item.file_url, category: item.category },
    };
    
    setModels((prevModels) => {
      // ... existing logic to save state ...
      // (Copy your existing internal logic here, just ensure 'newModel' uses the position above)
      const updatedModels = [...prevModels, newModel];
      
      // ... update currentDesign logic ... (keep your existing code)
      
      return updatedModels;
    });
    
    // ... message logic ...
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    
    // 1. Get the item data we attached in LibraryPanel
    const itemData = e.dataTransfer.getData("furniture_item");
    if (!itemData) return;
    
    const item = JSON.parse(itemData);

    // 2. Ask the Scene to convert Mouse X/Y to 3D X/Y/Z
    if (sceneRef.current && sceneRef.current.getFloorPosition) {
      const [x, y, z] = sceneRef.current.getFloorPosition(e.clientX, e.clientY);
      
      // 3. Add the model at that exact spot
      console.log(`🎯 Dropped at: [${x.toFixed(2)}, ${y}, ${z.toFixed(2)}]`);
      addModelToScene(item, [x, 0, z]);
    } else {
      // Fallback if ref is broken
      addModelToScene(item);
    }
  };

  const deleteSelectedModel = () => {
    if (!selectedObject) return;
    setModels((prevModels) => 
      prevModels.filter((model) => model.instanceId !== selectedObject.userData.instanceId)
    );
    setSelectedObject(null);
  };

  const handleOutlinerClick = (modelInstance) => {
      // Broadcast this ID to the 3D scene
      setSelectionTarget(modelInstance.instanceId);
    };

  const handleDiscoverClick = () => {
    navigate('/discover-style');
  };

  const toggleSidebar = () => setSidebarCollapsed(!isSidebarCollapsed);
  const hasMessages = messages.length > 0 || models.length > 0;

  return (
    <div className="create-page">

        {/* 👇 NEW: MOBILE ORIENTATION WARNING 👇 */}
            <div className="mobile-orientation-warning">
              <div className="rotate-icon">📱➡️🔄</div>
              <h2>Please Rotate Your Phone</h2>
              <p>This experience requires Landscape Mode.</p>
            </div>
            {/* 👆 END WARNING 👆 */}

      <video
        autoPlay
        loop
        muted
        className="create-page-bg-video"
        src={background_video}
      />
      <div className="create-layout">
        <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <button onClick={toggleSidebar} className="sidebar-toggle">
            {isSidebarCollapsed ? "☰" : "✖"}
          </button>

          {/* PROFILE BUTTON */}
          {!isSidebarCollapsed && user && (
            <div className="sidebar-profile-container">
              <Link to="/profile" className="sidebar-profile-btn">
                <span className="profile-icon">👤</span> 
                <span className="profile-text">{userName || "User"}</span>
              </Link>
            </div>
          )}

          {/* --- FIXED TOP SECTION --- */}
          <div className="sidebar-fixed-section">
            <ul className="sidebar-menu">
              <li className="sidebar-menu-item" onClick={handleNewChat}>
                <span className="label"><AddComment /> New Chat</span>
              </li>
              
              <li className="sidebar-menu-item" onClick={handleDiscoverClick}>
                <span className="label"><Apps /> Discover My Style</span>
              </li>


              <Link className="item" to="/history">
              <li className="sidebar-menu-item">
                  <span className="label"> <History /> History</span>
                
              </li>
              </Link>

              
                <Link className="item" to="/settings">
                  <li className="sidebar-menu-item">
                  <span className="label"> <Settings /> Settings</span>
               
              </li>
               </Link>
              
              
                <Link className="item" to="/">
                <li className="sidebar-menu-item">
                  <Home /> Home
               
              </li>
               </Link>

              <div className="furniture-library-toggle">
                <h3 onClick={() => setLibraryOpen(true)} className="library-title">
                  <LibraryBooks /> Open Library
                </h3>
              </div>
            </ul>
          </div>

          {/* --- SCROLLABLE PROMPT HISTORY --- */}
          {!isSidebarCollapsed && (
            <div className="sidebar-scrollable-section">
              <span className="history-title">Session History</span>
              {messages
                .filter(msg => msg.sender === 'user')
                .map((msg, index) => (
                  <div key={index} className="history-prompt-item">
                    "{msg.text}"
                  </div>
              ))}
              {messages.length === 0 && (
                <div style={{color: '#444', fontSize: '0.8rem', fontStyle: 'italic'}}>
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
          
          <div className="scene-wrapper" onDragOver={handleDragOver} onDrop={handleDrop}>
            {hasMessages ? (
              <div className="scene-container">
                <div className="transform-controls-ui">
                  <button onClick={() => setTransformMode("translate")} className={transformMode === "translate" ? "active" : ""}>Move</button>
                  <button onClick={() => setTransformMode("rotate")} className={transformMode === "rotate" ? "active" : ""}>Rotate</button>
                  <button onClick={() => setTransformMode("scale")} className={transformMode === "scale" ? "active" : ""}>Scale</button>
                  
                  <button onClick={() => setAuraAnalysisEnabled(!auraAnalysisEnabled)} className={`aura-button ${auraAnalysisEnabled ? "active" : ""}`}>
                    {auraAnalysisEnabled ? "Exit Aura Analysis" : "Generate Aura"}
                  </button>

                  <div className="save-controls">
                    <input 
                      type="text" 
                      value={designName} 
                      onChange={(e) => setDesignName(e.target.value)}
                      className="design-name-input"
                      placeholder="Enter design name"
                    />
                    <button onClick={handleSaveDesign} disabled={isSaving} className="save-button">
                      {isSaving ? "Saving..." : "Save"}
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

                {auraAnalysisEnabled && (
                  <div className="aura-legend">
                    <h4>Lighting Analysis</h4>
                    <div className="legend-item"><div className="color-box" style={{backgroundColor: '#ff0000'}}></div><span>Very Bright (&gt;750 lux)</span></div>
                    <div className="legend-item"><div className="color-box" style={{backgroundColor: '#000066'}}></div><span>Dark (&lt;50 lux)</span></div>
                  </div>
                )}

                <div className="scene-viewport">
                  {/* --- SCENE COMPONENT WITH REF --- */}
                  <Scene
                    ref={sceneRef} 
                    selectionTarget={selectionTarget} // <--- ADD THIS
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
                <button type="submit" className="submit">Send</button>
              </form>
            </div>
          </div>
          {/* --- RIGHT SIDEBAR (SCENE OUTLINER) --- */}
          
          {/* 1. The Toggle Arrow */}
          <button 
            className={`outliner-toggle ${isOutlinerOpen ? 'open' : ''}`}
            onClick={() => setIsOutlinerOpen(!isOutlinerOpen)}
            title="Toggle Scene List"
          >
            {isOutlinerOpen ? "→" : "←"}
          </button>

          {/* 2. The Panel */}
          <div className={`right-sidebar ${isOutlinerOpen ? 'open' : ''}`}>
            <div className="right-sidebar-header">
              <h3>Room Objects</h3>
              <span className="item-count">{models.length} Items</span>
            </div>
            
            <div className="outliner-list">
              {models.length === 0 ? (
                <div className="empty-outliner">Room is empty</div>
              ) : (
                models.map((model, index) => (
                  <div 
                    key={model.instanceId}
                    className={`outliner-item ${selectedObject?.userData?.instanceId === model.instanceId ? 'active' : ''}`}
                    onClick={() => handleOutlinerClick(model)}
                  >
                    <span className="item-icon">📦</span>
                    <div className="item-info">
                      <span className="item-name">{model.models.category || "Unknown Item"}</span>
                      <span className="item-id">#{index + 1}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          {/* ---------------------------------------- */}
        </div>
      </div>
    </div>
  );
};

export default Create;