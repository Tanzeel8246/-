# Gemini Elementor Copilot — Urdu Review + عملی Roadmap

## یہ کیا ہے؟
یہ ایک WordPress plugin ہے جو Elementor editor کے اندر AI Copilot بٹن inject کرتا ہے، صفحے کا context لیتا ہے، AJAX کے ذریعے server پر درخواست بھیجتا ہے، LLM API سے layout تجاویز لیتا ہے، پھر modal UI میں visual variations دکھا کر منتخب layout کو Elementor document میں insert کرتا ہے۔

### اہم حصے
- Plugin header: plugin metadata define کرتا ہے (name/version/author)۔
- Editor JS behavior: Elementor init پر floating button بناتا ہے، click پر request بھیجتا ہے، اور response سے modal render کرتا ہے۔
- AJAX handler (`gemini_copilot_generate`): nonce verify کرتا ہے، prompt بناتا ہے، API call کرتا ہے، JSON parse کرکے variations واپس بھیجتا ہے۔
- `apply_ids`: generated elements میں IDs assign کرتا ہے اور widget/container typing normalize کرتا ہے۔
- Settings page: admin میں API key save کرنے کے لیے options page دیتا ہے۔

---

## Gemini Free quota مسئلہ: Groq بہتر انتخاب ہے؟
آپ کی بات بالکل درست ہے: **Gemini free quota** بڑے پیمانے کی testing میں جلد ختم ہو سکتا ہے۔

### مختصر مشورہ
- اگر مقصد **زیادہ فری ٹیسٹنگ requests** ہے تو **Groq API (OpenAI-compatible endpoint)** ایک اچھا practical option ہے۔
- Plugin architecture کو single-provider کے بجائے **multi-provider** کریں تاکہ آپ باآسانی Gemini ↔ Groq ↔ OpenRouter switch کر سکیں۔

### Free-tier کے لیے practical options
1. **Groq**
   - بہت تیز inference اور testing کے لیے اچھا۔
   - OpenAI-compatible APIs کی وجہ سے integration نسبتاً آسان۔
2. **OpenRouter (free models)**
   - ایک gateway کے طور پر متعدد free/community models تک رسائی دیتا ہے۔
   - fallback strategy کے لیے مفید۔
3. **Cloudflare Workers AI (اگر infra موجود ہے)**
   - کچھ setups میں low-cost/free experimentation ممکن۔
4. **Local inference (Ollama) — development mode**
   - production کے لیے نہیں، لیکن unlimited local testing کے لیے بہترین۔

> Recommendation: آپ کے use-case (بڑے پیمانے کی QA testing) کے لیے **پہلا ہدف Groq + fallback provider** ہونا چاہیے۔

---

## لازمی بہتریاں (جو پہلے بتائی گئی تھیں) — اب actionable شکل میں

### 1) Security hardening
- `sslverify => false` ہٹا کر TLS verification enable رکھیں۔
- AJAX action میں capability check (`current_user_can('edit_posts')` یا strict role) شامل کریں۔
- API status code + response body validation شامل کریں، اور user-friendly error mapping کریں۔

### 2) Input/Output validation
- `$_POST['title']` اور `$_POST['context']` پر `isset` + sanitize + max-length guard۔
- LLM output کے لیے schema validation:
  - root میں `suggestion_title`, `reasoning`, `variations`
  - ہر variation میں `name`, `visual_type`, `data`
  - unsupported widget types reject کریں

### 3) Resilience & UX
- Frontend میں `.fail()` / error callback + timeout UX message۔
- loading کے دوران trigger button disable کریں اور duplicate clicks روکیں۔
- Modal accessibility: ESC close, focus trap, keyboard navigation۔

### 4) Maintainability
- Prompt templates الگ PHP file/constants میں رکھیں۔
- API provider client abstraction بنائیں (`GeminiClient`, `GroqClient`)۔
- `apply_ids` helper کو الگ class میں move کریں تاکہ unit test ہو سکے۔

### 5) WordPress best practices
- Settings API میں یہ options register کریں:
  - provider (`gemini|groq|openrouter`)
  - API key(s)
  - model
  - timeout/retry limits
- Localizable strings کے لیے `__()` / `esc_html__()` استعمال کریں۔

### 6) Performance & cost
- prompts concise رکھیں۔
- اسی title/context کے لیے short-lived transient cache رکھیں۔
- token limits اور max output size رکھیں۔

### 7) Data safety
- API keys mask کریں؛ logs میں raw key نہ آئے۔
- Generated layout insertion سے پہلے strict whitelist + recursive sanitization۔

---

## Implementation Roadmap (مرحلہ وار)

### Phase 0 — فوری (1 دن)
- Provider-agnostic settings fields شامل کریں۔
- `sslverify` fix + capability checks + بہتر error messages۔
- Frontend duplicate-request guard اور error fallback شامل کریں۔

### Phase 1 — Groq integration (1–2 دن)
- `LLMProviderInterface` بنائیں۔
- `GroqClient` add کریں (OpenAI-compatible chat/completions style)۔
- Existing Gemini path برقرار رکھیں مگر provider setting کے مطابق switch کریں۔

### Phase 2 — Validation layer (1 دن)
- response JSON schema validator شامل کریں۔
- malformed output پر fallback prompt + retry (max 1 retry)۔

### Phase 3 — Quality + QA scaling (2–3 دن)
- transient caching + rate limiting (per user/session)۔
- test mode: deterministic temperature اور mock responses۔
- logging dashboard (safe, masked) for failed generations۔

### Phase 4 — Hardening for wider rollout (1–2 دن)
- allowed widgets whitelist finalize کریں۔
- accessibility polish (modal keyboard support)۔
- i18n strings + admin help text + troubleshooting guide۔

---

## Suggested target architecture
- `class-copilot-settings.php`
- `class-copilot-controller.php` (AJAX)
- `class-llm-provider-interface.php`
- `class-gemini-provider.php`
- `class-groq-provider.php`
- `class-layout-validator.php`
- `assets/editor.js`

اس architecture سے vendor lock-in کم ہوگا اور free-tier exhaustion کی صورت میں آپ فوری provider swap کر سکیں گے۔
