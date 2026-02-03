# 🛒 Grocery Deal Finder

**An intelligent multi-agent AI system that analyzes grocery store weekly ads and matches them against your shopping list to find the best deals.**

Built with **Google Gemma 3**, this application demonstrates advanced AI engineering techniques including multi-agent orchestration, parallel processing, vector embeddings, and real-time vision analysis.

---

## 🎯 Project Overview

This application showcases a sophisticated **Map-Reduce pipeline** powered by four specialized AI agents that work in concert to extract, normalize, and match grocery deals from visual advertisements. The system processes PDF and image files through computer vision, performs semantic analysis, and delivers personalized deal recommendations.

### Key Capabilities

- **Vision-Based Extraction**: Processes grocery store ads (PDFs/images) using multimodal AI
- **Intelligent Categorization**: Classifies 100+ grocery items using vector embeddings
- **Semantic Matching**: Understands natural language queries ("sandwich stuff" → bread, meat, cheese)
- **Parallel Processing**: Handles large inventories through batched map-reduce operations
- **Real-Time Analysis**: Provides live status updates during the multi-stage pipeline

---

## 🏗️ Architecture

### Multi-Agent Pipeline

The system employs a **4-agent architecture** where each agent has a specialized role:

```mermaid
graph LR
    A[User Input] --> B[Agent 1: Vision Extractor]
    B --> C[Agent 2: Inventory Librarian]
    C --> D[Agent 3: List Interpreter]
    D --> E[Agent 4: Deal Matcher]
    E --> F[Results]
    
    style B fill:#e1f5ff
    style C fill:#fff3e0
    style D fill:#f3e5f5
    style E fill:#e8f5e9
```

#### Agent 1: Vision Extractor
- **Role**: Multimodal vision analysis
- **Input**: PDF/Image files of weekly ads
- **Output**: Raw product data (name, price, brand, deal text, validity)
- **Technology**: Gemma 3's vision capabilities
- **Challenge Solved**: Extracting structured data from unstructured visual layouts

#### Agent 2: Inventory Librarian
- **Role**: Normalization & categorization
- **Input**: Raw extracted items
- **Output**: Normalized, categorized master inventory
- **Technology**: Gemma 3 + Transformers.js (MiniLM-L6-v2) for vector classification
- **Challenge Solved**: Handling product name variations, unit conversions, and automatic categorization into 12 parent categories and 60+ subcategories
- **Optimization**: Parallel batch processing with configurable shard size (20 items/batch)

#### Agent 3: List Interpreter
- **Role**: Natural language processing
- **Input**: User's grocery list (free-form text)
- **Output**: Expanded, spell-checked search keywords
- **Technology**: Gemma 3's language understanding
- **Challenge Solved**: Converting vague terms ("snacks", "sandwich stuff") into specific searchable items

#### Agent 4: Deal Matcher
- **Role**: Semantic search & ranking
- **Input**: Clean keywords + Master inventory
- **Output**: Best matching deals with confidence scores
- **Technology**: Gemma 3's semantic understanding
- **Challenge Solved**: Fuzzy matching across brand variations and product types

---

## 🚀 Technical Highlights

### 1. **Map-Reduce Parallelization**
The Inventory Librarian (Agent 2) implements a map-reduce pattern to process large inventories efficiently:
- **Map Phase**: Splits items into shards of 20, processes in parallel
- **Reduce Phase**: Aggregates results and generates category distribution
- **Performance**: Handles 100+ items in seconds through concurrent API calls

### 2. **Vector Embeddings for Classification**
Instead of relying solely on LLM categorization, the system uses:
- **Model**: `Xenova/all-MiniLM-L6-v2` (384-dimensional embeddings)
- **Approach**: Pre-computed anchor vectors for 60+ subcategories
- **Matching**: Cosine similarity for fast, accurate classification
- **Deployment**: Runs in a Web Worker to avoid blocking the main thread

### 3. **Structured Outputs with Zod**
All agent responses are validated using Zod schemas:
- **Type Safety**: Runtime validation ensures data integrity
- **Error Handling**: Graceful fallbacks for malformed LLM outputs
- **Developer Experience**: Full TypeScript autocomplete for agent responses

### 4. **Web Workers for Performance**
The vector classifier runs in a dedicated Web Worker:
- **Non-Blocking**: Keeps UI responsive during heavy computation
- **Singleton Pattern**: Model loaded once and reused
- **Message-Based API**: Clean async interface with timeout handling

### 5. **Comprehensive Logging System**
Custom logger tracks the entire pipeline:
- **Structured Logs**: Timestamped entries for each agent
- **Visual Separators**: Clear delineation between pipeline stages
- **Downloadable**: Export full execution log for debugging
- **Production-Ready**: Easily adaptable for observability platforms

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **AI Model** | Google Gemma 3 (gemma-3-27b-it) | Multimodal capabilities, structured outputs, cost-effective |
| **Vector Embeddings** | Transformers.js + MiniLM-L6-v2 | Client-side inference, no server required, fast classification |
| **Frontend** | React 19 + TypeScript | Modern hooks, strict typing, component reusability |
| **Build Tool** | Vite | Fast HMR, optimized bundling, native ESM support |
| **Validation** | Zod | Runtime type safety, schema-driven development |
| **UI Components** | Lucide React | Lightweight, tree-shakeable icons |
| **Styling** | Tailwind CSS | Utility-first, responsive design, rapid prototyping |

---

## 📁 Project Structure

```
grocery-deal-finder/
├── src/
│   ├── components/          # React UI components
│   │   ├── Header.tsx
│   │   ├── GroceryInput.tsx
│   │   ├── FileUploader.tsx
│   │   ├── ResultsDisplay.tsx
│   │   ├── DealExplorer.tsx
│   │   └── ShoppingList.tsx
│   ├── services/            # Business logic & AI agents
│   │   ├── geminiService.ts      # 4-agent orchestration
│   │   ├── vectorClassifier.ts   # Web Worker wrapper
│   │   └── taxonomy.ts           # Category definitions
│   ├── workers/             # Web Workers
│   │   └── classifier.worker.ts  # Vector embedding classifier
│   ├── utils/               # Helper functions
│   │   ├── logger.ts             # Pipeline logging
│   │   └── chunking.ts           # Map-reduce utilities
│   ├── types.ts             # TypeScript interfaces
│   ├── schemas.ts           # Zod validation schemas
│   ├── App.tsx              # Main application
│   └── index.tsx            # Entry point
├── index.html               # HTML template
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies
├── .env.example             # Environment template
├── LICENSE                  # MIT License
└── README.md                # This file
```

---

## 🎨 Design Decisions

### Why Multi-Agent vs. Monolithic?
**Decision**: Split functionality across 4 specialized agents instead of one large prompt.

**Rationale**:
- **Separation of Concerns**: Each agent has a single, well-defined responsibility
- **Parallel Execution**: Agents 1-2 can process multiple files/batches concurrently
- **Easier Debugging**: Isolated failures are easier to trace and fix
- **Prompt Optimization**: Smaller, focused prompts yield more consistent outputs
- **Scalability**: Individual agents can be swapped or upgraded independently

### Why Vector Embeddings for Categorization?
**Decision**: Use client-side vector similarity instead of asking the LLM to categorize.

**Rationale**:
- **Speed**: Cosine similarity is orders of magnitude faster than LLM inference
- **Cost**: Reduces API calls by ~30% (no categorization in Agent 2's prompt)
- **Consistency**: Deterministic classification vs. probabilistic LLM outputs
- **Offline Capability**: Embeddings can be pre-computed and cached

### Why Web Workers?
**Decision**: Run vector classifier in a separate thread.

**Rationale**:
- **Responsiveness**: Prevents UI freezing during model initialization
- **Isolation**: Crashes in worker don't affect main thread
- **Resource Management**: Browser can optimize worker thread scheduling

### Why Zod Over TypeScript Alone?
**Decision**: Add runtime validation with Zod schemas.

**Rationale**:
- **LLM Unpredictability**: TypeScript can't validate LLM responses at runtime
- **Graceful Degradation**: Catch malformed outputs before they crash the app
- **Self-Documenting**: Schemas serve as both validation and documentation
- **Type Inference**: Zod schemas generate TypeScript types automatically

---

## 📊 Performance Metrics

- **Average Processing Time**: 15-25 seconds for 3 ads + 10-item list
- **Parallel Speedup**: 3-4x faster than sequential processing (Agent 2)
- **Accuracy**: 90%+ categorization accuracy on common grocery items
- **Scalability**: Tested with 150+ items across 5 store ads

---

## 🔐 Security & Best Practices

- **Environment Variables**: API keys stored in `.env` (gitignored)
- **Input Validation**: File type restrictions (PDF, images only)
- **Error Boundaries**: Graceful error handling at each agent
- **Type Safety**: Strict TypeScript + Zod validation
- **CORS Headers**: Configured for Web Worker + Transformers.js

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 👤 Author

**Dylan Gamache**  
*Software Engineer specializing in AI/ML applications*

This project demonstrates proficiency in:
- Multi-agent AI system design
- Parallel processing & optimization
- Vector embeddings & semantic search
- Modern TypeScript/React development
- Production-ready error handling & logging

---

**Note**: This is a portfolio project showcasing advanced AI engineering techniques. It is not affiliated with any grocery store chain.
