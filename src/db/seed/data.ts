/**
 * Seed data v2: fictional, company-neutral reference data (docs/PLAN.md §7).
 *
 * The requirements of Frontend Developer (core + React), Data Engineer, Full-stack Developer, Project Manager and
 * Delivery Manager are fixed by the brief's scenarios and guarded by src/db/seed/seed.db.test.ts:
 *   Scenario 1: Frontend Developer: React → Data Engineer shares Problem Solving, Git, Agile and misses SQL, Python,
 *               Data Modelling, Spark, Databricks. That's why Data Engineer's list is short and has no certifications.
 *   Scenario 2: Project Manager → Delivery Manager misses Financial Management, Account Management,
 *               Commercial Awareness, Leadership, People Management, and nothing else.
 */

export type CatalogueType = "technical_skill" | "soft_skill" | "certification";
export type Weighted = { critical?: string[]; important?: string[]; nice?: string[] };
export type SeedSpecialization = { name: string; description: string; requires: Weighted };
export type SeedRole = {
  name: string;
  description: string;
  requires: Weighted;
  specializations?: SeedSpecialization[];
};
export type SeedPractice = { name: string; slug: string; description: string; roles: SeedRole[] };
export type SeedItem = {
  name: string;
  category: string;
  description: string;
  tags?: string[];
  issuer?: string;
};

export const site = { name: "Demo Site", slug: "demo" };

/** Line thickness of a requirement, from its weight. */
export const requirementStrength = { critical: 5, important: 3, nice: 2 } as const;

export const practices: SeedPractice[] = [
  {
    name: "Frontend Practice",
    slug: "frontend",
    description: "Web interfaces, design systems and the client side of applications.",
    roles: [
      {
        name: "Frontend Developer",
        description:
          "Builds accessible, responsive web interfaces and the client-side logic behind them. Looks for strong JavaScript and TypeScript, clean HTML and CSS, testing and accessibility, and a team player who solves problems.",
        requires: {
          critical: ["JavaScript", "TypeScript", "HTML & CSS", "Problem Solving"],
          important: ["Git", "Agile", "Accessibility", "Testing"],
          nice: ["GitHub Copilot", "Figma Foundation"],
        },
        specializations: [
          {
            name: "React",
            description: "Frontend work in the React ecosystem, including server rendering with Next.js.",
            requires: { critical: ["React"], nice: ["Next.js"] },
          },
          {
            name: "Angular",
            description: "Frontend work in Angular, with reactive programming in RxJS.",
            requires: { critical: ["Angular"], important: ["RxJS"] },
          },
        ],
      },
      {
        name: "UX Developer",
        description:
          "Bridges design and code: turns research and designs into accessible, consistent interfaces and maintains the design system.",
        requires: {
          critical: ["HTML & CSS", "Accessibility", "UX Design", "Figma", "JavaScript"],
          important: ["Design Systems", "User Research", "TypeScript", "Communication", "Figma Foundation"],
          nice: ["React"],
        },
      },
      {
        name: "Full-stack Developer",
        description: "Works across the user interface, the APIs and the data behind them.",
        requires: {
          critical: ["JavaScript", "TypeScript", "React", "Problem Solving"],
          important: ["Node.js", "REST APIs", "Git", "Agile"],
          nice: ["SQL"],
        },
      },
    ],
  },
  {
    name: "Backend & Architecture",
    slug: "backend-architecture",
    description: "Services, APIs, system design and the people who lead engineering teams.",
    roles: [
      {
        name: "Backend Developer",
        description: "Builds the services, APIs and data access behind applications.",
        requires: {
          critical: ["C#", ".NET", "SQL", "REST APIs", "Problem Solving"],
          important: ["API Design", "Git", "Testing", "Azure", "Docker", "Agile"],
          nice: [
            "Microservices",
            "Azure Functions",
            "Cosmos DB",
            "PostgreSQL",
            "Java",
            "Performance Optimisation",
            "GitHub Copilot",
            "Azure Developer Associate (AZ-204)",
          ],
        },
      },
      {
        name: "Solution Architect",
        description:
          "Shapes end-to-end solutions and the technical decisions behind them, together with the people who need them.",
        requires: {
          critical: [
            "System Design",
            "Cloud Architecture",
            "Solutioning",
            "Stakeholder Management",
            "Communication",
          ],
          important: [
            "Azure",
            "Microservices",
            "Event-driven Architecture",
            "Data Modelling",
            "Identity & Access Management",
            "Azure Solutions Architect Expert (AZ-305)",
          ],
          nice: ["Terraform", "Leadership", "Azure Event Hubs", "Team Leading"],
        },
      },
      {
        name: "Engineering Manager",
        description: "Leads and grows an engineering team while keeping delivery healthy.",
        requires: {
          critical: ["People Management", "Leadership", "Mentoring", "Communication"],
          important: [
            "Agile",
            "Planning & Scheduling",
            "System Design",
            "Stakeholder Management",
            "Team Leading",
            "Coaching",
          ],
          nice: ["Negotiation", "Change Management", "Financial Management"],
        },
      },
    ],
  },
  {
    name: "Data & AI",
    slug: "data-ai",
    description: "Data platforms, analytics, data science and AI applications.",
    roles: [
      {
        name: "Data Engineer",
        description:
          "Designs and runs the pipelines and models that turn raw data into reliable, usable datasets.",
        requires: {
          critical: ["SQL", "Python", "Data Modelling", "Problem Solving"],
          important: ["Spark", "Databricks", "Git"],
          nice: ["Agile"],
        },
      },
      {
        name: "Analytics Engineer",
        description: "Shapes data into tested, documented models that analysts and reports can trust.",
        requires: {
          critical: ["SQL", "Data Modelling", "Microsoft Fabric"],
          important: ["Azure Data Factory", "Data Pipelines", "Power BI", "Git", "Data Quality"],
          nice: [
            "Snowflake",
            "Python",
            "Data Governance",
            "Azure SQL Database",
            "Databricks Certified Data Engineer Associate",
          ],
        },
      },
      {
        name: "Data Analyst",
        description: "Answers business questions with data, reports and dashboards.",
        requires: {
          critical: ["SQL", "Data Visualisation", "Power BI"],
          important: [
            "Excel",
            "Statistics",
            "Data Storytelling",
            "Stakeholder Management",
            "Power BI Data Analyst (PL-300)",
          ],
          nice: ["Python", "Microsoft Fabric"],
        },
      },
      {
        name: "Data Scientist",
        description: "Builds statistical and machine learning models to explain and predict outcomes.",
        requires: {
          critical: ["Python", "Statistics", "Machine Learning"],
          important: ["SQL", "pandas", "scikit-learn", "Experimentation", "Data Storytelling"],
          nice: [
            "Databricks",
            "PyTorch",
            "Deep Learning",
            "MLflow",
            "Azure Data Scientist Associate (DP-100)",
          ],
        },
      },
      {
        name: "AI Engineer",
        description:
          "Builds applications on large language models: retrieval, prompts, evaluation and safe deployment.",
        requires: {
          critical: ["Python", "Prompt Engineering", "Azure OpenAI", "Problem Solving"],
          important: [
            "Retrieval-Augmented Generation",
            "Azure AI Search",
            "REST APIs",
            "Responsible AI",
            "Machine Learning",
            "Azure AI Engineer Associate (AI-102)",
          ],
          nice: ["Semantic Kernel", "Copilot Studio", "MLOps", "Natural Language Processing"],
        },
      },
    ],
  },
  {
    name: "Cloud & Security",
    slug: "cloud-security",
    description: "Cloud platforms, automation, operations and security.",
    roles: [
      {
        name: "Cloud Engineer",
        description: "Builds and runs secure, well-architected cloud platforms.",
        requires: {
          critical: [
            "Azure",
            "Networking",
            "Infrastructure as Code",
            "Identity & Access Management",
            "Azure Administrator Associate (AZ-104)",
          ],
          important: ["Terraform", "Bicep", "Kubernetes", "Monitoring & Observability", "Azure Monitor"],
          nice: ["PowerShell", "Microsoft Entra ID", "Cloud Architecture", "Azure Fundamentals (AZ-900)"],
        },
      },
      {
        name: "DevOps Engineer",
        description: "Automates how software is built, tested, released and operated.",
        requires: {
          critical: ["CI/CD", "Git", "Docker", "Infrastructure as Code"],
          important: [
            "GitHub Actions",
            "Azure DevOps",
            "Kubernetes",
            "Terraform",
            "Monitoring & Observability",
            "Bash",
          ],
          nice: [
            "GitHub",
            "Azure",
            "PowerShell",
            "Certified Kubernetes Administrator (CKA)",
            "Terraform Associate",
          ],
        },
      },
      {
        name: "Security Engineer",
        description:
          "Protects systems and data: designs defences, monitors threats and responds to incidents.",
        requires: {
          critical: [
            "Threat Modelling",
            "Identity & Access Management",
            "Secure Coding",
            "Incident Response",
          ],
          important: [
            "Microsoft Sentinel",
            "Microsoft Defender for Cloud",
            "Networking",
            "Azure",
            "Risk Management",
            "Microsoft Entra ID",
            "Security Operations Analyst Associate (SC-200)",
          ],
          nice: ["Python", "Terraform"],
        },
      },
    ],
  },
  {
    name: "Delivery Management",
    slug: "delivery",
    description: "Analysis, agile delivery, product ownership and delivery leadership.",
    roles: [
      {
        name: "Business Analyst",
        description: "Turns business needs into clear requirements and better processes.",
        requires: {
          critical: [
            "Requirements Engineering",
            "Stakeholder Management",
            "Communication",
            "Process Modelling",
          ],
          important: ["User Stories", "Data Visualisation", "Agile", "Facilitation"],
          nice: ["SQL", "Power Platform", "Power BI", "Figma", "Power BI Data Analyst (PL-300)"],
        },
      },
      {
        name: "Project Manager",
        description: "Plans and steers projects to deliver on scope, time and budget.",
        requires: {
          critical: ["Planning & Scheduling", "Stakeholder Management", "Risk Management", "Communication"],
          important: ["Agile", "Azure DevOps", "Facilitation"],
          nice: ["Jira", "Estimation", "Change Management", "Project Management Professional (PMP)"],
        },
      },
      {
        name: "Scrum Master",
        description:
          "Helps teams work in an agile way: coaches Scrum, removes impediments and facilitates the team's events. Looks for deep Scrum knowledge, coaching and facilitation, and the PSM I certification.",
        requires: {
          critical: ["Scrum", "Agile", "Coaching", "Communication", "Professional Scrum Master I (PSM I)"],
          important: ["Facilitation", "Stakeholder Management", "Azure DevOps"],
          nice: ["Jira", "Estimation", "Change Management"],
        },
        specializations: [
          {
            name: "SAFe",
            description:
              "Scrum Master in a scaled agile setup: release trains, PI planning and cross-team alignment.",
            requires: { critical: ["SAFe"], important: ["PI Planning", "SAFe Scrum Master (SSM)"] },
          },
          {
            name: "Facilitation / Management 3.0",
            description:
              "Scrum Master focused on facilitation and modern leadership practices from Management 3.0.",
            // Facilitation is Important in the core and Critical here: the specialisation's weight wins
            requires: {
              critical: ["Management 3.0 Practices", "Facilitation"],
              important: ["Workshop Design", "Management 3.0 Foundation"],
              nice: ["Liberating Structures"],
            },
          },
        ],
      },
      {
        name: "Product Owner",
        description: "Owns the product backlog and maximises the value the team delivers.",
        requires: {
          critical: ["Backlog Management", "Product Thinking", "Stakeholder Management", "Communication"],
          important: [
            "Agile",
            "User Stories",
            "Estimation",
            "Facilitation",
            "Professional Scrum Product Owner I (PSPO I)",
          ],
          nice: ["Jira", "Data Storytelling", "Figma"],
        },
      },
      {
        name: "Delivery Manager",
        description:
          "Accountable for delivery across projects and teams, including finances and client relationships.",
        requires: {
          critical: [
            "Leadership",
            "Financial Management",
            "People Management",
            "Stakeholder Management",
            "Communication",
          ],
          important: ["Account Management", "Commercial Awareness", "Risk Management"],
          nice: ["Agile"],
        },
      },
    ],
  },
];

const tool = (name: string, area: string, description: string): SeedItem => ({
  name,
  category: "Tool / platform",
  tags: [area],
  description,
});

export const technicalSkills: SeedItem[] = [
  // Engineering
  {
    name: "JavaScript",
    category: "Engineering",
    description: "The language of the web, for interactive front ends and Node.js services.",
  },
  {
    name: "TypeScript",
    category: "Engineering",
    description: "JavaScript with static types, for safer large codebases.",
  },
  {
    name: "HTML & CSS",
    category: "Engineering",
    description: "Structure and styling of web pages, including responsive layouts.",
  },
  {
    name: "Python",
    category: "Engineering",
    description: "General-purpose language and the default choice for data and AI work.",
  },
  {
    name: "C#",
    category: "Engineering",
    description: "Statically typed language for .NET services and applications.",
  },
  {
    name: "Java",
    category: "Engineering",
    description: "Statically typed language for long-lived enterprise services.",
  },
  {
    name: "Testing",
    category: "Engineering",
    description: "Automated tests at unit, integration and end-to-end level.",
  },
  {
    name: "Accessibility",
    category: "Engineering",
    description: "Building products everyone can use, to WCAG standards.",
  },
  { name: "REST APIs", category: "Engineering", description: "Designing and consuming HTTP APIs." },
  {
    name: "API Design",
    category: "Engineering",
    description: "Contract-first APIs: resources, versioning, errors, pagination and security.",
  },
  {
    name: "Performance Optimisation",
    category: "Engineering",
    description: "Measuring and removing bottlenecks in code, queries and infrastructure.",
  },
  {
    name: "UX Design",
    category: "Design",
    description: "Designing flows and interfaces around what users need to get done.",
  },
  {
    name: "User Research",
    category: "Design",
    description: "Interviews, usability tests and analytics to understand users.",
  },
  {
    name: "Design Systems",
    category: "Design",
    description: "Shared components, tokens and guidelines that keep interfaces consistent.",
  },
  // Architecture
  {
    name: "Microservices",
    category: "Architecture",
    description: "Splitting a system into small, independently deployable services.",
  },
  {
    name: "Event-driven Architecture",
    category: "Architecture",
    description: "Systems that communicate through events and messages.",
  },
  {
    name: "System Design",
    category: "Architecture",
    description: "Designing scalable, reliable systems end to end.",
  },
  {
    name: "Cloud Architecture",
    category: "Architecture",
    description: "Designing cloud solutions for reliability, security, cost and performance.",
  },
  // Cloud and security
  { name: "CI/CD", category: "Cloud", description: "Automated build, test and release pipelines." },
  {
    name: "Infrastructure as Code",
    category: "Cloud",
    description: "Defining infrastructure in versioned, reviewable code.",
  },
  {
    name: "Networking",
    category: "Cloud",
    description: "Virtual networks, DNS, routing, private endpoints and firewalls.",
  },
  {
    name: "Monitoring & Observability",
    category: "Cloud",
    description: "Logs, metrics and traces to understand running systems.",
  },
  {
    name: "PowerShell",
    category: "Cloud",
    description: "Scripting and automation, especially for Windows and Azure.",
  },
  { name: "Bash", category: "Cloud", description: "Shell scripting for automation on Linux." },
  {
    name: "Secure Coding",
    category: "Security",
    description: "Writing code that resists common attacks such as the OWASP Top 10.",
  },
  {
    name: "Identity & Access Management",
    category: "Security",
    description: "Authentication, authorisation and least-privilege access.",
  },
  {
    name: "Threat Modelling",
    category: "Security",
    description: "Finding and prioritising security threats in a design.",
  },
  {
    name: "Incident Response",
    category: "Security",
    description: "Detecting, containing and learning from security incidents.",
  },
  // Data and AI
  { name: "SQL", category: "Data", description: "Querying, joining and shaping relational data." },
  {
    name: "Data Modelling",
    category: "Data",
    description: "Designing schemas: dimensional models, normalisation and data vault.",
  },
  {
    name: "Data Visualisation",
    category: "Data",
    description: "Charts and dashboards that make data easy to read.",
  },
  {
    name: "Data Storytelling",
    category: "Data",
    description: "Turning analysis into a clear narrative for decision makers.",
  },
  { name: "Statistics", category: "Data", description: "Distributions, inference and uncertainty." },
  {
    name: "Data Pipelines",
    category: "Data",
    description: "Extracting, transforming and loading data reliably and repeatably.",
  },
  {
    name: "Data Governance",
    category: "Data",
    description: "Ownership, lineage, cataloguing and protection of data.",
  },
  {
    name: "Data Quality",
    category: "Data",
    description: "Testing and monitoring data for completeness, accuracy and freshness.",
  },
  {
    name: "Experimentation",
    category: "Data",
    description: "A/B tests and other ways to measure cause and effect.",
  },
  {
    name: "Machine Learning",
    category: "AI",
    description: "Training and evaluating models that learn from data.",
  },
  {
    name: "Deep Learning",
    category: "AI",
    description: "Neural networks for vision, language and other complex data.",
  },
  {
    name: "MLOps",
    category: "AI",
    description: "Deploying, monitoring and retraining models in production.",
  },
  {
    name: "Prompt Engineering",
    category: "AI",
    description: "Designing and testing prompts that get reliable results from language models.",
  },
  {
    name: "Responsible AI",
    category: "AI",
    description: "Fairness, transparency, safety and compliance of AI systems.",
  },
  {
    name: "Natural Language Processing",
    category: "AI",
    description: "Understanding and generating human language with models.",
  },
  {
    name: "Retrieval-Augmented Generation",
    category: "AI",
    description: "Grounding language model answers in your own documents and data.",
  },
  // Business and delivery
  {
    name: "Requirements Engineering",
    category: "Business",
    description: "Eliciting, documenting and validating what a solution must do.",
  },
  {
    name: "Process Modelling",
    category: "Business",
    description: "Mapping and improving business processes, for example with BPMN.",
  },
  {
    name: "User Stories",
    category: "Business",
    description: "Small, testable descriptions of value from the user's point of view.",
  },
  {
    name: "Backlog Management",
    category: "Business",
    description: "Ordering and refining work so the most valuable items come first.",
  },
  {
    name: "Planning & Scheduling",
    category: "Delivery",
    description: "Breaking work into a realistic plan and keeping it current.",
  },
  {
    name: "Risk Management",
    category: "Delivery",
    description: "Identifying, assessing and mitigating risks.",
  },
  { name: "Estimation", category: "Delivery", description: "Sizing work and forecasting delivery." },
  {
    name: "Financial Management",
    category: "Delivery",
    description: "Budgets, forecasts, margins and financial reporting for engagements.",
  },
  // Ways of working
  {
    name: "Agile",
    category: "Ways of working",
    description: "Iterative delivery with agile values and practices.",
  },
  {
    name: "Scrum",
    category: "Ways of working",
    description: "The Scrum framework: roles, events, artefacts and empiricism.",
  },
  {
    name: "SAFe",
    category: "Ways of working",
    description: "The Scaled Agile Framework for many teams on one release train.",
  },
  {
    name: "PI Planning",
    category: "Ways of working",
    description: "Planning a programme increment across the teams of a release train.",
  },
  {
    name: "Management 3.0 Practices",
    category: "Ways of working",
    description: "Delegation boards, moving motivators and other modern leadership practices.",
  },
  {
    name: "Workshop Design",
    category: "Ways of working",
    description: "Designing workshops and team events that reach their goal.",
  },
  {
    name: "Liberating Structures",
    category: "Ways of working",
    description: "Simple facilitation patterns that include everyone in a conversation.",
  },
  // Tools and platforms
  tool("React", "engineering", "Component-based library for building user interfaces."),
  tool("Next.js", "engineering", "React framework for server-rendered and static web applications."),
  tool("Angular", "engineering", "TypeScript framework for large web applications."),
  tool("RxJS", "engineering", "Reactive programming with observables, used throughout Angular."),
  tool("Node.js", "engineering", "JavaScript runtime for servers and tooling."),
  tool(".NET", "engineering", "Microsoft's platform for building services and applications."),
  tool("Git", "engineering", "Distributed version control."),
  tool("GitHub", "engineering", "Hosting, pull requests and collaboration around Git repositories."),
  tool("GitHub Actions", "cloud", "CI/CD workflows built into GitHub."),
  tool("GitHub Copilot", "ai", "AI pair programmer in the editor and on GitHub."),
  tool("Azure DevOps", "delivery", "Boards, repos and pipelines for planning and shipping software."),
  tool("Jira", "delivery", "Issue and project tracking."),
  tool("Figma", "design", "Collaborative interface design and prototyping."),
  tool("Docker", "cloud", "Packaging applications into portable containers."),
  tool("Kubernetes", "cloud", "Orchestrating containers at scale."),
  tool("Terraform", "cloud", "Infrastructure as code across many cloud providers."),
  tool("Bicep", "cloud", "Azure-native language for infrastructure as code."),
  tool("Azure", "cloud", "Microsoft's cloud platform."),
  tool("Azure Functions", "cloud", "Serverless functions that run on events."),
  tool("Azure Monitor", "cloud", "Metrics, logs and alerts for Azure resources and applications."),
  tool("Azure Event Hubs", "cloud", "Event streaming service for high-volume data ingestion."),
  tool("Microsoft Entra ID", "security", "Identity and access management for Microsoft cloud services."),
  tool("Microsoft Sentinel", "security", "Cloud SIEM for detecting and investigating threats."),
  tool(
    "Microsoft Defender for Cloud",
    "security",
    "Security posture management and threat protection for cloud workloads.",
  ),
  tool("Azure SQL Database", "data", "Managed SQL Server database in Azure."),
  tool("Cosmos DB", "data", "Globally distributed NoSQL database in Azure."),
  tool("PostgreSQL", "data", "Open-source relational database."),
  tool("Spark", "data", "Distributed engine for large-scale data processing."),
  tool(
    "Databricks",
    "data",
    "Lakehouse platform for data engineering, analytics and machine learning on Spark.",
  ),
  tool(
    "Microsoft Fabric",
    "data",
    "End-to-end analytics platform: lakehouse, pipelines, warehousing and Power BI.",
  ),
  tool("Azure Data Factory", "data", "Cloud service for orchestrating data movement and transformation."),
  tool("Power BI", "data", "Business intelligence: reports, dashboards and semantic models."),
  tool("Snowflake", "data", "Cloud data warehouse."),
  tool("Excel", "data", "Spreadsheets for analysis, modelling and quick reporting."),
  tool("pandas", "data", "Python library for working with tabular data."),
  tool("Azure OpenAI", "ai", "OpenAI language models hosted in Azure."),
  tool("Azure AI Search", "ai", "Search service with vector and hybrid retrieval for AI applications."),
  tool("Copilot Studio", "ai", "Low-code tool for building copilots and agents."),
  tool("Semantic Kernel", "ai", "SDK for orchestrating language models, plugins and memory in code."),
  tool("scikit-learn", "ai", "Python library for classical machine learning."),
  tool("PyTorch", "ai", "Deep learning framework."),
  tool("MLflow", "ai", "Tracking, packaging and deploying machine learning models."),
  tool("Power Platform", "business", "Low-code apps, automation and agents: Power Apps and Power Automate."),
];

export const softSkills: SeedItem[] = [
  {
    name: "Problem Solving",
    category: "Thinking",
    description: "Breaking problems down and finding workable solutions.",
  },
  {
    name: "Solutioning",
    category: "Thinking",
    description: "Shaping a workable solution from a fuzzy need, with its trade-offs.",
  },
  {
    name: "Product Thinking",
    category: "Thinking",
    description: "Understanding users, outcomes and trade-offs behind a product.",
  },
  {
    name: "Communication",
    category: "Collaboration",
    description: "Clear writing, speaking and listening for different audiences.",
  },
  {
    name: "Stakeholder Management",
    category: "Collaboration",
    description: "Understanding and aligning the people who influence or are affected by the work.",
  },
  {
    name: "Facilitation",
    category: "Collaboration",
    description: "Running workshops and meetings that reach decisions.",
  },
  {
    name: "Negotiation",
    category: "Collaboration",
    description: "Reaching agreements that work for both sides.",
  },
  {
    name: "Leadership",
    category: "Leadership",
    description: "Setting direction and helping people do their best work.",
  },
  {
    name: "Team Leading",
    category: "Leadership",
    description: "Guiding a team day to day: priorities, decisions and unblocking.",
  },
  {
    name: "People Management",
    category: "Leadership",
    description: "Hiring, developing and supporting the people in a team.",
  },
  {
    name: "Mentoring",
    category: "Leadership",
    description: "Sharing experience to help someone grow in their career.",
  },
  {
    name: "Coaching",
    category: "Leadership",
    description: "Helping people and teams find their own answers through questions and feedback.",
  },
  {
    name: "Change Management",
    category: "Leadership",
    description: "Helping people and organisations adopt new ways of working.",
  },
  {
    name: "Account Management",
    category: "Commercial",
    description: "Growing long-term client relationships and the work within them.",
  },
  {
    name: "Commercial Awareness",
    category: "Commercial",
    description: "Understanding how deals, pricing and contracts create value.",
  },
];

export const certifications: SeedItem[] = [
  {
    name: "Figma Foundation",
    issuer: "Figma",
    category: "Design",
    description: "Foundations of interface design in Figma.",
  },
  {
    name: "Professional Scrum Master I (PSM I)",
    issuer: "Scrum.org",
    category: "Agile",
    description: "Scrum theory, the Scrum Master accountability and servant leadership.",
  },
  {
    name: "Professional Scrum Product Owner I (PSPO I)",
    issuer: "Scrum.org",
    category: "Agile",
    description: "Maximising product value as a Product Owner in Scrum.",
  },
  {
    name: "SAFe Scrum Master (SSM)",
    issuer: "Scaled Agile",
    category: "Agile",
    description: "The Scrum Master role in a SAFe enterprise. Renewed yearly.",
  },
  {
    name: "Management 3.0 Foundation",
    issuer: "Management 3.0",
    category: "Agile",
    description: "Modern leadership practices for agile organisations.",
  },
  {
    name: "Project Management Professional (PMP)",
    issuer: "PMI",
    category: "Delivery",
    description: "Predictive, agile and hybrid project management. Renewed every three years.",
  },
  {
    name: "Azure Fundamentals (AZ-900)",
    issuer: "Microsoft",
    category: "Cloud",
    description: "Cloud concepts and core Azure services.",
  },
  {
    name: "Azure Administrator Associate (AZ-104)",
    issuer: "Microsoft",
    category: "Cloud",
    description: "Implementing and managing Azure infrastructure. Renewed yearly.",
  },
  {
    name: "Azure Developer Associate (AZ-204)",
    issuer: "Microsoft",
    category: "Engineering",
    description: "Building cloud applications and services on Azure. Renewed yearly.",
  },
  {
    name: "Azure Solutions Architect Expert (AZ-305)",
    issuer: "Microsoft",
    category: "Architecture",
    description: "Designing infrastructure, data and application solutions on Azure. Renewed yearly.",
  },
  {
    name: "Power BI Data Analyst (PL-300)",
    issuer: "Microsoft",
    category: "Data",
    description: "Modelling, visualising and analysing data with Power BI. Renewed yearly.",
  },
  {
    name: "Azure AI Engineer Associate (AI-102)",
    issuer: "Microsoft",
    category: "AI",
    description: "Building AI solutions with Azure AI services. Renewed yearly.",
  },
  {
    name: "Azure Data Scientist Associate (DP-100)",
    issuer: "Microsoft",
    category: "AI",
    description: "Training and deploying machine learning models on Azure. Renewed yearly.",
  },
  {
    name: "Security Operations Analyst Associate (SC-200)",
    issuer: "Microsoft",
    category: "Security",
    description: "Detecting and responding to threats with Microsoft security tools. Renewed yearly.",
  },
  {
    name: "Databricks Certified Data Engineer Associate",
    issuer: "Databricks",
    category: "Data",
    description: "Building data pipelines on the Databricks platform. Renewed every two years.",
  },
  {
    name: "Certified Kubernetes Administrator (CKA)",
    issuer: "CNCF",
    category: "Cloud",
    description: "Installing, configuring and running Kubernetes clusters. Valid for two years.",
  },
  {
    name: "Terraform Associate",
    issuer: "HashiCorp",
    category: "Cloud",
    description: "Infrastructure as code with Terraform. Valid for two years.",
  },
];

/** [item, what it builds on, strength 1–5]: "Databricks builds on Spark". Certifications build on what they test. */
export const buildsOn: [string, string, number][] = [
  ["TypeScript", "JavaScript", 5],
  ["React", "JavaScript", 5],
  ["Next.js", "React", 5],
  ["Angular", "TypeScript", 4],
  ["RxJS", "JavaScript", 3],
  ["Node.js", "JavaScript", 4],
  [".NET", "C#", 5],
  ["Databricks", "Spark", 5],
  ["Databricks", "Python", 4],
  ["Spark", "Python", 3],
  ["Spark", "SQL", 3],
  ["Data Modelling", "SQL", 3],
  ["Microsoft Fabric", "SQL", 3],
  ["Power BI", "Data Visualisation", 3],
  ["Azure Data Factory", "Data Pipelines", 4],
  ["Data Pipelines", "SQL", 3],
  ["Snowflake", "SQL", 3],
  ["Azure SQL Database", "SQL", 4],
  ["PostgreSQL", "SQL", 4],
  ["Cosmos DB", "Azure", 3],
  ["Kubernetes", "Docker", 5],
  ["Terraform", "Infrastructure as Code", 4],
  ["Bicep", "Infrastructure as Code", 4],
  ["Bicep", "Azure", 3],
  ["GitHub", "Git", 4],
  ["GitHub Actions", "CI/CD", 4],
  ["GitHub Actions", "Git", 3],
  ["Azure DevOps", "Git", 3],
  ["Machine Learning", "Statistics", 4],
  ["Machine Learning", "Python", 3],
  ["Deep Learning", "Machine Learning", 5],
  ["scikit-learn", "Machine Learning", 4],
  ["PyTorch", "Deep Learning", 4],
  ["pandas", "Python", 5],
  ["MLOps", "Machine Learning", 4],
  ["MLflow", "MLOps", 4],
  ["Retrieval-Augmented Generation", "Prompt Engineering", 3],
  ["Semantic Kernel", "Azure OpenAI", 3],
  ["Azure OpenAI", "Azure", 3],
  ["Azure AI Search", "Azure", 3],
  ["Copilot Studio", "Power Platform", 4],
  ["Microsoft Sentinel", "Azure", 3],
  ["Microsoft Defender for Cloud", "Azure", 3],
  ["Azure Functions", "Azure", 4],
  ["Azure Monitor", "Monitoring & Observability", 3],
  ["API Design", "REST APIs", 4],
  ["Microservices", "API Design", 3],
  ["Event-driven Architecture", "Microservices", 3],
  ["Cloud Architecture", "System Design", 4],
  ["Cloud Architecture", "Networking", 3],
  ["Solutioning", "Problem Solving", 3],
  ["People Management", "Leadership", 4],
  ["Team Leading", "Leadership", 3],
  ["Mentoring", "Communication", 3],
  ["Coaching", "Communication", 3],
  ["Account Management", "Stakeholder Management", 4],
  ["Commercial Awareness", "Financial Management", 3],
  ["Data Storytelling", "Data Visualisation", 4],
  ["User Stories", "Requirements Engineering", 3],
  ["Backlog Management", "User Stories", 3],
  ["Design Systems", "UX Design", 4],
  ["Scrum", "Agile", 5],
  ["SAFe", "Scrum", 4],
  ["PI Planning", "SAFe", 5],
  ["Management 3.0 Practices", "Agile", 3],
  ["Workshop Design", "Facilitation", 4],
  ["Liberating Structures", "Facilitation", 3],
  // certifications build on what they test
  ["Figma Foundation", "Figma", 4],
  ["Professional Scrum Master I (PSM I)", "Scrum", 5],
  ["Professional Scrum Product Owner I (PSPO I)", "Backlog Management", 4],
  ["SAFe Scrum Master (SSM)", "SAFe", 5],
  ["Management 3.0 Foundation", "Management 3.0 Practices", 5],
  ["Project Management Professional (PMP)", "Planning & Scheduling", 4],
  ["Azure Fundamentals (AZ-900)", "Azure", 3],
  ["Azure Administrator Associate (AZ-104)", "Azure", 5],
  ["Azure Developer Associate (AZ-204)", "Azure", 4],
  ["Azure Solutions Architect Expert (AZ-305)", "Cloud Architecture", 5],
  ["Power BI Data Analyst (PL-300)", "Power BI", 5],
  ["Azure AI Engineer Associate (AI-102)", "Azure OpenAI", 4],
  ["Azure Data Scientist Associate (DP-100)", "Machine Learning", 4],
  ["Security Operations Analyst Associate (SC-200)", "Microsoft Sentinel", 4],
  ["Databricks Certified Data Engineer Associate", "Databricks", 5],
  ["Certified Kubernetes Administrator (CKA)", "Kubernetes", 5],
  ["Terraform Associate", "Terraform", 5],
];

/** [a, b, strength]: undirected "goes well with / alternative to". */
export const relatedTo: [string, string, number][] = [
  ["React", "Angular", 2],
  ["Databricks", "Microsoft Fabric", 3],
  ["Databricks", "Snowflake", 3],
  ["Terraform", "Bicep", 4],
  ["GitHub Actions", "Azure DevOps", 4],
  ["Power BI", "Microsoft Fabric", 4],
  ["PostgreSQL", "Azure SQL Database", 3],
  ["Jira", "Azure DevOps", 3],
  ["GitHub Copilot", "Prompt Engineering", 2],
  ["Leadership", "Communication", 3],
  ["Product Thinking", "Requirements Engineering", 2],
  ["Risk Management", "Threat Modelling", 2],
  ["Data Governance", "Data Quality", 4],
  ["Responsible AI", "Data Governance", 2],
  ["Microsoft Entra ID", "Identity & Access Management", 4],
  ["Figma", "UX Design", 4],
  ["Coaching", "Mentoring", 3],
];

/** Official paths: [from role, to role, strength, description, typical months]. */
export const nextSteps: [string, string, number, string?, number?][] = [
  ["Frontend Developer", "Full-stack Developer", 4, "Add Node.js and REST APIs to your frontend core.", 12],
  ["Frontend Developer", "UX Developer", 2],
  ["UX Developer", "Frontend Developer", 3],
  ["Backend Developer", "Full-stack Developer", 3],
  ["Backend Developer", "Data Engineer", 3],
  ["Backend Developer", "DevOps Engineer", 2],
  ["Data Analyst", "Analytics Engineer", 4],
  ["Data Analyst", "Data Engineer", 3],
  ["Analytics Engineer", "Data Engineer", 4],
  ["Data Engineer", "AI Engineer", 4, "Build on Python and data pipelines to work with language models.", 12],
  ["Data Engineer", "Solution Architect", 3],
  ["Data Scientist", "AI Engineer", 4],
  ["Full-stack Developer", "Solution Architect", 3],
  ["Full-stack Developer", "Engineering Manager", 2],
  ["DevOps Engineer", "Cloud Engineer", 4],
  ["Cloud Engineer", "Solution Architect", 4],
  ["Cloud Engineer", "Security Engineer", 2],
  ["Business Analyst", "Project Manager", 3],
  ["Business Analyst", "Product Owner", 4],
  ["Scrum Master", "Product Owner", 3],
  ["Scrum Master", "Project Manager", 3],
  ["Project Manager", "Delivery Manager", 5, "Usually after leading two or more projects end to end.", 24],
  ["Solution Architect", "Engineering Manager", 2],
];

/** A certification someone holds, with dates relative to the seed date (in days). */
export type HeldCertification = { name: string; obtainedDaysAgo: number; expiresInDays: number | null };

export type SeedPerson = {
  id: string;
  name: string;
  email: string;
  practice: string; // practice slug (home practice)
  role: string;
  specialization?: string;
  manager?: string; // person id
  siteLead?: boolean;
  leads?: string[]; // practice slugs
  /** Profiles are pre-filled from the role's skill requirements; these adjust it. */
  lacks?: string[];
  extras?: string[];
  certifications?: HeldCertification[];
  target?: { role: string; specialization?: string };
};

/** Fictional demo people (example.com addresses). Seeded everywhere except production. */
export const people: SeedPerson[] = [
  // site and practice leads
  {
    id: "seed-jordan",
    name: "Jordan Kim",
    email: "jordan.kim@example.com",
    practice: "backend-architecture",
    role: "Solution Architect",
    siteLead: true,
    certifications: [
      { name: "Azure Solutions Architect Expert (AZ-305)", obtainedDaysAgo: 400, expiresInDays: 330 },
    ],
  },
  {
    id: "seed-taylor",
    name: "Taylor Brooks",
    email: "taylor.brooks@example.com",
    practice: "frontend",
    role: "Frontend Developer",
    specialization: "React",
    leads: ["frontend"],
  },
  {
    id: "seed-robin",
    name: "Robin Weiss",
    email: "robin.weiss@example.com",
    practice: "backend-architecture",
    role: "Solution Architect",
    leads: ["backend-architecture"],
  },
  {
    id: "seed-avery",
    name: "Avery Chen",
    email: "avery.chen@example.com",
    practice: "data-ai",
    role: "Data Engineer",
    leads: ["data-ai"],
    certifications: [
      { name: "Databricks Certified Data Engineer Associate", obtainedDaysAgo: 500, expiresInDays: 230 },
    ],
  },
  {
    id: "seed-jamie",
    name: "Jamie Ortiz",
    email: "jamie.ortiz@example.com",
    practice: "cloud-security",
    role: "Cloud Engineer",
    leads: ["cloud-security"],
    certifications: [
      { name: "Azure Fundamentals (AZ-900)", obtainedDaysAgo: 1100, expiresInDays: null },
      { name: "Azure Administrator Associate (AZ-104)", obtainedDaysAgo: 245, expiresInDays: 120 },
    ],
  },
  {
    id: "seed-casey",
    name: "Casey Lin",
    email: "casey.lin@example.com",
    practice: "delivery",
    role: "Delivery Manager",
    leads: ["delivery"],
  },
  // Frontend Practice: Morgan's team
  {
    id: "seed-morgan",
    name: "Morgan Lee",
    email: "morgan.lee@example.com",
    practice: "frontend",
    role: "Engineering Manager",
  },
  {
    id: "seed-alex",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    practice: "frontend",
    role: "Frontend Developer",
    specialization: "React",
    manager: "seed-morgan",
  },
  {
    id: "seed-noah",
    name: "Noah Fischer",
    email: "noah.fischer@example.com",
    practice: "frontend",
    role: "Frontend Developer",
    specialization: "Angular",
    manager: "seed-morgan",
    lacks: ["Testing"],
  },
  {
    id: "seed-mia",
    name: "Mia Kowalski",
    email: "mia.kowalski@example.com",
    practice: "frontend",
    role: "UX Developer",
    manager: "seed-morgan",
    certifications: [{ name: "Figma Foundation", obtainedDaysAgo: 300, expiresInDays: null }],
  },
  {
    id: "seed-leo",
    name: "Leo Martins",
    email: "leo.martins@example.com",
    practice: "frontend",
    role: "Full-stack Developer",
    manager: "seed-morgan",
    extras: ["Docker", "PostgreSQL"],
  },
  {
    id: "seed-zoe",
    name: "Zoe Adler",
    email: "zoe.adler@example.com",
    practice: "frontend",
    role: "Frontend Developer",
    specialization: "React",
    manager: "seed-morgan",
    lacks: ["Accessibility"],
    target: { role: "Full-stack Developer" },
  },
  // Delivery Management: Riley's team
  {
    id: "seed-riley",
    name: "Riley Nowak",
    email: "riley.nowak@example.com",
    practice: "delivery",
    role: "Delivery Manager",
  },
  {
    id: "seed-sam",
    name: "Sam Patel",
    email: "sam.patel@example.com",
    practice: "delivery",
    role: "Project Manager",
    manager: "seed-riley",
  },
  {
    id: "seed-ella",
    name: "Ella Jensen",
    email: "ella.jensen@example.com",
    practice: "delivery",
    role: "Business Analyst",
    manager: "seed-riley",
    certifications: [{ name: "Power BI Data Analyst (PL-300)", obtainedDaysAgo: 800, expiresInDays: -70 }],
  },
  {
    id: "seed-omar",
    name: "Omar Haddad",
    email: "omar.haddad@example.com",
    practice: "delivery",
    role: "Scrum Master",
    specialization: "SAFe",
    manager: "seed-riley",
    certifications: [
      { name: "Professional Scrum Master I (PSM I)", obtainedDaysAgo: 900, expiresInDays: null },
      { name: "SAFe Scrum Master (SSM)", obtainedDaysAgo: 330, expiresInDays: 35 },
    ],
  },
  {
    id: "seed-lena",
    name: "Lena Hoffmann",
    email: "lena.hoffmann@example.com",
    practice: "delivery",
    role: "Product Owner",
    manager: "seed-riley",
    certifications: [
      { name: "Professional Scrum Product Owner I (PSPO I)", obtainedDaysAgo: 600, expiresInDays: null },
    ],
  },
  {
    id: "seed-ben",
    name: "Ben Carter",
    email: "ben.carter@example.com",
    practice: "delivery",
    role: "Scrum Master",
    manager: "seed-riley",
    certifications: [
      { name: "Professional Scrum Master I (PSM I)", obtainedDaysAgo: 200, expiresInDays: null },
    ],
    target: { role: "Scrum Master", specialization: "Facilitation / Management 3.0" },
  },
];

/** Example recommendations: [id, from, to, role or item, specialisation (for a target), comment, status]. */
export const seedRecommendations: {
  id: string;
  author: string;
  person: string;
  target: string;
  specialization?: string;
  comment: string;
  status: "open" | "accepted" | "declined";
}[] = [
  {
    id: "00000000-0000-4000-8000-000000000101",
    author: "seed-morgan",
    person: "seed-alex",
    target: "Full-stack Developer",
    comment: "You already cover most of it: Node.js and REST APIs are the gap.",
    status: "open",
  },
  {
    id: "00000000-0000-4000-8000-000000000102",
    author: "seed-morgan",
    person: "seed-zoe",
    target: "Accessibility",
    comment: "It's Important for your role and our clients ask for it.",
    status: "accepted",
  },
  {
    id: "00000000-0000-4000-8000-000000000103",
    author: "seed-riley",
    person: "seed-ben",
    target: "Scrum Master",
    specialization: "Facilitation / Management 3.0",
    comment: "Your retrospectives are great: Management 3.0 would build on that.",
    status: "accepted",
  },
  {
    id: "00000000-0000-4000-8000-000000000104",
    author: "seed-riley",
    person: "seed-sam",
    target: "Project Management Professional (PMP)",
    comment: "Worth it before you move towards Delivery Manager.",
    status: "open",
  },
];

/** Operations as in src/domain/change-requests.ts, but naming items instead of ids (the seed resolves them). */
export type SeedChange =
  | {
      op: "add_requirement";
      item?: string;
      newItem?: { name: string; type: CatalogueType };
      priority: "critical" | "important" | "nice";
      note?: string;
    }
  | { op: "update_requirement"; item: string; priority?: "critical" | "important" | "nice"; note?: string }
  | { op: "remove_requirement"; item: string }
  | { op: "propose_specialization"; name: string; description: string };

export const seedChangeRequests: {
  id: string;
  practice: string;
  role: string;
  author: string;
  reason: string;
  changes: SeedChange[];
  status: "open" | "needs_info" | "approved" | "rejected";
  decidedBy?: string;
  decisionNote?: string;
  comments?: { author: string; body: string }[];
}[] = [
  {
    id: "00000000-0000-4000-8000-000000000201",
    practice: "frontend",
    role: "Frontend Developer",
    author: "seed-morgan",
    reason: "Every project now has end-to-end tests in Playwright; new joiners need it from day one.",
    changes: [
      {
        op: "add_requirement",
        newItem: { name: "Playwright", type: "technical_skill" },
        priority: "important",
      },
    ],
    status: "open",
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    practice: "frontend",
    role: "Frontend Developer",
    author: "seed-morgan",
    reason: "Accessibility work is mostly done by UX Developers in my team.",
    changes: [{ op: "remove_requirement", item: "Accessibility" }],
    status: "rejected",
    decidedBy: "seed-taylor",
    decisionNote:
      "Accessibility stays Important: every frontend change has to meet WCAG, not only the UX work.",
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    practice: "delivery",
    role: "Scrum Master",
    author: "seed-riley",
    reason: "Our Scrum Masters use Azure DevOps; Jira matters only for a few clients.",
    changes: [{ op: "update_requirement", item: "Jira", priority: "nice" }],
    status: "approved",
    decidedBy: "seed-casey",
    decisionNote: "Agreed, moved Jira to Nice to have.",
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    practice: "delivery",
    role: "Scrum Master",
    author: "seed-riley",
    reason: "Two of our teams run Kanban rather than Scrum; their Scrum Masters need a different focus.",
    changes: [
      {
        op: "propose_specialization",
        name: "Kanban",
        description:
          "Scrum Master for teams that run Kanban: flow metrics, WIP limits and service delivery reviews.",
      },
    ],
    status: "needs_info",
    comments: [
      {
        author: "seed-casey",
        body: "Which teams, and would they keep Sprints at all? That decides if it's a specialisation or a separate role.",
      },
    ],
  },
];
