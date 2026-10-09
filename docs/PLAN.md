# Skill Graph: plan

Living document: update it when a decision changes. Milestone status is tracked in the table in §8.

## Context

An internal platform that shows an organisation's competencies as a graph of **roles → technical skills, soft skills and certifications**:

- Employees keep a profile and plan their development towards a target role.
- Managers follow their team, suggest development steps and send feedback on roles and paths.
- Practice Leads own the roles and development paths of their practice.
- A Site Lead oversees the practices of the site.

Decisions made at the start: hosting on **Vercel**, **Neon Postgres + Drizzle**, **Cytoscape.js** for the graph, and every change through a **feature branch → PR → auto-merge when CI passes**.

**Organisation model (decided after M1, refined twice):**

- One **site** per installation, led by a **Site Lead**. The Site Lead replaces the "admin" and oversees several practices. The database is ready for more sites later.
- **Practices** are focused departments, e.g. Frontend Practice or Delivery Management. Each has one or more **Practice Leads** who control it: its roles, specialisations, requirements and development paths.
- A role can have **specialisations**: a shared core plus extra requirements, e.g. Frontend Developer: React / Angular.
- **Managers** work within a practice. They see their direct reports' profiles, **recommend** development steps to them, and send the Practice Lead **change requests**: feedback on roles and paths, and proposals for new roles or specialisations.
- **Who sees named profiles**: the person, their manager, and the Practice Leads of the person's practice. The Site Lead sees aggregates only.
- **Catalogue**: three item types: **technical skills** (including tools and platforms), **soft skills** and **certifications**.
- **Weights only**: a role requires an item as Critical, Important or Nice to have. There are **no proficiency levels**: a person has a skill or doesn't.
- **Profiles**: explicit and self-declared. Certifications carry the date obtained and the expiry date. Nobody confirms profiles in the MVP.
- **Seniority**: no seniority levels inside a role; a senior role is a separate role, linked by a path.

### The brief, in short

- **Problem:** answers to "how do I move from role A to role B?", "which skills are essential and which optional?", "what other paths exist?" are spread across job profiles, community leads, managers and learning platforms.
- **Node types:** Role, Skill, Technology/Tool. **Priorities:** Critical (must-have), Important, Nice to have; colours red / orange / green. Line thickness = strength of the dependency.
- **Scenario 1:** a Frontend Developer (JavaScript, TypeScript, React) wants to be a Data Engineer. Shared: Problem Solving, Git, Agile. Missing: SQL, Python, Data Modelling, Spark, Databricks.
- **Scenario 2:** a Project Manager wants to be a Delivery Manager. Missing: Financial Management, Account Management, Commercial Awareness, Leadership, People Management.
- **Scenario 3:** a manager opens an employee's profile and sees current competencies, possible paths and the roles reachable with current skills.
- **MVP:** role browser, interactive competency map, comparing two roles, graph editing.
- **Roadmap:** V1 a hand-maintained graph; V2 imports from the Skills Framework, HR systems and learning platforms; V3 an AI assistant ("I want to become an AI Engineer").

---

## 1. Concepts

### Structure

```text
Site                                    Site Lead
 └─ Practice, e.g. Frontend Practice    Practice Lead(s)
     ├─ Roles: Frontend Developer, UX Developer, …
     │   └─ Specialisations: React, Angular
     └─ People: managers and their direct reports (members of the practice)
```

Another example: in Delivery Management, a manager has a Business Analyst, a Project Manager and a Scrum Master reporting to them.

### Glossary

- **Site**: the organisational unit an installation serves. There's one in the MVP, led by one or more **Site Leads**.
- **Practice**: a department of related roles, e.g. Frontend Practice, Delivery Management, Data & AI.
  - It has one or more **Practice Leads**, and its **members** are the people whose home practice it is.
  - Practice Leads control the practice: its roles, their specialisations, requirements and development paths.
- **Role** (job role): a named position in a practice, e.g. Frontend Developer or Scrum Master.
  - It has a description, its practice, a **core requirement profile**, optional **specialisations** and **paths** to other roles.
  - Not to be confused with what someone may do in the app: that's their **user type** (below).
- **Specialisation**: a variant of a role that adds requirements on top of the role's core, e.g. Frontend Developer: React, or Frontend Developer: Angular.
  - Its **effective requirements** = the role's core plus the specialisation's own. Where both name the same item, the specialisation's priority applies.
  - A role may have no specialisations.
- **Catalogue item**: one entry in the catalogue shared by the whole site. There is one "Python", not one per practice. Three types:
  - **Technical skill**: languages, frameworks, methods, tools and platforms. Examples: HTML, CSS, JavaScript, TypeScript, React, SQL, Data Modelling, Azure, Databricks, Git. Tools and platforms have the category "Tool / platform", so they can be filtered and shown apart.
  - **Soft skill**: how someone works with people and problems. Examples: Solutioning, Team Leading, Mentoring, Leadership, Communication, Stakeholder Management.
  - **Certification**: a credential with an issuer. Examples: Figma Foundation, Professional Scrum Master I (PSM I), Azure Fundamentals (AZ-900).
- **Requirement**: a role or specialisation needs a catalogue item, with
  - a **weight (priority)**: Critical, Important or Nice to have
  - an optional **note** explaining why it matters

  The weight belongs to the requirement, not the item: SQL can be Critical for a Data Engineer and Nice to have for a Full-stack Developer. Certifications are weighted the same way, e.g. PSM I is Critical for a Scrum Master. **There are no proficiency levels**: a person has a skill or doesn't, and holds a valid certification or doesn't.

- **Valid certification**: one the person holds that hasn't expired. An expired certification counts as missing. One expiring within 90 days is flagged.
- **Dependency**: "Databricks builds on Python and Spark". It orders learning in a plan. Items can also be **related** ("Terraform ↔ Bicep": alternatives or companions).
- **Path**: a career move from one role (or specialisation) to another, of two kinds:
  - **Official path**: defined by a Practice Lead, with a description and a typical duration. A role can have several official paths out, e.g. Data Engineer → AI Engineer or → Solution Architect, or Frontend Developer: React → Frontend Developer: Angular.
  - **Suggested path**: computed, not curated. These are roles the person is already close to by readiness. The UI labels them as suggestions.

  A path never copies requirements: what's missing is always the target's **current** effective requirements compared with the person's profile.

- **Profile**: a person's
  - home practice
  - current role and specialisation
  - the technical and soft skills they have
  - the certifications they hold, each with the date obtained and the expiry date (if it expires)
  - optionally a **target** role and specialisation

  It's explicit: when someone picks their current role, the app offers to pre-fill the profile with the role's effective skill requirements, and they untick what they don't have. Certifications aren't pre-filled, because they need dates. There's no hidden inheritance. The employee declares it, and nobody confirms it in the MVP.

- **Recommendation**: a manager's development suggestion to a direct report, with a comment. It can be:
  - a target role or specialisation
  - a skill or certification to work on

  The employee sees it in their plan and accepts or declines it. An accepted target becomes their target, and accepted items appear in their plan marked as recommended.

- **Change request**: a manager's message to a practice's Practice Leads, with a reason. It can be:
  - **feedback on a role or path**: add, remove or re-weight a requirement; add or remove a path; change a description
  - **a proposal for a new role or specialisation**

  A request is open, needs info, approved, rejected or withdrawn, and either side can comment. Approving one applies its changes in one transaction. For a proposal, approving creates the role or specialisation as a draft for the Practice Lead to complete. Every applied change goes to the audit log, linked to the request.

- **User type** is derived from data, not a single setting, so one person can be several at once:
  - everyone is an **Employee**
  - you're a **Manager** if someone reports to you
  - you're a **Practice Lead** if you're assigned to a practice
  - you're a **Site Lead** if you're assigned to the site

### Functions by user type

**Employee** (everyone)

- Creates a profile:
  - picks their current role and specialisation
  - gets a pre-filled profile and corrects it
  - ticks the technical and soft skills they have
  - adds certifications with the date obtained and the expiry date
- Sees how they meet **their own role**: met and missing, plus certifications that are expiring.
- Browses roles, the catalogue and the graph.
- **Compares two roles against their own profile** (§4): what they already have and what's missing, by priority and type.
- Picks a target and gets a **development plan**: the gaps in learning order, with their manager's accepted recommendations marked. Progress updates as they update their profile.
- Sees and answers **recommendations** from their manager.
- Sees the official paths from their role and the suggested ones.
- Sees only their own profile.

**Manager** (anyone with direct reports; works within a practice)

- Everything an employee can do.
- **Team view**: each direct report with their role, target, readiness and top gaps. Plus aggregated gaps, e.g. "3 of 5 people lack Critical SQL for their role".
- **Employee profile** (Scenario 3):
  - their profile, met and missing for their role, and certifications that are expiring
  - official and suggested paths
  - the roles they can reach, with readiness
- **Recommends** development steps to a direct report: a target or items to develop, with a comment.
- **Succession**: who in the team is closest to a given role.
- **Change requests** to the Practice Leads: feedback on roles and paths, proposals for new roles or specialisations. Follows their status and comments.

**Practice Lead** (assigned to a practice)

- Everything an employee can do.
- **Controls the practice**:
  - creates and edits its roles and specialisations
  - sets requirements (item, weight, note)
  - defines official paths
- **Reviews change requests** for the practice: approve (applies or creates a draft), reject with a reason, or ask for more information.
- Sees the **named profiles of the practice's members**, and the practice's gaps and readiness per role.
- Adds items to the shared catalogue. Duplicates are blocked by normalised name.
- Can also send change requests to other practices.

**Site Lead** (assigned to the site; replaces the admin)

- Everything an employee can do.
- **Practices**: creates them and appoints their Practice Leads.
- **People**: home practice, who reports to whom, who leads what. Later, these come from the HR system (V2).
- **Site overview**, aggregated only, with groups smaller than 5 people hidden:
  - gaps and readiness per practice and per role
  - bench strength: how many people are close to each role
- **Catalogue**: merges duplicates and maintains categories.
- **Audit log**. Can edit any role in an emergency; the audit log records it.
- **Doesn't** see named skill profiles.

### Permissions

| Capability                                                       | Employee | Manager        | Practice Lead           | Site Lead                  |
| ---------------------------------------------------------------- | -------- | -------------- | ----------------------- | -------------------------- |
| Own profile, plan, compare, browse roles & graph                 | ✓        | ✓              | ✓                       | ✓                          |
| Named profiles                                                   | own      | direct reports | members of own practice | – (aggregates only)        |
| Aggregated gaps and readiness                                    | –        | own team       | own practice            | all practices (groups ≥ 5) |
| Recommendations to a person                                      | –        | direct reports | –                       | –                          |
| Succession / bench strength                                      | –        | own team       | own practice            | all practices, aggregated  |
| Send change requests and proposals                               | –        | ✓              | ✓ (to other practices)  | –                          |
| Review change requests                                           | –        | –              | own practice            | emergency                  |
| Edit roles, specialisations, requirements, paths                 | –        | –              | own practice            | emergency                  |
| Add catalogue items                                              | –        | –              | ✓                       | ✓                          |
| Practices, leads, people and reporting lines; merge items; audit | –        | –              | –                       | ✓                          |

Every capability is checked on the server by one `can(user, action, resource)` helper, with an end-to-end test for each denial.

## 2. Stack

| Concern      | Choice                                                                                                                                    | Why                                                                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router, Server Components, Server Actions), TypeScript (strict), pnpm, Node 24                                            | Before writing code, read the bundled docs in `node_modules/next/dist/docs/` for caching, route handlers and auth, as AGENTS.md requires.    |
| UI           | Tailwind 4 + shadcn/ui (Radix) + lucide icons; light and dark themes from colour variables                                                | Accessible primitives.                                                                                                                       |
| DB           | Neon Postgres via Vercel Marketplace (prod plus one database branch per preview), Drizzle ORM + drizzle-kit migrations, `postgres` driver | Scales to zero but never pauses. Preview deploys get their own database. One driver everywhere.                                              |
| Local DB     | Postgres 17 in Docker (`pnpm db:up`, plain `docker` so Colima/OrbStack/Docker Desktop all work); PGlite for fast DB tests                 | No cloud needed to develop or test.                                                                                                          |
| Auth         | Better Auth: Microsoft (Entra ID) provider in production; demo sign-in with seeded people in dev and on previews only                     | Entra doesn't allow wildcard redirect URIs, so previews can't use Microsoft sign-in.                                                         |
| Graph        | Cytoscape.js 3.34 + `cytoscape-fcose`, wrapped in a thin React client component written by us (`react-cytoscapejs` is stale)              | Shapes per node type, line width mapping, built-in Dijkstra and neighbourhood search, concentric and force layouts, optional WebGL renderer. |
| Domain logic | Pure TypeScript in `src/domain/`, working on an in-memory graph                                                                           | At ~22k rows the whole graph fits in memory. The same functions serve the UI, the API and the future V3 AI assistant.                        |
| Validation   | zod 4, shared by server actions and API                                                                                                   |                                                                                                                                              |
| Tests        | Vitest (domain + components), PGlite (DB), Playwright + `@axe-core/playwright` (end-to-end + accessibility)                               |                                                                                                                                              |
| Hosting      | Vercel, region `fra1`, production = `main`, preview per PR                                                                                | Hobby is non-commercial only: fine for a demo. Real internal use needs Pro or a move to Azure (see Risks).                                   |

**Why relational and not a graph database:** the data is small. All graph algorithms run in TypeScript on a cached, in-memory copy of the graph, and Postgres stays a plain store with constraints. A graph database would add operational cost for no gain, and Postgres moves easily to Azure Database for PostgreSQL later.

## 3. Data model (Drizzle, `src/db/schema.ts`)

M1 built v1. Migration `0001` (milestone M2) brings it to the model below; there's no production user data yet, so that's cheap. _(new)_ marks additions to v1.

- **`sites`** _(new)_: `id`, `name`, `slug`, timestamps. One row in the MVP.
- **`site_leads`** _(new)_: (`site_id`, `user_id`) PK.
- **`practices`** _(new)_: `id`, `site_id` → sites, `name` unique per site, `slug` unique, `description`, timestamps.
- **`practice_leads`** _(new)_: (`practice_id`, `user_id`) PK. A practice can have several leads, and a person can lead several practices.
- **`nodes`**: roles, specialisations and catalogue items.
  - `id`, `type` enum(`role`, `specialization`, `technical_skill`, `soft_skill`, `certification`) _(new: replaces `skill` and `technology`)_, `name`, `slug` unique, `normalized_name`, `description`, `category`, `tags`, `external_id`, `source`, timestamps.
  - `practice_id` → practices _(new)_: required for roles, empty otherwise.
  - `parent_role_id` → nodes _(new)_: required for specialisations (their role), empty otherwise.
  - `issuer` _(new)_: for certifications (e.g. Scrum.org, Microsoft, Figma), empty otherwise.
  - `status` enum(`draft`, `published`) _(new)_: drafts come from approved proposals and are visible only to Practice Leads until published.
  - Name rules:
    - Normalisation: lowercase, punctuation stripped except `+` and `#`, `&` read as "and".
    - Names are unique across roles and catalogue items.
    - Specialisation names are unique within their role ("React" can be a specialisation of Frontend Developer and also a technical skill).
- **`edges`**
  - `id`, `kind`, `source_id`/`target_id` → nodes (on delete cascade), `priority`, `strength` 1–5, `note` _(new)_, `typical_months` _(new)_, `external_id`, `source`, timestamps.
  - Kinds (type rules in the domain validator, tested):
    - `requires`: role or specialisation → technical skill / soft skill / certification, with a **priority** (weight)
    - `builds_on`: item → item it builds on (a prerequisite). Cycles are warned about.
    - `related_to`: item ↔ item, undirected, stored with `source_id < target_id`
    - `next_step`: role/specialisation → role/specialisation, an **official path**, with an optional description (`note`) and `typical_months`
  - Database checks: no self-loops; `priority` set exactly on `requires`; strength 1–5; `related_to` ordered; `typical_months` only on `next_step`.
- **Better Auth tables**: `user` (exists), `session`, `account`, `verification` (M4).
- **`profiles`**
  - `user_id` PK, `practice_id` → practices _(new: home practice)_, `current_role_id` and `current_specialization_id` → nodes, `target_role_id` and `target_specialization_id` _(new)_ → nodes, `manager_id` → user, timestamps.
  - `app_role` is removed. Manager, Practice Lead and Site Lead follow from `manager_id`, `practice_leads` and `site_leads`.
- **`profile_items`** _(replaces `profile_skills`)_: (`user_id`, `node_id`) PK, `obtained_on` and `expires_on` dates (certifications only; `expires_on` empty if it doesn't expire), timestamps.
- **`recommendations`** _(new)_
  - `id`, `person_id` → user, `author_id` → user, `node_id` → nodes (a role/specialisation = a suggested target; a catalogue item = something to work on), `comment`, `status` enum(`open`, `accepted`, `declined`), timestamps, `answered_at`.
  - Index (`person_id`, `status`).
- **`change_requests`** _(new)_
  - `id`, `practice_id` → practices (whose leads review it), `role_id` → nodes (empty for a new-role proposal), `author_id` → user, `status` enum(`open`, `needs_info`, `approved`, `rejected`, `withdrawn`), `reason`, `changes` jsonb, `decided_by`, `decided_at`, `decision_note`, timestamps.
  - `changes` is a list of operations validated with zod:
    - `add_requirement` (an existing item, or a new item to create) with a weight and a note
    - `update_requirement`, `remove_requirement`
    - `add_path` / `remove_path`, `update_description`
    - `propose_role`, `propose_specialization`
  - Indexes: (`practice_id`, `status`), (`author_id`).
- **`change_request_comments`** _(new)_: `id`, `request_id` → change_requests (cascade), `author_id`, `body`, `at`.
- **`audit_log`**
  - `id`, `actor_id`, `action`, `entity`, `entity_id`, `before`, `after`, `at`.
  - `entity` gains `site`, `practice`, `profile_item`, `recommendation`, `change_request` and `access`.
  - New `change_request_id`: set when a change was applied by approving a request.
  - Written in the same transaction as the change.

## 4. Domain logic (`src/domain/`, written test-first)

A requirement is **met** when the person has the skill, or holds a valid (unexpired) certification. Otherwise it's **missing**. Certifications that are met but expire within 90 days are also flagged as **expiring**.

The functions:

- **Effective requirements** `requirementsOf(role, specialisation?)`: the role's core plus the specialisation's own; for the same item, the specialisation wins.
- **Fit to a target** `assess(profile, target, today)` returns `met`, `missing` and `expiring`, grouped by weight and type. Used for "how do I meet my own role", for gap analysis and for the plan.
- **Learning order** within `missing`, applied in this order:
  1. Critical before Important before Nice
  2. within a priority, prerequisites first (topological sort over `builds_on`)
  3. then items more roles require first
  4. then by name

  This gives Scenario 1's order: SQL, Python, Data Modelling, then Spark before Databricks.

- **Compare two targets with a profile** `compare(a, b, profile?)` returns:
  - `shared`: in both, with both weights
  - `onlyB`: what moving to B adds
  - `onlyA`: what B doesn't need

  With a profile, every row in `shared` and `onlyB` also says whether the person already has it or still has to learn it.

- **Readiness** `readiness(profile, target)` = Σ w(met) / Σ w(all requirements).
  - Weights: Critical 3, Important 2, Nice 1.
  - **Reachable**: every Critical requirement met and readiness ≥ 0.70.
  - **Stretch**: readiness ≥ 0.50. **Far**: anything lower.
  - The thresholds live in `src/domain/config.ts`.
- **Paths for a person**:
  - Official paths from their current role and specialisation, up to 3 hops, each with readiness.
  - Suggested: the top N targets by readiness that no official path leads to, labelled as suggestions.
- **Development plan**: `assess(profile, target)` in learning order, with accepted recommendations marked (and added if the target doesn't require them), plus progress = readiness.
- **Aggregates**:
  - Team (manager): per item, how many reports have it as a Critical/Important gap for their current or target role.
  - Practice (Practice Lead): the same per role, named.
  - Site (Site Lead): the same per practice and role, hiding groups under 5 people, plus bench strength (people reachable / stretch per role).
- **Change requests**:
  - `validateChanges(graph, request)` re-checks every operation against the current graph: items exist, no duplicates, type rules hold, no cycles.
  - `applyChanges` turns a valid request into graph writes, or into a draft role or specialisation. Approval fails with a clear message if an operation no longer applies.
- **Validators** for every write:
  - no duplicate normalised names; specialisations unique within their role
  - no self-loops; type rules per kind; issuer only on certifications
  - roles have a practice; specialisations have a role
  - `builds_on` cycle detection (warn, then confirm)
  - a count of everything a destructive change affects

## 5. Routes and API

**Pages**

- `/` home: my role and how I meet it, my target and progress, my paths, new recommendations.
- `/onboarding`: pick my practice, role and specialisation, then review the pre-filled profile.
- `/me`: profile editor (skills, certifications with dates, target). `/me/plan`: development plan and recommendations.
- `/roles`, `/roles/[slug]`:
  - core requirements and specialisations, by weight and type, with notes
  - practice and Practice Leads
  - official paths in and out
  - "compare with my profile"
- `/catalogue`, `/catalogue/[slug]`: technical skills, soft skills and certifications, and which roles need each one (with weight).
- `/compare?a=&b=`: two roles or specialisations, always with my profile overlaid.
- `/explore`: the graph (§6).
- Manager:
  - `/team`
  - `/team/[userId]` (Scenario 3, plus "recommend")
  - `/team/succession?role=`
- Practice Lead:
  - `/practices/[slug]`: roles, members, gaps, request inbox
  - `/practices/[slug]/roles/[role]/edit` (core, specialisations, paths, drafts)
  - `/practices/[slug]/people/[userId]`
- Change requests: `/requests` (mine and my inbox), `/requests/new?practice=&role=`, `/requests/[id]` (changes, reason, comments, decision).
- Site Lead:
  - `/site`: overview and bench strength
  - `/site/practices`, `/site/people`, `/site/catalogue`, `/site/audit`

**API** (`/api/v1`, a thin layer over `src/domain`, built for V3)

- `GET /graph`
- `GET /roles/:slug`
- `GET /compare?a=&b=`
- `GET /me/assessment?target=`
- `GET /people/:id/paths` (only for those who may see that person's profile)

All writes go through Server Actions with zod validation and `can()`. The graph read is cached with a cache tag that edits and approved requests invalidate.

## 6. Graph UX (solving the problems the brief doesn't cover)

- **Never the whole hairball by default.** `/explore` opens on a search box and role picker.
  - The overview uses the fcose layout, faint links and labels only when zoomed in. If the performance test (M7) needs it, it switches to the WebGL renderer.
  - **Focus mode**: the selected node plus N hops (1–3).
  - For a role, the **concentric layout** puts the role in the centre with rings for Critical (inner), Important and Nice. Its specialisations sit next to it, and selecting one adds its requirements.
  - **My view**: with my profile overlaid, a focused role's requirements show met / missing.
- **Type shown by shape**, each in a neutral per-type tint:
  - role = hexagon
  - specialisation = small hexagon attached to its role
  - technical skill = ellipse (tools and platforms with a darker outline)
  - soft skill = diamond
  - certification = star
- **Filters**: practice, type (technical / soft / certification), category (e.g. Tool / platform), weight, hop depth.
- **Priority colour only appears in context.** With a role in focus, its requirements turn red (Critical), orange (Important) or green (Nice). With nothing in focus, everything stays neutral.
- **Never colour alone**:
  - priority also shows as line style (solid / dashed / dotted) and as the ring in the concentric layout
  - nodes carry a weight badge in their label
  - a legend is always visible
  - colours are chosen for colour-blind safety and ≥3:1 contrast against the background in both themes
- **Line width = strength** (1–5 mapped to 1–6px). Official paths are drawn as arrows between roles.
- **Side panel on click**:
  - description, type and (for roles) practice
  - connections grouped by kind
  - weight within the current focus
  - "Roles that need this", each with its weight
  - links to the detail page and to compare
- **Path mode**: pick two roles, highlight the official path or the shortest route, dim everything else.
- **Accessibility**
  - The canvas has an accessible label and a live region that announces the selection.
  - The side panel's connection list is fully keyboard-driven and moves the graph focus.
  - Keys: `/` search, arrow keys walk neighbours, `Esc` clears focus.
  - A **Table view** tab shows the same data. Target is WCAG 2.2 AA.
- **Below 768px**: the table/list view is the default and the graph is opt-in. All other pages are responsive.

## 7. Seed data (`src/db/seed/`, fictional people only)

**Now (v1, M1):**

- 17 roles, 62 skills, 42 technologies, 283 links, 4 demo people.
- The scenario roles' requirements are fixed exactly:
  - **Frontend Developer**
    - Critical: JavaScript, TypeScript, React, HTML & CSS, Problem Solving
    - Important: Git, Agile, Accessibility, Testing
    - Nice: Next.js, GitHub Copilot
  - **Data Engineer**, **only**:
    - Critical: SQL, Python, Data Modelling, Problem Solving
    - Important: Spark, Databricks, Git
    - Nice: Agile
    - Prerequisites: Databricks builds on Python and Spark; Spark builds on Python.
  - **Project Manager**
    - Critical: Planning & Scheduling, Stakeholder Management, Risk Management, Communication
    - Important: Agile, Azure DevOps
    - No Leadership and no financial skills
  - **Delivery Manager**
    - Critical: Leadership, Financial Management, People Management, Stakeholder Management, Communication
    - Important: Account Management, Commercial Awareness, Risk Management
    - Nice: Agile
  - **Full-stack Developer**: Frontend core + Node.js (I) + REST APIs (I) + SQL (N).

**v2 (M2):**

- **Site**: one, "Demo Site".
- **Practices**:
  - **Frontend Practice**:
    - Frontend Developer, with specialisations **React** (React, Next.js) and **Angular** (Angular, RxJS). Figma Foundation is a Nice-to-have certification in the core.
    - UX Developer
    - Full-stack Developer
  - **Backend & Architecture**: Backend Developer, Solution Architect, Engineering Manager
  - **Data & AI**: Data Engineer, Analytics Engineer, Data Analyst, Data Scientist, AI Engineer
  - **Cloud & Security**: Cloud Engineer, DevOps Engineer, Security Engineer
  - **Delivery Management**: Business Analyst, Project Manager, Scrum Master, Product Owner, Delivery Manager
- **Frontend Developer core**: v1's list without React and Next.js, which move to the React specialisation. Frontend Developer: React therefore has exactly v1's requirements, so Scenario 1 is unchanged.
- **Catalogue re-typed**:
  - v1's technologies become technical skills, with the category "Tool / platform".
  - Soft skills: Problem Solving, Communication, Stakeholder Management, Leadership, People Management, Mentoring, Team Leading, Solutioning, Facilitation, Negotiation, Commercial Awareness, Account Management, Change Management, Product Thinking.
  - The rest of v1's skills stay technical.
- **Certifications**, about 12, with issuers. Examples:
  - Figma Foundation
  - PSM I (Critical for Scrum Master)
  - PSPO I (Product Owner)
  - Azure Fundamentals (AZ-900), Azure Administrator (AZ-104) (Cloud Engineer)
  - Power BI Data Analyst (PL-300) (Data Analyst)
  - Databricks Data Engineer Associate (Analytics Engineer)
  - Kubernetes Administrator (CKA) (DevOps)
  - Terraform Associate
  - PMP (Project Manager, Nice)

  Data Engineer and Delivery Manager get no certifications, so the brief's Scenario 1 and 2 lists stay exact.

- **Demo people**: about 16, at `@example.com`.
  - Jordan Kim: Site Lead.
  - A Practice Lead for each practice.
  - **Morgan Lee**: manager in Frontend Practice. Reports include Alex Rivera (Frontend Developer: React; profile pre-filled from the role) and others.
  - **A Delivery Management manager**. Reports include Sam Patel (Project Manager; pre-filled, plus Jira), a Business Analyst and a Scrum Master (PSM I, expiring soon).

  At least two practices have 5+ members, so the Site Lead's aggregates have data.

- **Examples**: change requests (one open feedback, one approved, one rejected, one proposal for a new specialisation) and recommendations (one open, one accepted), so those screens have data.
- **When it runs**: `pnpm db:seed` runs before every Vercel build, after the migrations, and only adds what's missing.
  - **Production:** it seeds the site, practices and graph once into an empty database, and never adds demo people, requests or recommendations.
  - **Locally and on previews:** it runs in full.
- **Tests that guard the seed**, in `src/db/seed/seed.db.test.ts`:
  - the scenario roles' requirements
  - Scenarios 1 and 2: the brief's **missing** lists exactly
  - type rules, no cycles, no unconnected items
  - every role has a practice and every specialisation a role
  - idempotency

## 8. Milestones (each split into small feature PRs)

| #   | Scope                                                                                                                                               | Done when                                                                                                                                  | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| M0  | Scaffold, public repo, ruleset, CI, Claude workflow config, `pnpm check`, Vercel + Neon link, `docs/PLAN.md`, README                                | A PR auto-merges after passing CI, and its preview deploy loads                                                                            | Done   |
| M1  | Schema v1, migrations, local Postgres in Docker, seed v1, DB tests                                                                                  | `pnpm db:reset && pnpm test:db` passes; seed invariants hold                                                                               | Done   |
| M2  | **Organisation model**: migration `0001` (§3), seed v2 (§7), DB tests                                                                               | Constraints and seed invariants (site, practices, specialisations, the three item types, certifications) pass; production migrates cleanly | To do  |
| M3  | Domain logic (TDD): effective requirements, assess, learning order, compare with profile, readiness, paths, plan, aggregates, change validation     | Scenarios 1 and 2 exact (missing lists and order); ≥90% coverage on `src/domain`                                                           | To do  |
| M4  | Better Auth (Microsoft + demo sign-in), `can()`, app shell with navigation per user type                                                            | Sign in as each demo person; every denial in §1 has a test                                                                                 | To do  |
| M5  | Role browser (with specialisations) and catalogue pages                                                                                             | Search and filters work; role page shows core and specialisations by weight and type, practice, paths                                      | To do  |
| M6  | Employee: onboarding with pre-fill, profile editor (skills, certifications with dates), target, compare two roles with my profile, development plan | End-to-end Scenarios 1 and 2 through the UI                                                                                                | To do  |
| M7  | `/explore` graph (§6), plus a performance test on a synthetic 2k-node / 20k-link graph                                                              | Focus, specialisations, my view and path mode work by mouse and keyboard; overview interactive in under 2s                                 | To do  |
| M8  | Practice Lead: edit roles, specialisations, requirements, paths, drafts, catalogue items; validation, confirmations, audit log                      | A lead edits only their practice; edits show in the graph straight away; audit rows written                                                | To do  |
| M9  | Change requests: feedback and proposals, comments, approve (applies or drafts), reject, needs info, withdraw                                        | End-to-end: manager sends feedback, lead approves, role changes, audit links to the request; a proposal becomes a draft                    | To do  |
| M10 | Manager and Practice Lead people views: team, employee profile, recommendations, succession; practice members and gaps                              | End-to-end Scenario 3 and a recommendation accepted into a plan; privacy tests                                                             | To do  |
| M11 | Site Lead: practices and leads, people and reporting lines, site overview and bench strength, catalogue merge, audit log                            | A Site Lead creates a practice and appoints its lead; aggregates hide groups under 5; no named profiles                                    | To do  |
| M12 | Accessibility (axe on every page, both themes), keyboard pass, README, production deploy plus smoke test                                            | Zero serious or critical axe violations; production works with Microsoft sign-in                                                           | To do  |

## 9. Repo and agent workflow (feature branch → PR → auto-merge)

**Repo**

- `chrizspace/skill-graph`, public. The scaffold was the **only** commit made directly to `main`.

**`scripts/setup-repository.sh`** (idempotent `gh api` + `jq`):

- Repo settings: squash merge only; `allow_auto_merge`, `delete_branch_on_merge` and `allow_update_branch` on.
- **Ruleset on `main`**:
  - pull request required (0 approvals, because you can't approve your own PRs)
  - required status check `ci`, which must be up to date with `main`
  - no force pushes, no deletion, linear history
  - nobody can bypass it
- Secret scanning with push protection and Dependabot security updates turned on. Dependabot version updates run monthly, grouped (fewer PRs), and are **not** auto-merged.

**CI (`.github/workflows/ci.yml`)**

- A public repo gets free GitHub-hosted runners, so minutes aren't a constraint. The full suite runs on every PR.
- Runs on `pull_request` and on pushes to `main`. A newer push to a PR cancels its running checks.
- Jobs:
  - `static`: format, lint, typecheck, unit tests
  - `db`: PGlite tests, plus a check that the migrations match the schema
  - `build`
  - `e2e` (from M4): a Postgres service container, migrate and seed, `next start`, Playwright in Chromium plus axe
  - `ci`: `needs: all`; this is the single required check
- Setup steps: pnpm from `packageManager`, Node from `.nvmrc` (24).

**Local checks**: `scripts/check.mts` runs only what the change touches; `--full` runs everything.

**Claude configuration (committed in the repo)**

- `CLAUDE.md` → `@AGENTS.md` (keeps the Next 16 docs note). It adds the Git workflow, the definition of done, database rules, commands and an architecture map.
- `.claude/hooks/guard-main.mjs`, run as a PreToolUse hook on Bash. It **blocks**:
  - commits, merges and pushes on `main`
  - pushes that target `main`
  - `--force` / `--no-verify`
  - `gh pr merge --admin`
- `.claude/settings.json`: the hook, an allowlist (pnpm, git on feature branches, `gh pr …`, read-only docker) and a denylist (force pushes, pushes to `main`, admin merges, ruleset changes).
- `.claude/skills/feature/SKILL.md` (`/feature <slug>`) and `.claude/skills/ship/SKILL.md` (`/ship`): start a branch from an up-to-date `main`; check, push, open the PR, auto-merge, follow CI, clean up.
- `.github/pull_request_template.md`.

**Manual setup by the repository owner** (accounts and secrets):

1. Vercel project and Neon integration, with preview branches: done.
2. Entra app registration for Microsoft sign-in, with its client ID and secret in Vercel's environment settings (M4). The README will list the steps.

## 10. Risks

- **Have / don't have is coarse**: a profile can't tell a beginner from an expert. That's a deliberate choice: the brief works with weights only. Evidence or endorsements could come later (V2).
- **Profile effort**: specialisations and certifications add work to the profile screens.
  - Mitigation: pre-fill from the role, one-tap ticking, and certification dates only where needed.
- **Privacy (GDPR)**: profiles are personal data.
  - Named profiles are visible only to the person, their manager and the Practice Leads of their practice.
  - The Site Lead sees aggregates only, with groups under 5 hidden.
  - Export and deletion of one's own data come before any real rollout.
- **Stale change requests**: a role can change while a request is open. Approval re-validates every operation and shows what no longer applies.
- **Org data quality**: home practices and reporting lines are entered by hand until the HR import (V2); wrong lines mean wrong visibility. The Site Lead's people screen shows people without a manager or practice.
- **Company sign-in**: the organisation's Entra tenant may block consent to an app registered outside it, which means its IT has to grant admin consent. Fallbacks: personal Microsoft accounts, or demo sign-in.
- **Vercel Hobby is non-commercial**: real rollout needs Pro, or Azure App Service with the same Postgres.
- **Full-graph performance at 20k links**: the UX defaults to focus mode, the WebGL renderer is available, and it gets measured in M7.
- **Seed realism vs exact scenarios**: the Data Engineer's requirement list is deliberately small, and that's documented in the seed.
- **Next 16 changes**: always read the bundled docs before using caching, routing or server action APIs.
- **Auto-merge is sequential**: the next feature branch starts from `main` after the previous PR lands. If CI gets slow, independent work can start on a stacked branch meanwhile.

## 11. How it gets verified

- **Every PR**:
  - `pnpm check` passes locally, then the `ci` check is green, then auto-merge
  - each UI change is checked in the built-in browser at 1280px and 375px in both themes
  - the Vercel preview URL loads with the demo sign-in
- **Scenarios** (unit tests for the logic, Playwright end-to-end for the UI):
  1. Frontend Developer: React → Data Engineer: shared and missing exactly as in the brief, in learning order.
  2. Project Manager → Delivery Manager: missing exactly as in the brief.
  3. A manager opens a report's profile: their fit to their role, official and suggested paths, reachable roles.
  4. A manager sends feedback on a role, the Practice Lead approves it, the role changes and the audit log links to the request. Reject, needs-info and a new-specialisation proposal (becomes a draft) work too.
  5. A Practice Lead edits a role in their practice and is refused for another practice's role.
  6. A manager recommends a target to a report, the report accepts it, and it becomes their target and plan.
  7. An expired certification counts as missing; one expiring within 90 days is flagged.
  8. A Site Lead creates a practice and appoints its Practice Lead.
  9. Privacy:
     - an employee can't open another person's profile
     - a Practice Lead sees only their practice's members
     - a Site Lead sees no names, and small groups are hidden
- **Performance**: a synthetic 2k/20k graph fixture with a measured overview load time and frame rate (M7).
- **Release (M12)**: production deploy on Vercel; smoke test of Microsoft sign-in, the Scenario 1 compare, a graph focus and one approved change request.
