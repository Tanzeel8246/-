# Gemini Elementor Copilot (Groq + Gemini)

## Install
1. Copy `gemini-elementor-copilot` folder to `wp-content/plugins/`.
2. Activate plugin from WordPress admin.
3. Open **Settings → AI Copilot**.
4. Select provider (`Groq` recommended for higher free-tier testing) and add API key.
5. Open Elementor editor and click **AI Copilot** button.

## Included improvements
- Provider switch (Groq / Gemini).
- Secure AJAX checks (`nonce` + capability).
- TLS verification enabled.
- JSON schema-like response validation.
- Allowed widget whitelist.
- Request timeout control.
- Client-side duplicate request guard + error handling.
- ESC close + keyboard selection in modal.
- Short transient cache for repeated prompts.
