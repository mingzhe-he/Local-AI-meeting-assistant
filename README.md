<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15A7rEFGlUeHNtHPgG0SXd1X3y8f1huAI

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Using Local LLMs with Ollama

The app supports running analysis with local models via [Ollama](https://ollama.com/). This lets you use models like Llama 3, Mistral, or Qwen locally without API costs.

**Setup Steps:**

1. **Install Ollama**
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.com/install.sh | sh

   # Or download from https://ollama.com/download
   ```

2. **Pull a model**
   ```bash
   # Recommended models for structured JSON output:
   ollama pull llama3.2        # Fast, good quality
   ollama pull qwen2.5:7b      # Excellent instruction following
   ollama pull mistral         # Balanced performance
   ```

3. **Start Ollama server** (runs on `http://localhost:11434` by default)
   ```bash
   ollama serve
   ```

4. **Configure the app**
   - Click the **Settings** icon (⚙️) in the Analysis Panel
   - Select **Ollama (Local)** as the AI Provider
   - Enter Ollama Server URL: `http://localhost:11434` (default)
   - Enter Model Name: `llama3.2`, `qwen2.5:7b`, or your chosen model
   - Click **Save Settings**

**Recommended Models:**
- `llama3.2` or `llama3.2:3b` - Fast, good for meetings
- `qwen2.5:7b` - Best JSON structure adherence
- `mistral` - Balanced speed and quality
- `llama3:8b` - Older but reliable

**Note:** The app uses Ollama's `/api/chat` endpoint with `format: "json"` to ensure structured output. Models must support JSON mode for reliable results.
