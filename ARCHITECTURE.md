# DataForge — Deterministic Multi-File Data Processing Engine
## System Architecture & Foundation Blueprint

---

## 1. Project Architecture

The application is built on a **Deterministic Decoupled Pipeline Architecture**. 

### Architectural Core Tenet
Data processing operations (parsing, profiling, filtering, joining, projection, formatting) must remain **100% deterministic, transparent, and reproducible**. No black-box AI model or non-deterministic heuristic ever touches, modifies, or generates raw records.

```
+-----------------------------------------------------------------------------------+
|                                 USER INTERFACE                                    |
|  [File Dropzone] -> [Schema & Field Picker] -> [Filter & Join Rules] -> [Preview] |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                        QUERY PLAN BUILDER & VALIDATOR                             |
|          Produces a normalized, deterministic Execution Plan (AST)                |
+----------------------------------------+------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                       DETERMINISTIC PROCESSING ENGINE                             |
|                                                                                   |
|  +--------------------+    +--------------------+    +-------------------------+  |
|  |   1. Ingestion     | -> |   2. Schema & Type | -> | 3. Relational Joiner    |  |
|  |   (CSV / XLSX)     |    |   Inference Engine |    | (Hash / Nested Loop)    |  |
|  +--------------------+    +--------------------+    +-------------------------+  |
|                                                                   |               |
|                                                                   v               |
|  +--------------------+    +--------------------+    +-------------------------+  |
|  |   6. Exporter      | <- |   5. Projection &  | <- | 4. Filter & Expression  |  |
|  |   (CSV / XLSX)     |    |   Transform Engine |    | Evaluation Engine       |  |
|  +--------------------+    +--------------------+    +-------------------------+  |
+-----------------------------------------------------------------------------------+
                                         ^
                                         | (Optional Future Layer)
+----------------------------------------+------------------------------------------+
|                  OPTIONAL LOCAL AI (OLLAMA) TRANSLATOR                            |
|  * Strictly off-band from data processing                                         |
|  * Input: Natural language query (e.g. "Ahmedabad customers with rev > 10k")     |
|  * Output: Validated JSON Extraction Plan matching the deterministic AST schema   |
|  * Never receives raw customer records; only receives column schema metadata      |
+-----------------------------------------------------------------------------------+
```

---

## 2. Main Modules

The system is organized into six decoupled modules:

### Module 1: `IngestionEngine` (`src/core/ingestion/`)
- Handles binary and text file reading for `.csv` (via streaming/chunked parsing) and `.xlsx` (via SheetJS workbook extraction).
- Normalizes disparate sheets and tables into standard in-memory tabular representations.
- Emits file metadata (size, sheet names, row count estimates, encoding).

### Module 2: `SchemaProfiler` (`src/core/profiler/`)
- Analyzes datasets to infer column names, non-null counts, unique value counts, and types (`string`, `number`, `boolean`, `date`).
- Detects primary key candidates and potential foreign key link candidates across datasets based on name similarity and overlapping value sets.

### Module 3: `QueryPlanner` (`src/core/planner/`)
- Constructs an immutable `ExtractionPlan` consisting of:
  - Source datasets
  - Target fields / selected projected columns with optional aliases
  - Filter predicate tree (composite `AND` / `OR` node groups)
  - Join specifications (`inner`, `left`, `right`, `full_outer`)
  - Sorting and pagination rules
- Validates the plan against available schemas before execution.

### Module 4: `ExecutionEngine` (`src/core/engine/`)
- Executes the `ExtractionPlan` in discrete deterministic pipeline stages.
- Performs memory-efficient hash-joins on common keys.
- Evaluates type-safe filter expressions with exact type coercion rules.
- Emits execution telemetry (records processed, execution time in ms, memory footprint).

### Module 5: `ExportEngine` (`src/core/export/`)
- Formats preview and confirmed output into user-specified download formats:
  - Clean formatted CSV with configurable delimiters.
  - Multi-sheet or single-sheet Excel workbook (`.xlsx`).
  - Standard JSON record array.

### Module 6: `AITranslatorBridge` (Future Extension - `src/core/ai/`)
- Interface contract for optional local Ollama instances.
- Strictly confined to translating natural language strings into typed `ExtractionPlan` AST objects.
- Contains schema-aware prompt templates that send column names only, preventing private data leakage.

---

## 3. Data-Processing Pipeline

The pipeline follows a synchronous/worker-based unidirectional flow:

```
[Raw Files: CSV/XLSX]
       |
       v
Stage 1: INGESTION & NORMALIZATION
       * Parse text/binary into raw 2D row-arrays
       * Header sanitization and empty row pruning
       |
       v
Stage 2: SCHEMA & TYPE INFERENCE
       * Sample non-null values
       * Infer types: ISO dates, numbers with formatting, booleans, trimmed strings
       * Compute nullability and cardinality
       |
       v
Stage 3: RELATIONAL RESOLUTION & JOIN
       * If multiple datasets are referenced, build hash-tables on join keys
       * Execute join strategy (e.g. Left Join orders to customers on customer_id)
       * Handle duplicate column collisions via namespacing (`file.column`)
       |
       v
Stage 4: FILTER PREDICATE EVALUATION
       * Evaluate logical AST (Conditions grouped by AND / OR)
       * Type-aware comparisons:
           - Numeric: `>`, `<`, `=`, `>=`, `<=`, `between`
           - String: `equals`, `contains`, `starts_with`, `regex`, `is_empty`
           - Date: `before`, `after`, `on`, `date_between`
           - Boolean: `is_true`, `is_false`
       |
       v
Stage 5: PROJECTION & COLUMN MAPPING
       * Extract only selected fields
       * Apply aliases and ordering
       |
       v
Stage 6: RESULT PREVIEW & EXPORT GENERATION
       * Paginated slice for instant UI preview
       * Full binary serialization on user export confirmation
```

---

## 4. User Workflow

1. **Upload & Ingest**: User drops or selects one or multiple files (`.csv`, `.xlsx`).
2. **Inspect & Explore**: The UI displays uploaded files, their sheets, detected columns, types, sample values, and row statistics.
3. **Field Selection**: User checks the specific columns needed in the final extract.
4. **Filter Definition**: User sets filtering rules (e.g., `City == 'Ahmedabad'`, `Revenue > 10000`).
5. **Relationship Definition** (Multi-file): If more than one file is selected, user defines or approves auto-suggested join keys (e.g., `Customers.id = Orders.customer_id`).
6. **Live Preview Execution**: System runs the plan on the dataset and displays the extracted preview with total matching record count.
7. **Refine or Confirm**: User inspects the preview, adjusts filters or selected fields if needed.
8. **Export**: User downloads the result as `.xlsx` or `.csv`.

---

## 5. Responsibilities of Each Module

| Module | Core Responsibility | Input | Output | AI Independence |
|---|---|---|---|---|
| **Ingestion** | Parse files without losing fidelity | File Buffers / Text | Raw Table Data | 100% Deterministic |
| **Profiler** | Infer types & statistical summary | Raw Table Data | Dataset Metadata & Schema | 100% Deterministic |
| **Planner** | Validate & serialize user query intent | UI State / JSON Plan | Validated Execution AST | 100% Deterministic |
| **Engine** | Apply joins, filters, and projections | Tables + Validated AST | Processed Records | 100% Deterministic |
| **Exporter** | Serialize records into standard files | Processed Records | Blob (`.csv`, `.xlsx`) | 100% Deterministic |
| **Ollama Bridge** | Natural language to AST translation | Query Prompt + Schema | Draft `ExtractionPlan` | Optional (off-band) |

---

## 6. Recommended Technology Stack

- **Core Language**: TypeScript 5+ (Strict Mode) for end-to-end type safety.
- **Frontend Framework**: React 19 + Tailwind CSS for a reactive, responsive workspace.
- **Iconography & UI**: Lucide React for consistent, lightweight visual cues.
- **Parsing Engines**:
  - `PapaParse`: High-performance RFC 4180 CSV parsing with streaming capability.
  - `xlsx` (SheetJS): Fast, zero-dependency Excel workbook parsing and sheet extraction.
- **Local Data Storage**: In-memory typed arrays + IndexedDB for local session caching without cloud uploads.
- **Exporting**: Client-side blob generation (`Blob`, `URL.createObjectURL`).
- **Optional Future AI Layer**: Local Ollama REST client (`http://localhost:11434/api/generate`) with strict JSON schema constrained decoding.

---

## 7. Folder Structure

```
/
├── ARCHITECTURE.md              # Complete architectural design document
├── package.json
├── index.html
├── src/
│   ├── main.tsx                 # Application entry point
│   ├── index.css                # Global Tailwind styles
│   ├── App.tsx                  # Root component & Architecture Console
│   │
│   ├── core/                    # Core Deterministic Engine (Zero UI dependency)
│   │   ├── types.ts             # Complete domain model, schemas, AST definitions
│   │   ├── pipeline.ts          # Pipeline orchestrator contracts & stage runner
│   │   ├── ingestion/           # File parsers (CSV, XLSX)
│   │   ├── profiler/            # Type inference & dataset profiling
│   │   ├── planner/             # Query AST builder & validator
│   │   ├── engine/              # Relational joiner & filter evaluator
│   │   ├── export/              # CSV & XLSX serializers
│   │   └── ai/                  # Ollama bridge contracts (isolated AST translation)
│   │
│   ├── components/              # UI Components
│   │   ├── layout/              # App header, stepper navigation, status bar
│   │   ├── ingestion/           # File upload dropzone, file list cards
│   │   ├── schema/              # Column inspector, data type badges
│   │   ├── query/               # Field selector, filter condition builder, join setup
│   │   ├── preview/             # Paginated tabular preview & summary stats
│   │   └── export/              # Format selector & download triggers
│   │
│   └── store/                   # Reactive state management
│       └── appState.ts          # Active files, selected fields, query plan state
```

---

## 8. MVP Scope

The Minimum Viable Product focuses purely on executing the deterministic core reliably:

1. **Multi-file Ingestion**: Upload multiple `.csv` and `.xlsx` files simultaneously.
2. **Automatic Schema Discovery**:
   - Inspect sheets, infer column types (`string`, `number`, `boolean`, `date`).
   - Show row count, column count, and sample values.
3. **Column Projection**: Checkbox selection of fields from any uploaded file.
4. **Deterministic Filtering**:
   - Numeric filters (`>`, `<`, `=`, `!=`, `between`).
   - Text filters (`equals`, `contains`, `starts_with`).
   - Composite `AND` / `OR` logic.
5. **Two-File Inner & Left Join**:
   - Match datasets on a chosen key column (e.g. `customer_id`).
6. **Live Result Preview**: Paginated preview table with match count.
7. **Clean Export**: Download resulting dataset as `.csv` or `.xlsx`.

*Explicitly Excluded from MVP:*
- Complex fuzzy matching or NLP query generation.
- Direct database connections (PostgreSQL/MySQL).
- Cloud uploads or cloud AI dependencies.

---

## 9. Future Extension Points

1. **Local Ollama Intent Interpreter**:
   - Convert English prompt -> validated `ExtractionPlan` JSON.
   - Enforce schema validation on Ollama output before passing to the engine.
2. **Advanced Multi-table Joins**:
   - Visual entity-relationship graph connecting 3+ datasets.
   - Full outer and anti-joins.
3. **Web Worker Offloading**:
   - Run the `ExecutionEngine` inside a dedicated Web Worker to process million-row files with zero UI freezing.
4. **Virtual Scroll Preview**:
   - Smooth viewport virtualization for datasets with >100,000 rows.
5. **Calculated Columns & Aggregations**:
   - Add computed expressions (e.g., `Price * Quantity`) and Group By aggregations (`SUM`, `AVG`, `COUNT`).
