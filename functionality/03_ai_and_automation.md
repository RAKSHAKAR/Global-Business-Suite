# 03. AI & Automation Engine Documentation

The **AI & Automation Engine** is the intelligence backbone of GBS. It controls multi-LLM routing, agent orchestration, RAG knowledge bases, prompt templates, AI safety guardrails, and low-code workflow automation.

---

## 📄 Page 1: AI Engines & Providers (`/ai-providers`)

### Overview & Purpose
Global management of LLM API providers, model registrations, API key secrets, and fallback routing strategies.

### Key Features & Functionality
1. **Provider Management**: Add and configure global API keys for OpenAI, Anthropic, Google Gemini, DeepSeek, Ollama (local), and custom HTTP LLMs.
2. **Model Registry**: Sync and activate specific models (e.g., `gpt-4o`, `claude-3-5-sonnet`, `gemini-1.5-pro`, `deepseek-r1`).
3. **Global Token Quotas**: Set platform-level monthly token consumption caps and fallback provider priorities.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/ai-providers/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-providers/page.tsx)
- **API Endpoints**:
  - `GET /api/v1/ai-providers`
  - `POST /api/v1/ai-providers`
  - `POST /api/v1/ai-providers/:id/sync-models`

---

## 📄 Page 2: AI Prompt Library (`/ai-prompts`)

### Overview & Purpose
Centralized system prompt repository for managing system prompts, template variables, version history, and model parameter defaults.

### Key Features & Functionality
1. **Prompt Template Editor**: Rich editor supporting dynamic variables (e.g., `{{tenant_name}}`, `{{customer_query}}`, `{{brand_tone}}`).
2. **Model Parameters Configuration**: Set temperature, max tokens, top_p, and frequency penalty per prompt template.
3. **Prompt Playground & Testing**: Live execution box to test prompts against selected AI models.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/ai-prompts/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-prompts/page.tsx)
- **API Endpoints**: `GET /api/v1/ai-prompts`, `POST /api/v1/ai-prompts`

---

## 📄 Page 3: AI Agents Control (`/ai-agents`)

### Overview & Purpose
Autonomous AI agent builder and control center for configuring multi-modal agents (e.g., Customer Support Agent, Review Response Agent, Social Media Copilot).

### Key Features & Functionality
1. **Agent Setup**: Define Agent Name, Role, System Prompt, and Primary LLM Model.
2. **Tool & Plugin Binding**: Attach tools to agents (e.g., GBP Review API, Calendar Booking, CRM Search, Web Browsing).
3. **Agent Memory & Execution Logs**: Inspect real-time agent execution traces, reasoning chains, and tool call histories.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/ai-agents/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-agents/page.tsx)
- **API Endpoints**: `GET /api/v1/ai-agents`, `POST /api/v1/ai-agents`

---

## 📄 Page 4: Knowledge Base & RAG (`/ai-knowledge`)

### Overview & Purpose
Retrieval-Augmented Generation (RAG) vector store manager for context-aware AI interactions.

### Key Features & Functionality
1. **Document Ingestion**: Upload PDF, DOCX, TXT, CSV files or crawl URLs to build tenant knowledge stores.
2. **Chunking & Vector Embedding**: Automatic text chunking, embedding generation, and vector index sync.
3. **Similarity Search Tester**: Test vector retrieval score accuracy given sample user queries.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/ai-knowledge/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-knowledge/page.tsx)
- **API Endpoints**: `GET /api/v1/ai-knowledge`, `POST /api/v1/ai-knowledge/upload`

---

## 📄 Page 5: AI Workflows (`/ai-workflows`) & Automation Builder (`/workflow-builder`)

### Overview & Purpose
Visual node-based canvas for chaining multi-agent workflows, conditionals, API requests, and automated triggers.

### Key Features & Functionality
1. **Visual Canvas**: Drag-and-drop workflow nodes (Trigger -> AI Prompt -> Condition -> Webhook/Email).
2. **Execution Scheduler**: Set cron schedules or event triggers (e.g., "On new review received").
3. **Execution History & Debugger**: Replay past execution runs step-by-step.

### How It Works (Technical Details)
- **Frontend Pages**: [`apps/admin-portal/app/ai-workflows/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-workflows/page.tsx), [`apps/admin-portal/app/workflow-builder/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/workflow-builder/page.tsx)

---

## 📄 Page 6: AI Safety & Governance (`/ai-governance`)

### Overview & Purpose
Safety guardrails, toxicity filtering, PII redaction, and compliance auditing for AI output generation.

### Key Features & Functionality
1. **Content Filtering Rules**: Define blocked keywords, regex patterns, and prohibited topic categories.
2. **PII Masking**: Automatic detection and redaction of SSNs, emails, phone numbers, and credit card numbers before LLM submission.
3. **Audit Trail & Flagged Logs**: Review prompts and outputs flagged by safety guardrails.

### How It Works (Technical Details)
- **Frontend Page**: [`apps/admin-portal/app/ai-governance/page.tsx`](file:///c:/Users/priyer/.gemini/antigravity-ide/scratch/SocialMedia/apps/admin-portal/app/ai-governance/page.tsx)
- **API Endpoint**: `GET /api/v1/ai-governance/logs`
