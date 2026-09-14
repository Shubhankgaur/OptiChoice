# OptiChoice

## Intelligent Decision Evaluation System

An AI-assisted multi-criteria decision support platform that helps users compare multiple alternatives based on their own priorities.

The system uses a **deterministic decision engine** for scoring and ranking, while **Generative AI** is used to explain the results, trade-offs, and important factors.

---

# 👥 Team & Responsibilities

## Member 1 — Shubhank
### Frontend & UI/UX

**Main Folder:** `frontend/`

### Responsibilities
- React.js frontend
- TypeScript
- Tailwind CSS
- Login/Register UI
- Decision Workspace
- Decision creation forms
- Alternative and criteria forms
- Weight and rating/value inputs
- Results and ranking display
- Dashboard
- Charts and visualizations using Recharts
- Frontend API integration
- Responsive design
- What-If interface

### Important
The frontend **does NOT calculate the final ranking**.

It collects user input, sends it to the backend, and displays the results returned by the backend/decision engine.

---

## Member 2 — Rhythm
### Backend & Database

**Main Folder:** `backend/`

### Responsibilities
- Node.js
- Express.js
- REST APIs
- PostgreSQL / Supabase
- Database schema
- Authentication
- User management
- Decision CRUD operations
- Alternative and criteria CRUD operations
- Input validation
- Error handling
- API security
- Communication between frontend, database, decision engine and AI

### Important
The backend acts as the main coordinator between the different parts of the system.

---

## Member 3 — Chirayu
### Decision Engine & What-If

**Main Folder:** `decision-engine/`

### Responsibilities
- Multi-Criteria Decision Making (MCDM)
- Data normalization
- Criterion weighting
- Weighted score calculation
- Ranking alternatives
- Benefit vs Cost criteria
- Score breakdown
- What-If analysis
- Sensitivity analysis
- Scenario comparison
- Recalculation when weights/values change
- Unit testing of calculations

### Core Formula

`Score(Aj) = Σ (wi × vij)`

Where:
- `wi` = weight of criterion
- `vij` = normalized value of alternative
- `Aj` = alternative

### Important
The decision engine must be **deterministic**.

The same input should always produce the same ranking.

AI must NOT replace the mathematical scoring system.

---

## Member 4 — Yash
### AI Integration & Explainability

**Main Folder:** `ai/`

### Responsibilities
- Generative AI API integration
- Prompt design
- Sending structured decision results to AI
- AI explanation of rankings
- Trade-off explanations
- Strengths and weaknesses of alternatives
- Important criteria identification
- Assumption explanations
- What-If result explanations
- AI response validation
- Report/PDF generation
- AI-related testing

### Important
AI is used to **explain and interpret** the calculated result.

AI must NOT independently decide or silently change the ranking.

---

# 📁 Project Structure

```text
OptiChoice/
│
├── frontend/                    # Shubhank
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       ├── types/
│       └── hooks/
│
├── backend/                     # Rhythm
│   └── src/
│       ├── routes/
│       ├── controllers/
│       ├── services/
│       ├── middleware/
│       └── db/
│
├── decision-engine/             # Chirayu
│   ├── src/
│   │   ├── normalization/
│   │   ├── scoring/
│   │   ├── ranking/
│   │   └── what-if/
│   └── tests/
│
├── ai/                          # Yash
│   ├── src/
│   │   ├── prompts/
│   │   ├── services/
│   │   ├── validation/
│   │   └── reports/
│   └── tests/
│
├── docs/
│   ├── architecture/
│   ├── api/
│   ├── database/
│   └── project-documentation/
│
├── .env.example
├── .gitignore
└── README.md

                         User
                           │
                           ▼
                    ┌─────────────┐
                    │  Frontend   │
                    │  Shubhank   │
                    └──────┬──────┘
                           │
                        REST API
                           │
                           ▼
                    ┌─────────────┐
                    │   Backend   │
                    │    Rhythm   │
                    └──────┬──────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │ Decision Engine │
                  │     Chirayu     │
                  └────────┬────────┘
                           │
                     Score + Ranking
                           │
                           ▼
                     ┌───────────┐
                     │    AI     │
                     │   Yash    │
                     └─────┬─────┘
                           │
                      Explanation
                           │
                           ▼
                    ┌─────────────┐
                    │  Frontend   │
                    │  Shubhank   │
                    └─────────────┘


# Example Request
{
  "criteria": [
    {
      "name": "Performance",
      "weight": 0.35
    },
    {
      "name": "Battery",
      "weight": 0.25
    }
  ],
  "alternatives": [
    {
      "name": "MacBook",
      "values": {
        "Performance": 90,
        "Battery": 85
      }
    }
  ]
}

{
  "ranking": [
    {
      "name": "MacBook",
      "score": 0.87
    }
  ]
}