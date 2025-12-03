import React, { useState, useEffect } from "react";
import "./create.css";
// Import useNavigate to handle navigation
import { Link, useNavigate } from "react-router-dom";
import background_video from "../assets/landing_page_vid.mp4";
import { Scene } from '../Scene.jsx';
import { supabase } from "../supabaseClient";
import { LibraryPanel } from "../components/LibraryPanel";
// import EmotionDetector from '../components/EmotionDetector'; // We've moved this
// import EmotionDashboard from '../components/EmotionDashboard'; // We've moved this
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

  const getPositionFromPlacement = (placement) => {
    const roomBoundary = 3.5;
    switch (placement) {
      case "center":
        return [0, 0, 0];
      case "back-wall":
        return [0, 0, -roomBoundary];
      case "front-wall":
        return [0, 0, roomBoundary];
      case "left-wall":
        return [-roomBoundary, 0, 0];
      case "right-wall":
        return [roomBoundary, 0, 0];
      case "back-left-corner":
        return [-roomBoundary, 0, -roomBoundary];
      case "back-right-corner":
        return [roomBoundary, 0, -roomBoundary];
      default:
        // Default to a random-ish position in the middle
        return [(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2];
    }
  };


// --- 🎨 UPDATED FUNCTION: Handles Room Base + Additive Models 🎨 ---
  const processAiResponse = async (aiResponse) => {
    const newSceneModels = [];

    // 1. Check if the Room Base (White Cube) is missing
    // We look at the 'models' state to see if 'room_base' is already there.
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

        // Add the room base to our new batch of models
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
      // Skip adding the room_base if the AI accidentally suggests it again
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

      // If we found a model, add it to the newSceneModels array
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
        console.warn(
          `Could not find a model for category: ${item.name}`,
          queryError.message
        );
      }
    }

    // 4. Update the state by APPENDING new models to previous models
    setModels((prevModels) => {
      const updatedModels = [...prevModels, ...newSceneModels];
      
      // Update the design context
      const newDesign = {
        id: 'design_' + Date.now(),
        type: 'ai_generated_update',
        elements: updatedModels,
        prompt: inputValue,
        furnitureCount: updatedModels.length
      };
      
      console.log('🎨 Updated design:', newDesign);
      console.log('📦 Added elements:', newSceneModels);
      
      setCurrentDesign(newDesign);
      return updatedModels;
    });
  };
  // --- END OF UPDATED FUNCTION ---
  // --- END OF MODIFICATION ---


  const handleSendMessage = async (e) => {
    e.preventDefault();
    const userPrompt = inputValue.trim().toLowerCase();
    if (!userPrompt) return;
    
    setInputValue("");
    setMessages([{ text: userPrompt, sender: "user" }]);
    
    if (userPrompt === "living room") {
      // ... (This pre-made layout logic is fine, we'll leave it as is)
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
        setModels(modelsWithIds); // This replaces the scene, which is correct for a pre-made layout
      }
    } else {
      // --- 🧠 MODIFICATION: Send 'sceneState' (memory) to the AI 🧠 ---
      try {
        const response = await fetch("http://localhost:3002/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // We now send the prompt AND the current scene state (the 'models' array)
          body: JSON.stringify({ 
            prompt: userPrompt,
            sceneState: models // <-- This is our "memory"
          }),
        });
        
        if (!response.ok) throw new Error("Network response was not ok");
        const aiResponse = await response.json();
        
        // This function will now APPEND the new items instead of replacing
        await processAiResponse(aiResponse); 
      } catch (error) {
        console.error("Failed to get AI response:", error);
      }
      // --- END OF MODIFICATION ---
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
    
    // --- MODIFICATION: Use functional update for setModels and setCurrentDesign ---
    setModels((prevModels) => {
      const updatedModels = [...prevModels, newModel];

      // UPDATE DESIGN CONTEXT WHEN ADDING MANUAL FURNITURE
      if (currentDesign) {
        const updatedDesign = {
          ...currentDesign,
          elements: updatedModels,
          type: 'manual_addition',
          lastAdded: item.category
        };
        setCurrentDesign(updatedDesign);
      } else {
        // This is the first item added, create a new design
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
    // --- END OF MODIFICATION ---
    
    if (models.length === 0 && messages.length === 0) {
      setMessages([{ text: "Starting design...", sender: "system" }]);
    }
  };

  const deleteSelectedModel = () => {
    if (!selectedObject) return;
    
    // --- MODIFICATION: Use functional update for setModels and setCurrentDesign ---
    setModels((prevModels) => {
      const remainingModels = prevModels.filter(
        (model) => model.instanceId !== selectedObject.userData.instanceId
      );

      // UPDATE DESIGN CONTEXT WHEN DELETING
      if (currentDesign) {
        const updatedDesign = {
          ...currentDesign,
          elements: remainingModels
        };
        setCurrentDesign(updatedDesign);
      }

      return remainingModels;
    });
    // --- END OF MODIFICATION ---
    
    setSelectedObject(null);
  };

  // --- NEW: Handle navigation to the discover page ---
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
            
            {/* --- NEW: "Discover My Style" Button --- */}
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

                {/* --- MODIFICATION: Removed the hidden Emotion components --- */}
                {/* The Emotion components are now on their own page */}

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

                {/* AURA LEGEND */}
                {auraAnalysisEnabled && (
                  <div className="aura-legend">
                    <h4>Lighting Analysis</h4>
                    {/* ... (legend items) ... */}
                    <div className="legend-item">
                      <div className="color-box" style={{backgroundColor: '#ff0000'}}></div>
                      <span>Very Bright (&gt;750 lux)</span>
                    </div>
                    {/* ... all other legend items ... */}
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