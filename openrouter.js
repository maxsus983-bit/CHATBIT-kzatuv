const logger = require("./logger");

class OpenRouter {
  constructor(config) {
    this.config = config;
  }

  enabled() {
    return Boolean(this.config.key && this.config.model);
  }

  async ask(system, user) {
    if (!this.enabled()) {
      throw new Error("OpenRouter is not configured");
    }

    const models = [this.config.model, ...this.config.fallbacks.filter(x => x !== this.config.model)];

    let lastError = null;

    for (const model of models) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${this.config.key}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://github.com/",
              "X-Title": "Minecraft Autonomous AI Agent"
            },
            body: JSON.stringify({
              model,
              temperature: 0.2,
              messages: [
                { role: "system", content: system },
                { role: "user", content: user }
              ]
            }),
            signal: AbortSignal.timeout(30000)
          });

          if (!response.ok) {
            const body = await response.text();
            throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 300)}`);
          }

          const json = await response.json();
          const text = json?.choices?.[0]?.message?.content;
          if (!text) throw new Error("OpenRouter returned no message content");
          return text;
        } catch (error) {
          lastError = error;
          logger.warn({ model, attempt, error: String(error) }, "OpenRouter request failed");
          await new Promise(r => setTimeout(r, 500 * (2 ** attempt)));
        }
      }
    }

    throw lastError || new Error("All OpenRouter models failed");
  }
}

module.exports = OpenRouter;
