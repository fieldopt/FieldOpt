# Contributing

Guidelines for contributing to FieldOpt.

---

## Code Style

### Python

- **Indentation:** Tabs (not spaces)
- **Line length:** 100 characters (soft limit)
- **Naming:** snake_case for functions/variables, PascalCase for classes
- **Type hints:** Required for function signatures
- **Imports:** Sort imports (stdlib, third-party, local)

**Example:**
```python
from typing import Optional
from fastapi import FastAPI
from backend.database import get_session

def get_technician(tech_id: int) -> Optional[Technician]:
	"""Fetch a technician by ID."""
	# implementation
```

### JavaScript/React

- **Indentation:** Tabs (not spaces)
- **Line length:** 100 characters (soft limit)
- **Naming:** camelCase for functions/variables, PascalCase for components
- **Semicolons:** Yes
- **Imports:** ES6 modules

**Example:**
```javascript
import React, { useState } from 'react';
import { fetchTechnicians } from '../api/client';

const TechnicianGrid = () => {
	const [techs, setTechs] = useState([]);
	
	return <div>{/* component */}</div>;
};

export default TechnicianGrid;
```

### CSS

- **Indentation:** Tabs (not spaces)
- **Variables:** CSS custom properties for colors, spacing
- **Naming:** BEM naming (optional, but preferred)
- **Mobile-first:** Media queries for larger screens

**Example:**
```css
:root {
	--primary: #4a9eff;
	--spacing-md: 1.5rem;
}

.tech-grid {
	padding: var(--spacing-md);
	background: var(--primary);
}

@media (min-width: 768px) {
	.tech-grid {
		padding: var(--spacing-lg);
	}
}
```

---

## Commit Conventions

Format: `type(scope): message`

### Types

- **feat** — New feature
- **fix** — Bug fix
- **refactor** — Code refactoring (no feature change)
- **style** — Formatting, linting (no code change)
- **docs** — Documentation
- **test** — Tests
- **chore** — Build, deps, config

### Scope

Component or area of code:
- `api` — API endpoints
- `frontend` — React components
- `db` — Database models
- `routing` — Auto-routing logic

### Examples

```
feat(api): add skill validation to auto-route endpoint
fix(frontend): resolve grid selection bug on multi-select
refactor(db): optimize technician query with index
docs(readme): update installation instructions
chore(deps): upgrade React to 18.3
```

### Release Commits

```
chore(release): v0.0.7
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feat/your-feature-name
```

Use the same naming as commit types.

### 2. Make Changes

Follow code style guidelines. Commit frequently with clear messages:

```bash
git commit -m "feat(component): add new feature"
git commit -m "fix(api): resolve edge case"
```

### 3. Test Locally

```bash
# Backend
cd backend
python -m pytest

# Frontend
cd frontend
npm run test
```

### 4. Push & Create PR

```bash
git push origin feat/your-feature-name
```

Create a pull request on GitHub with a clear description.

### 5. Address Feedback

Reviewers may request changes. Make updates and push to the same branch:

```bash
git commit -m "fix: address review feedback"
git push origin feat/your-feature-name
```

### 6. Merge

Once approved, merge to `main`:

```bash
# On GitHub, click "Merge Pull Request"
```

### 7. Tag Release (Maintainers Only)

```bash
git checkout main
git pull origin main

git tag -a v0.0.X -m "Release v0.0.X: feature description"
git push origin --tags
```

---

## Development Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Run with auto-reload
python -m uvicorn api.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Database

```bash
docker run -d \
  --name fieldopt-db \
  -e POSTGRES_PASSWORD=fieldopt \
  -p 5432:5432 \
  postgres:15
```

---

## Adding a New API Endpoint

### 1. Define the Model

In `backend/database/models.py`:

```python
class MyModel(Base):
	__tablename__ = "my_models"
	
	id: Mapped[int] = mapped_column(primary_key=True)
	name: Mapped[str]
	created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

### 2. Create Routes

In `backend/api/routes/my_route.py`:

```python
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/my-endpoint", tags=["my-endpoint"])

@router.get("/")
async def list_items():
	"""List all items."""
	# implementation

@router.post("/")
async def create_item(item: ItemSchema):
	"""Create a new item."""
	# implementation
```

### 3. Register in Main App

In `backend/api/main.py`:

```python
from backend.api.routes import my_route

app.include_router(my_route.router)
```

### 4. Test

```bash
curl http://localhost:8000/api/v1/my-endpoint/
```

---

## Adding a New Frontend Component

### 1. Create Component

In `frontend/src/components/MyComponent.jsx`:

```javascript
import React from 'react';
import './MyComponent.css';

const MyComponent = ({ data }) => {
	return (
		<div className="my-component">
			{/* component JSX */}
		</div>
	);
};

export default MyComponent;
```

### 2. Add Styles

In `frontend/src/components/MyComponent.css`:

```css
.my-component {
	padding: var(--spacing-md);
	background: var(--bg-white);
	border-radius: var(--radius-md);
}
```

### 3. Use in App

In `frontend/src/App.jsx`:

```javascript
import MyComponent from './components/MyComponent';

function App() {
	return (
		<div>
			<MyComponent data={myData} />
		</div>
	);
}
```

---

## Pull Request Checklist

- [ ] Code follows style guide
- [ ] Commits follow convention
- [ ] Tests pass locally
- [ ] No console errors/warnings
- [ ] Documentation updated (if needed)
- [ ] Works in browser DevTools (no console errors)

---

## Issue Reporting

Found a bug? Open an issue:

1. Go to [GitHub Issues](https://github.com/zblauser/fieldopt/issues)
2. Click "New Issue"
3. Describe:
   - What you were doing
   - What went wrong
   - Expected behavior
   - Steps to reproduce
   - Environment (OS, Python/Node version)

---

## Feature Requests

Have an idea? Open a discussion:

1. Go to [GitHub Discussions](https://github.com/zblauser/fieldopt/discussions)
2. Click "New Discussion"
3. Describe your feature idea
4. Explain the use case and value

---

## Questions?

- **GitHub Issues:** Bug reports
- **GitHub Discussions:** Questions and feature ideas
- **Email:** hello@fieldopt.dev

---

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.
