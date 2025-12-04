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
// --- 🧠 ENDPOINT 1: MODIFIED FOR RELATIVE POSITIONING (STRICTER) 🧠 ---
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, sceneState } = req.body;

        const systemPrompt = `You are a spatial reasoning AI for interior design.
        Your task is to add new furniture to a 3D scene based on user commands.

        INPUT:
        1. "currentScene": A list of existing objects.
        2. "userRequest": The user's command.

        OUTPUT:
        Return a JSON object with a key "items".
        Each item MUST have exactly these 4 fields:
        1. "name": The category (e.g., chair, table, lamp).
        2. "qualifiers": Array of adjectives (e.g., ["modern", "red"]).
        3. "relative_to": The anchor object name. Use "room" if no specific object is mentioned.
        4. "placement": The direction relative to the anchor.

        CRITICAL PLACEMENT RULES:
        - If the user says "right of X", "next to X", "on X":
          Set "relative_to" = "X" (find the closest matching name in currentScene).
          Set "placement" = "right", "left", "front", "back", or "on_top".
          
        - If the user says "in the corner", "center", "against wall":
          Set "relative_to" = "room".
          Set "placement" = "center", "back-wall", "back-right-corner", etc.

        EXAMPLES:
        User: "put a chair to the right of the table"
        Output: {"items": [{"name": "chair", "qualifiers": [], "relative_to": "table", "placement": "right"}]}

        User: "add a sofa in the back"
        Output: {"items": [{"name": "sofa", "qualifiers": [], "relative_to": "room", "placement": "back-wall"}]}
        
        Respond with ONLY VALID JSON.
        `;

        const userPrompt = `currentScene: ${JSON.stringify(sceneState, null, 2)}
        userRequest: "${prompt}"`;

        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);

        console.log("AI Response for /generate:", jsonResponse);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(jsonResponse);
        } catch (parseError) {
            console.error("Error: AI did not return valid JSON.", parseError);
            throw new Error(`AI response was not valid JSON`);
        }

        res.json(parsedResponse);

    } catch (error) {
        console.error("Error in /api/generate:", error.message);
        res.status(500).json({ error: error.message });
    }
});


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