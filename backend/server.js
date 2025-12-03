require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // We will use axios to talk to Ollama

const app = express();
app.use(cors());
// --- MODIFICATION: Increase request size limit ---
// This allows us to send a potentially large sceneState (memory)
app.use(express.json({ limit: '10mb' }));

// --- HELPER FUNCTION TO TALK TO OLLAMA ---
async function getOllamaResponse(system_prompt, user_prompt) {
    const ollamaApiUrl = 'http://localhost:11434/api/chat';
    const body = {
        model: "llama3", // The model we downloaded
        messages: [
            {
                role: "system",
                content: system_prompt,
            },
            {
                role: "user",
                content: user_prompt,
            },
        ],
        format: "json", // Ask Ollama to guarantee the output is JSON
        stream: false,
    };

    const response = await axios.post(ollamaApiUrl, body);
    // The actual JSON string is inside a nested property in Ollama's response
    return response.data.message.content;
}


// --- 🧠 ENDPOINT 1: MODIFIED FOR CONVERSATIONAL MEMORY 🧠 ---
app.post('/api/generate', async (req, res) => {
    try {
        // --- MODIFICATION 1 ---
        // We now receive the prompt AND the current sceneState (our "memory")
        const { prompt, sceneState } = req.body;

        // --- MODIFICATION 2: The New AI "Brain" ---
        // This new system prompt teaches the AI to be conversational and "additive"
        const systemPrompt = `You are an expert conversational interior design AI. Your task is to modify a 3D scene based on user requests.

        You will be given the current scene as "currentScene" (a JSON array of objects) and a new "userRequest" (a string).

        Your goal is to return a JSON object containing ONLY THE NEW items to be added.

        RULES:
        1.  **JSON Format:** The JSON object must have a key "items" which is an array of objects.
        2.  **Item Format:** Each object must have "name" (a category like chair, sofa), "qualifiers" (an array of adjectives), and "placement" (a simple string like "center" or "back-wall").
        3.  **ADDITIVE ONLY:** Only include *new* items requested by the user. DO NOT include items that are already in the "currentScene" array. This is the most important rule.
        4.  **Placement:** Use simple placement strings for now ("center", "back-wall", "left-wall", "right-wall", "front-wall", "back-left-corner", "back-right-corner").
        5.  **Empty Response:** If the user request is not a design command (e.g., "hello", "how are you"), or if no new items are needed, return an empty array: {"items": []}.
        6.  **RESPONSE:** Respond with ONLY the JSON object and no other text.

        EXAMPLE:
        currentScene: [{"name": "sofa", "qualifiers": ["modern"], "placement": "back-wall"}]
        userRequest: "add a small chair in the center"
        Your Response:
        {"items": [{"name": "chair", "qualifiers": ["small"], "placement": "center"}]}
        `;

        // --- MODIFICATION 3 ---
        // We create a new user prompt that includes the scene memory
        const userPrompt = `currentScene: ${JSON.stringify(sceneState, null, 2)}
        
userRequest: "${prompt}"`;

        // --- MODIFICATION 4 ---
        // Get the AI's response using the new prompts
        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);

        console.log("AI Response for /generate:", jsonResponse);

        // --- MODIFICATION 5: Robust JSON Parsing ---
        // This prevents a server crash if Llama 3 sends "Here is the JSON:..."
        let parsedResponse;
        try {
            parsedResponse = JSON.parse(jsonResponse);
        } catch (parseError) {
            console.error("Error: AI did not return valid JSON.", parseError);
            console.error("AI's raw response was:", jsonResponse);
            // Throw a specific error that our main catch block can handle
            throw new Error(`AI response was not valid JSON: ${jsonResponse}`);
        }

        res.json(parsedResponse);

    } catch (error) {
        console.error("Error in /api/generate:", error);

        // --- MODIFICATION 6: Helpful Error Messages ---
        // Check if the error is a connection refusal
        if (error.code === 'ECONNREFUSED') {
            console.error("FATAL ERROR: Could not connect to Ollama server at http://localhost:11434.");
            console.error("Please ensure the Ollama application is running.");
            return res.status(500).json({ error: "Failed to connect to AI server. Is Ollama running?" });
        }

        // Check for the specific JSON parse error we threw
        if (error.message.startsWith("AI response was not valid JSON")) {
            return res.status(500).json({ error: error.message });
        }

        res.status(500).json({ error: "Failed to generate content" });
    }
});
// --- END OF MODIFIED ENDPOINT ---


// --- ENDPOINT 2: ANALYZE AURA FOR LIGHTING (Unchanged) ---
app.post('/api/analyze-aura', async (req, res) => {
    try {
        const { blueprint } = req.body;
        const systemPrompt = `You are a lighting design expert AI. Your task is to analyze a room layout and predict the coordinates of bright spots and shadows. Return a JSON object with two keys: "bright_areas" and "shadow_areas". Each key should be an array of [x, y, z] coordinates. Keep the y-coordinate at 0.1. Respond with ONLY the JSON object and no other text.`;
        const userPrompt = `Here is the room blueprint: ${JSON.stringify(blueprint, null, 2)}`;

        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);

        console.log("Aura Analysis Response:", jsonResponse);
        res.json(JSON.parse(jsonResponse)); // This one is less critical, but could be updated later
    } catch (error) {
        console.error("Error during Aura Analysis:", error);
        res.status(500).json({ error: "Failed to analyze aura" });
    }
});


// --- START SERVER ---
const PORT = 3002;
app.listen(PORT, () => {
    console.log(`AI server running on http://localhost:${PORT}`);
});