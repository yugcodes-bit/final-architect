import React, { useState, useEffect } from "react";
import "./create.css";
// Import useNavigate to handle navigation
import { Link, useNavigate } from "react-router-dom";
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

  const updateModelTransform = (
    instanceId,
    newPosition,
    newRotation,
    newScale
  ) => {
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

  // --- 🧠 NEW: Smart Position Calculator (Handles Relative & Absolute) 🧠 ---
  const calculateSmartPosition = (placement, relativeTo, currentSceneModels) => {
    const roomBoundary = 3.5; // Keeping your existing boundary logic

    // 1. ABSOLUTE POSITIONING (Default fallback or if relative_to is "room")
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
        default: 
          // Default to a random-ish position in the middle
          return [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
      }
    }

    // 2. RELATIVE POSITIONING
    // Find the object the user is talking about in the existing models
    const anchorObj = currentSceneModels.find(m => 
      m.models.category.toLowerCase().includes(relativeTo.toLowerCase())
    );

    // If anchor not found, fallback to center
    if (!anchorObj) {
      console.warn(`Anchor object "${relativeTo}" not found. Placing in center.`);
      return [0, 0, 0];
    }

    // Get anchor position
    const [ax, ay, az] = anchorObj.position;
    const offset = 2.0; // Distance away (2 meters)

    switch (placement) {
      case "right": return [ax + offset, ay, az];
      case "left": return [ax - offset, ay, az];
      case "front": return [ax, ay, az + offset]; 
      case "back": return [ax, ay, az - offset];
      case "on_top": return [ax, ay + 1, az]; // Just in case we add small items later
      default: return [ax + offset, ay, az];
    }
  };

  // --- 🎨 UPDATED FUNCTION: Handles Room Base + Additive Models 🎨 ---
  const processAiResponse = async (aiResponse) => {
    const newSceneModels = [];

    // 1. Check if the Room Base (White Cube) is missing
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

    // 2. Get the furniture items from the AI response
    const furnitureItems = (aiResponse.items || []);

    // 3. Loop through and fetch all NEW furniture
    for (const item of furnitureItems) {
      if (item.name === "room_base") continue;

      let modelData = null;
      let queryError = null;

      // Try to find a match with qualifiers
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

      // If no match, try finding by category name only
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

      // If we found a model, add it
      if (modelData) {
        // --- 🔥 KEY CHANGE: Use Smart Position Calculator ---
        // We pass the item.placement, item.relative_to, and the CURRENT models state
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
      } else if (queryError) {
        console.warn(
          `Could not find a model for category: ${item.name}`,
          queryError.message
        );
      }
    }

    // 4. Update the state by APPENDING new models
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
    setMessages([{ text: userPrompt, sender: "user" }]);
    
    if (userPrompt === "living room") {
      // Pre-made layout logic
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
      // AI Generation Logic
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
        const updatedDesign = {
          ...currentDesign,
          elements: remainingModels
        };
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
        <div className={`sidebar ${isSidebarCollapsed ? "collapsed" : ""}`}>
          <button onClick={toggleSidebar} className="sidebar-toggle">
            {isSidebarCollapsed ? "☰" : "✖"}
          </button>
          <ul className="sidebar-menu">
            <li className="sidebar-menu-item">
              <span className="label">New Chat</span>
            </li>
            <li className="sidebar-menu-item" onClick={handleDiscoverClick}>
              <span className="label">✨ Discover My Style</span>
            </li>
            <li className="sidebar-menu-item">
              <span className="label">History</span>
            </li>
            <li className="sidebar-menu-item">
              <span className="label">Settings</span>
            </li>
            <li className="sidebar-menu-item">
              <Link className="item" to="/">
                Home
              </Link>
            </li>
            <div className="furniture-library-toggle">
              <h3
                onClick={() => setLibraryOpen(true)}
                className="library-title"
              >
                Library
              </h3>
            </div>
          </ul>
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
                  <button
                    onClick={() => setTransformMode("translate")}
                    className={transformMode === "translate" ? "active" : ""}
                  >
                    Move
                  </button>
                  <button
                    onClick={() => setTransformMode("rotate")}
                    className={transformMode === "rotate" ? "active" : ""}
                  >
                    Rotate
                  </button>
                  <button
                    onClick={() => setTransformMode("scale")}
                    className={transformMode === "scale" ? "active" : ""}
                  >
                    Scale
                  </button>
                  
                  <button
                    onClick={() => setAuraAnalysisEnabled(!auraAnalysisEnabled)}
                    className={`aura-button ${
                      auraAnalysisEnabled ? "active" : ""
                    }`}
                  >
                    {auraAnalysisEnabled
                      ? "Exit Aura Analysis"
                      : "Generate Aura"}
                  </button>

                  {selectedObject && (
                    <button
                      onClick={deleteSelectedModel}
                      className="delete-button"
                    >
                      Delete
                    </button>
                  )}
                </div>

                {selectedObject?.userData?.isLamp && (
                  <div className="light-controls-ui">
                    <label>Light Intensity</label>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      step="1"
                      value={lightIntensity}
                      onChange={(e) =>
                        setLightIntensity(Number(e.target.value))
                      }
                    />
                  </div>
                )}

                {auraAnalysisEnabled && (
                  <div className="aura-legend">
                    <h4>Lighting Analysis</h4>
                    <div className="legend-item">
                      <div className="color-box" style={{backgroundColor: '#ff0000'}}></div>
                      <span>Very Bright (&gt;750 lux)</span>
                    </div>
                    <div className="legend-item">
                      <div className="color-box" style={{backgroundColor: '#000066'}}></div>
                      <span>Dark (&lt;50 lux)</span>
                    </div>
                  </div>
                )}

                <div className="scene-viewport">
                  <Scene
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