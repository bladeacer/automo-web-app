# Note

As sensitive client data was used to trained a group member's code, their
relevant source code was removed from this repository.

Development was done on a separate private repository.

# high-level software architecture diagram

![high-level software architecture diagram](./images/architecture.jpg)

# Notes

Names here are listed in order of which the code is integrated.

For the icons in the folder structure, if they are not rendering you can
optionally install a Nerd Font.

# Nicholas/bladeacer

# Summary: Nicholas/bladeacer

Engineered a Decoupled Analytics Pipeline: SARIMA model, backend HTTP routes are isolated and managed with Docker Compose as Distributed Systems.

Implemented Multi-Tier Caching Strategy: KeyDB integration with the benchmark tests, up to 100x speedup (see [Benchmarks section below](#benchmarks)), emphasis on Latency Optimization.

Observability and Benchmarking: Benchmarking with `pytest` and `Dockerfile.test` on backend routes and KeyDB performance.

AI-Orchestration Layer: Created a streaming service that aggregates metrics, history and forecasting by the SARIMA model into a streamlined format suitable for reports.

Orchestrated Self-Healing Deployments: Designed a sophisticated Makefile and Docker Compose workflow that automates multi-stage service initialization, including a recursive health-check and auto-provisioning analytics layer, ensuring zero-config environment parity.

## Individual features

### Frontend

```
 .
├──  client
│   ├── ...
│   ├──  package-lock.json
│   ├──  package.json
│   ├──  public/
│   ├── ...
│   ├── 󰣞 src
│   │   ├──  @types
│   │   │   ├──  auth.ts
│   │   │   ├──  layout.ts
│   │   │   ├──  navigation.ts
│   │   │   └──  routes.tsx
│   │   ├──  App.tsx
│   │   ├──  components
│   │   │   ├──  Forecast
│   │   │   │   └──  ForecastChart.tsx
│   │   │   ├──  Layout
│   │   │   │   ├──  AuthLayout.tsx
│   │   │   │   ├──  Layout.tsx
│   │   │   │   ├──  LayoutTypes
│   │   │   │   │   ├──  CollapsedSideBar.module.css
│   │   │   │   │   ├──  CollapsedSideBar.tsx
│   │   │   │   │   ├──  CollapsibleAppShell.tsx
│   │   │   │   │   ├──  CollapsibleAppShellBottomContent.tsx
│   │   │   │   │   ├──  CollaspibleAppShellHeading.tsx
│   │   │   │   │   ├──  DeckedSideBar.module.css
│   │   │   │   │   ├──  DeckedSideBar.tsx
│   │   │   │   │   ├──  Heading.module.css
│   │   │   │   │   ├──  PlainLayout.tsx
│   │   │   │   │   ├──  SimpleSideBar.module.css
│   │   │   │   │   ├──  SimpleSideBar.tsx
│   │   │   │   │   └──  SimpleSideBarBottomContent.tsx
│   │   │   │   ├──  LinksGroup.module.css
│   │   │   │   ├──  LinksGroup.tsx
│   │   │   │   └──  Views.tsx
│   │   │   ├──  LoadingScreen
│   │   │   │   ├──  LoadingScreen.module.css
│   │   │   │   └──  LoadingScreen.tsx
│   │   │   ├──  UserPopOver
│   │   │   │   ├──  CollapsedSideBarUserPopOver.tsx
│   │   │   │   ├──  CollapsedUserPopOverContent.module.css
│   │   │   │   ├──  CollapsedUserPopOverContent.tsx
│   │   │   │   ├──  PopOverTargetContent.module.css
│   │   │   │   ├──  PopOverTargetContent.tsx
│   │   │   │   └──  UserPopOver.tsx
│   │   │   └── ...
│   │   ├──  configs
│   │   │   ├──  app.config.ts
│   │   │   ├──  navigation.config
│   │   │   │   └──  index.tsx
│   │   │   └──  routes.config
│   │   │       ├──  authRoute.tsx
│   │   │       ├──  index.ts
│   │   │       ├──  routes.config.ts
│   │   │       └──  search.config.ts
│   │   ├──  constants
│   │   │   ├──  api.constant.ts
│   │   │   └──  app.constant.ts
│   │   ├── ...
│   │   ├──  index.css
│   │   ├── ...
│   │   ├──  main.tsx
│   │   ├── ...
│   │   ├──  pages
│   │   │   ├──  auth
│   │   │   │   ├──  SignIn.module.css
│   │   │   │   ├──  SignIn.tsx
│   │   │   │   └──  SignUp.tsx
│   │   │   ├──  chatbot
│   │   │   │   └──  Chatbot.tsx
│   │   │   ├──  detection
│   │   │   │   └──  Detection.tsx
│   │   │   ├──  main
│   │   │   │   ├──  Analytics.tsx
│   │   │   │   ├──  home.module.css
│   │   │   │   ├──  Home.tsx
│   │   │   │   ├──  Search.module.css
│   │   │   │   ├──  Search.tsx
│   │   │   │   └──  Settings.tsx
│   │   │   ├──  simulation
│   │   │   │   └──  Simulation.tsx
│   │   │   └──  ts-forecast
│   │   │       ├──  Dashboard.tsx
│   │   │       ├──  Files.tsx
│   │   │       ├──  Manage.tsx
│   │   │       ├──  Pages.tsx
│   │   │       └──  Report.tsx
│   │   ├──  route
│   │   │   ├──  AppRoute.tsx
│   │   │   ├──  AuthorityCheck.tsx
│   │   │   ├──  AuthorityGuard.tsx
│   │   │   ├──  ProtectedRoute.tsx
│   │   │   └──  PublicRoute.tsx
│   │   ├──  services
│   │   │   ├──  ApiService.ts
│   │   │   ├──  auth
│   │   │   │   └──  auth.service.ts
│   │   │   ├──  BaseService.ts
│   │   │   ├──  DetectionService.ts
│   │   │   ├──  ForecastService.ts
│   │   │   ├──  OrderService.ts
│   │   │   └──  SimulationService.ts
│   │   ├──  ...
│   │   ├──  theme.ts
│   │   ├──  utils
│   │   │   ├──  deepParseJson.ts
│   │   │   └──  hooks
│   │   │       ├──  useAuth.ts
│   │   │       ├──  useAuthority.ts
│   │   │       ├──  useLocale.ts
│   │   │       └──  useQuery.ts
│   │   └── ...
│   ├── ...
│   ├──  tsconfig.json
│   ├──  vite.config.mjs
│   └──  vitest.setup.mjs
└── ...
```

Uses Mantine UI template. Set up client side service calls
to auth and other HTTP routes for codebase integration and
own frontend.

As the frontend mainly calls the backend routes, more details
on each feature would be covered in the backend section.

Provided and integrated both frontend and backend for group members.

Note the adherence to best practices like DRY and separation of concerns.

Secure Identity Lifecycle: Complete User CRUD implementation with encrypted
persistence and session-based authentication.

#### Dashboard

Interactive Dashboard with various export options (CSV, SVG, JPG)

#### Table View

Paginated table view with fuzzy search.

#### Quick Switcher

Added a way to use Ctrl K to quickly navigate between pages.

### Automation

```
 .
├──  Makefile
└── ...
```

Comprehensive [Makefile](./Makefile) for automating repetitive commands

### Dependency Management

```
 .
├──  inference 
│   ├── ...
│   ├──  pyproject.toml
│   └── ...
├──  pyproject.toml
└── ...
```

Made use of pyproject.toml for modern dependency management.

`uv` is also a nice drop in replacement to `pip` which performs better.

### Containerisation

```
 .
├──  docker-compose.yml
├──  Dockerfile
├──  Dockerfile.test
├── ...
├──  inference
│   ├── ...
│   ├──  Dockerfile
│   └── ...
├──  tests
│   └──  test_api.py
└── ...
```

![Backend structure](./images/backend.png)

Modular codebase with [Service Oriented Architecture](https://en.wikipedia.org/wiki/Service-oriented_architecture),
following a MVC pattern across a decoupled service architecture

[Docker Compose](./docker-compose.yml) for managing runtimes

This is quite a large section as services like KeyDB and GoatCounter were involved.

#### In-memory cache

KeyDB (Redis alternative with focus on performance) cache for CPU intensive routes.

Called in Backend routes.

My code, as well as all other group members' code which are deemed sufficiently
computationally expensive, is cached in-memory.

#### Observability

Privacy-Centric Telemetry: Self-hosted GoatCounter integration for real-time
traffic observability within a sovereign data perimeter, helping to
analyse and gain insight into usage habits.

Called via Docker Compose.

#### Integration tests

Integration [Unit tests](./tests/test_api.py): Validated backend service
integrity with automated pytest suites and KeyDB latency benchmarks.

Dockerfile.test is used as a separate test environment.

#### Benchmarks

Example from running `make test-all`
> individual steps are omitted here for brevity

KeyDB is very fast as we cache the results of computationally intensive, such
as the SARIMA forecast route(`/ts-model/forecast`).

Even with cache miss (or no cache entry for that route), tracing UI change (e.g.
dragging slider) to Flask backend to Quart model call (like forecasting) and
back takes less than a second.
> Once a result is cached, calling it again will significantly speed up rendering
> speed as it is using cached results.
> In short, it helps with repetitive API calls and Resource Content Management.

Cache also accounts for route parameters, so the cache for a SARIMA forecast of
48 months vs 12 months would be different.

![benchmark results](./images/tests.jpg)

### Supervised learning model

Supervised learning model is in another git branch. Trained on dataset from data.gov.sg.

### Backend

```
├──  server
│   ├──  __init__.py
│   ├──  app.py
│   ├──  extensions.py
│   ├──  models
│   │   ├──  __init__.py
│   │   └──  user.py
│   ├──  routes
│   │   ├──  __init__.py
│   │   ├── ...
│   │   ├──  bladeacer_sarima_ts.py
│   │   └── ...
│   └──  utils
│       ├──  __init__.py
│       └──  auth.py
└── ...
```

Set up backend auth and individual route blueprints.

### Report generation

My (Nicholas/bladeacer's backend features live in `bladeacer_sarima_ts.py`)

Renders in `Report.tsx` in the frontend.

Pandoc with WeasyPrint for markdown to html to PDF conversion for report generation
was used.

Pandoc and WeasyPrint were installed via the Dockerfile.

Augmented Report Generation was done using Gemini 2.5 Flash with parameterized
orchestration for the Gemini 2.5 Flash model, allowing for fine-grained control
over report generation logic.

In general the defaults are good enough (low temperature of 0.1) but the system
prompt and temperature
can be adjusted. This is for transparency and explainability for the angle of AI
Ethics.

### Time Series Forecasting

Leverages SARIMA Time series forecasting, with toggleable history and confidence
interval.

Renders in `Dashboard.tsx` in the frontend.

Export options are mostly client side, so it is not mentioned in depth here.

Codebase is quite modular with MVC architecture and best practices where possible.

### User CRUD

Secure Identity Lifecycle: Complete User CRUD implementation with encrypted
persistence and session-based authentication.

### Codebase Integration

Integrated all other group members' code with improvements made.

Jayce: Switched from CPU to GPU accelerated inpainting

Shyann: Reduced overhead by constructing less Pandas DataFrames with the use of
vectorisation and hash maps.

Caleb: Similar optimisations to Shyann.

---

# Jayce/04ten

```
 .
├──  models
│   └──  best_int8_openvino_model
├──  app.py
├──  Dockerfile
├──  pyproject.toml
└──  sanity_check.py
```

Object Detection to identity damaged car parts and Generative inpainting.

---

# Shyann/232297X-ShL
```
├──  server
│   ├── ...
│   ├──  routes
│   │   ├──  __init__.py
│   │   ├── ...
│   │   ├──  shl.py
│   │   ├──  shl_ai.py
│   │   ├──  shl_obsl.py
│   │   └── ...
│   └── ...
└── ...
```

Plotting of graph for model obsolescence with simulation and state snapshot.

Source code was removed due to dealing with sensitive client data.

---

# Caleb/aaaa

```
├──  server
│   ├── ...
│   ├──  routes
│   │   ├──  __init__.py
│   │   ├── ...
│   │   ├──  aaa.py
│   │   └── ...
│   └── ...
└── ...
```

Predict reordering via uploaded CSV.
