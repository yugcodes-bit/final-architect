require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());

// Increase limit to handle large scene memory
app.use(express.json({ limit: '10mb' }));

// --- HELPER FUNCTION TO TALK TO OLLAMA ---
async function getOllamaResponse(system_prompt, user_prompt) {
    // 1. READ THE URL FROM .ENV
    const ollamaUrl = process.env.OLLAMA_URL;

    if (!ollamaUrl) {
        throw new Error("OLLAMA_URL is missing in .env file!");
    }

    console.log(`Connecting to AI at: ${ollamaUrl}`);

    const body = {
        model: "llama3", 
        messages: [
            { role: "system", content: system_prompt },
            { role: "user", content: user_prompt },
        ],
        format: "json",
        stream: false,
    };

    // 2. SEND REQUEST
    const response = await axios.post(ollamaUrl, body);
    
    // 3. RETURN CONTENT
    // This matches the structure of the /api/chat endpoint
    return response.data.message.content;
}

// --- ENDPOINT: GENERATE SCENE ---
app.post('/api/generate', async (req, res) => {
    try {
        const { prompt, sceneState } = req.body;

        const systemPrompt = `You are an expert conversational interior design AI. Your task is to modify a 3D scene based on user requests.
        You will be given the current scene as "currentScene" (a JSON array of objects) and a new "userRequest" (a string).
        Your goal is to return a JSON object containing ONLY THE NEW items to be added.

        RULES:
        1. JSON Format: The JSON object must have a key "items" which is an array of objects.
        2. Item Format: Each object must have "name" (category), "qualifiers" (adjectives), and "placement".
        3. ADDITIVE ONLY: Only include new items requested by the user.
        4. Empty Response: If no new items are needed, return {"items": []}.
        5. RESPONSE: Respond with ONLY the JSON object.
        `;

        const userPrompt = `currentScene: ${JSON.stringify(sceneState, null, 2)} 
        userRequest: "${prompt}"`;

        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);
        console.log("AI Response:", jsonResponse);

        let parsedResponse;
        try {
            parsedResponse = JSON.parse(jsonResponse);
        } catch (parseError) {
            console.error("AI did not return valid JSON:", jsonResponse);
            throw new Error(`AI response was not valid JSON`);
        }

        res.json(parsedResponse);

    } catch (error) {
        console.error("Error in /api/generate:", error.message);
        
        // Helpful error handling for connection issues
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
            return res.status(500).json({ 
                error: "Could not connect to the Host Laptop. Check IP address and Firewall." 
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// --- ENDPOINT: AURA ANALYSIS ---
app.post('/api/analyze-aura', async (req, res) => {
    try {
        const { blueprint } = req.body;
        const systemPrompt =` You are a lighting design expert AI. Return a JSON object with "bright_areas" and "shadow_areas" based on the blueprint.`;
        const userPrompt = `Blueprint: ${JSON.stringify(blueprint)}`;

        const jsonResponse = await getOllamaResponse(systemPrompt, userPrompt);
        res.json(JSON.parse(jsonResponse));
    } catch (error) {
        console.error("Error in Aura Analysis:", error);
        res.status(500).json({ error: "Failed to analyze aura" });
    }
});

const PORT = 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});