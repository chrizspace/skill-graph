/**
 * Seed graph: fictional, company-neutral reference data (docs/PLAN.md §6).
 *
 * The requirements of Frontend Developer, Data Engineer, Full-stack Developer, Project Manager and Delivery Manager
 * are fixed by the brief's scenarios and guarded by src/db/seed/seed.db.test.ts. Change them only together with the
 * scenarios:
 *   Scenario 1: Frontend Developer → Data Engineer shares Problem Solving, Git, Agile and misses SQL, Python,
 *               Data Modelling, Spark, Databricks. That's why Data Engineer's list is deliberately short.
 *   Scenario 2: Project Manager → Delivery Manager misses Financial Management, Account Management,
 *               Commercial Awareness, Leadership, People Management (and nothing else).
 */

export type SeedNode = { name: string; category: string; description: string };
export type Requirements = { critical: string[]; important: string[]; nice: string[] };

export const roles: (SeedNode & { requires: Requirements })[] = [
  {
    name: "Frontend Developer",
    category: "Engineering",
    description: "Builds accessible, responsive web interfaces and the client-side logic behind them.",
    requires: {
      critical: ["JavaScript", "TypeScript", "React", "HTML & CSS", "Problem Solving"],
      important: ["Git", "Agile", "Accessibility", "Testing"],
      nice: ["Next.js", "GitHub Copilot"],
    },
  },
  {
    name: "Backend Developer",
    category: "Engineering",
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
      ],
    },
  },
  {
    name: "Full-stack Developer",
    category: "Engineering",
    description: "Works across the user interface, the APIs and the data behind them.",
    requires: {
      critical: ["JavaScript", "TypeScript", "React", "Problem Solving"],
      important: ["Node.js", "REST APIs", "Git", "Agile"],
      nice: ["SQL"],
    },
  },
  {
    name: "Data Engineer",
    category: "Data",
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
    category: "Data",
    description: "Shapes data into tested, documented models that analysts and reports can trust.",
    requires: {
      critical: ["SQL", "Data Modelling", "Microsoft Fabric"],
      important: ["Azure Data Factory", "Data Pipelines", "Power BI", "Git", "Data Quality"],
      nice: ["Snowflake", "Python", "Data Governance", "Azure SQL Database"],
    },
  },
  {
    name: "Data Analyst",
    category: "Data",
    description: "Answers business questions with data, reports and dashboards.",
    requires: {
      critical: ["SQL", "Data Visualisation", "Power BI"],
      important: ["Excel", "Statistics", "Data Storytelling", "Stakeholder Management"],
      nice: ["Python", "Microsoft Fabric"],
    },
  },
  {
    name: "Data Scientist",
    category: "Data",
    description: "Builds statistical and machine learning models to explain and predict outcomes.",
    requires: {
      critical: ["Python", "Statistics", "Machine Learning"],
      important: ["SQL", "pandas", "scikit-learn", "Experimentation", "Data Storytelling"],
      nice: ["Databricks", "PyTorch", "Deep Learning", "MLflow"],
    },
  },
  {
    name: "AI Engineer",
    category: "AI",
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
      ],
      nice: ["Semantic Kernel", "Copilot Studio", "MLOps", "Natural Language Processing"],
    },
  },
  {
    name: "Cloud Engineer",
    category: "Cloud",
    description: "Builds and runs secure, well-architected cloud platforms.",
    requires: {
      critical: ["Azure", "Networking", "Infrastructure as Code", "Identity & Access Management"],
      important: ["Terraform", "Bicep", "Kubernetes", "Monitoring & Observability", "Azure Monitor"],
      nice: ["PowerShell", "Microsoft Entra ID", "Cloud Architecture"],
    },
  },
  {
    name: "DevOps Engineer",
    category: "Cloud",
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
      nice: ["GitHub", "Azure", "PowerShell"],
    },
  },
  {
    name: "Security Engineer",
    category: "Security",
    description: "Protects systems and data: designs defences, monitors threats and responds to incidents.",
    requires: {
      critical: ["Threat Modelling", "Identity & Access Management", "Secure Coding", "Incident Response"],
      important: [
        "Microsoft Sentinel",
        "Microsoft Defender for Cloud",
        "Networking",
        "Azure",
        "Risk Management",
        "Microsoft Entra ID",
      ],
      nice: ["Python", "Terraform"],
    },
  },
  {
    name: "Solution Architect",
    category: "Architecture",
    description:
      "Shapes end-to-end solutions and the technical decisions behind them, with the people who need them.",
    requires: {
      critical: ["System Design", "Cloud Architecture", "Stakeholder Management", "Communication"],
      important: [
        "Azure",
        "Microservices",
        "Event-driven Architecture",
        "Data Modelling",
        "Identity & Access Management",
      ],
      nice: ["Terraform", "Leadership", "Azure Event Hubs"],
    },
  },
  {
    name: "Business Analyst",
    category: "Business",
    description: "Turns business needs into clear requirements and better processes.",
    requires: {
      critical: ["Requirements Engineering", "Stakeholder Management", "Communication", "Process Modelling"],
      important: ["User Stories", "Data Visualisation", "Agile", "Facilitation"],
      nice: ["SQL", "Power Platform", "Power BI", "Figma"],
    },
  },
  {
    name: "Product Owner",
    category: "Business",
    description: "Owns the product backlog and maximises the value the team delivers.",
    requires: {
      critical: ["Backlog Management", "Product Thinking", "Stakeholder Management", "Communication"],
      important: ["Agile", "User Stories", "Estimation", "Facilitation"],
      nice: ["Jira", "Data Storytelling", "Figma"],
    },
  },
  {
    name: "Project Manager",
    category: "Delivery",
    description: "Plans and steers projects to deliver on scope, time and budget.",
    requires: {
      critical: ["Planning & Scheduling", "Stakeholder Management", "Risk Management", "Communication"],
      important: ["Agile", "Azure DevOps"],
      nice: ["Jira", "Estimation", "Change Management"],
    },
  },
  {
    name: "Delivery Manager",
    category: "Delivery",
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
  {
    name: "Engineering Manager",
    category: "Leadership",
    description: "Leads and grows an engineering team while keeping delivery healthy.",
    requires: {
      critical: ["People Management", "Leadership", "Coaching & Mentoring", "Communication"],
      important: ["Agile", "Planning & Scheduling", "System Design", "Stakeholder Management"],
      nice: ["Negotiation", "Change Management", "Financial Management"],
    },
  },
];

export const skills: SeedNode[] = [
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
  { name: "SQL", category: "Data", description: "Querying, joining and shaping relational data." },
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
    name: "Performance Optimisation",
    category: "Engineering",
    description: "Measuring and removing bottlenecks in code, queries and infrastructure.",
  },
  {
    name: "Secure Coding",
    category: "Security",
    description: "Writing code that resists common attacks such as the OWASP Top 10.",
  },
  {
    name: "Problem Solving",
    category: "Core",
    description: "Breaking problems down and finding workable solutions.",
  },
  { name: "Agile", category: "Core", description: "Iterative delivery with Scrum or Kanban practices." },
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
    name: "Cloud Architecture",
    category: "Architecture",
    description: "Designing cloud solutions for reliability, security, cost and performance.",
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
  {
    name: "PowerShell",
    category: "Cloud",
    description: "Scripting and automation, especially for Windows and Azure.",
  },
  { name: "Bash", category: "Cloud", description: "Shell scripting for automation on Linux." },
  // Data
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
  // AI
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
    name: "Product Thinking",
    category: "Business",
    description: "Understanding users, outcomes and trade-offs behind a product.",
  },
  {
    name: "Stakeholder Management",
    category: "Core",
    description: "Understanding and aligning the people who influence or are affected by the work.",
  },
  {
    name: "Communication",
    category: "Core",
    description: "Clear writing, speaking and listening for different audiences.",
  },
  {
    name: "Facilitation",
    category: "Business",
    description: "Running workshops and meetings that reach decisions.",
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
    name: "Change Management",
    category: "Delivery",
    description: "Helping people and organisations adopt new ways of working.",
  },
  // Leadership and commercial
  {
    name: "Leadership",
    category: "Leadership",
    description: "Setting direction and helping people do their best work.",
  },
  {
    name: "People Management",
    category: "Leadership",
    description: "Hiring, developing and supporting the people in a team.",
  },
  {
    name: "Coaching & Mentoring",
    category: "Leadership",
    description: "Helping others grow through feedback, questions and guidance.",
  },
  {
    name: "Financial Management",
    category: "Commercial",
    description: "Budgets, forecasts, margins and financial reporting for engagements.",
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
  {
    name: "Negotiation",
    category: "Commercial",
    description: "Reaching agreements that work for both sides.",
  },
];

export const technologies: SeedNode[] = [
  // Engineering
  {
    name: "React",
    category: "Engineering",
    description: "Component-based library for building user interfaces.",
  },
  {
    name: "Next.js",
    category: "Engineering",
    description: "React framework for server-rendered and static web applications.",
  },
  {
    name: "Angular",
    category: "Engineering",
    description: "TypeScript framework for large web applications.",
  },
  { name: "Node.js", category: "Engineering", description: "JavaScript runtime for servers and tooling." },
  {
    name: ".NET",
    category: "Engineering",
    description: "Microsoft's platform for building services and applications.",
  },
  { name: "Git", category: "Engineering", description: "Distributed version control." },
  {
    name: "GitHub",
    category: "Engineering",
    description: "Hosting, pull requests and collaboration around Git repositories.",
  },
  { name: "GitHub Actions", category: "Cloud", description: "CI/CD workflows built into GitHub." },
  { name: "GitHub Copilot", category: "AI", description: "AI pair programmer in the editor and on GitHub." },
  {
    name: "Azure DevOps",
    category: "Delivery",
    description: "Boards, repos and pipelines for planning and shipping software.",
  },
  { name: "Docker", category: "Cloud", description: "Packaging applications into portable containers." },
  { name: "Kubernetes", category: "Cloud", description: "Orchestrating containers at scale." },
  {
    name: "Terraform",
    category: "Cloud",
    description: "Infrastructure as code across many cloud providers.",
  },
  { name: "Bicep", category: "Cloud", description: "Azure-native language for infrastructure as code." },
  // Cloud
  { name: "Azure", category: "Cloud", description: "Microsoft's cloud platform." },
  { name: "Azure Functions", category: "Cloud", description: "Serverless functions that run on events." },
  { name: "Azure SQL Database", category: "Data", description: "Managed SQL Server database in Azure." },
  { name: "Cosmos DB", category: "Data", description: "Globally distributed NoSQL database in Azure." },
  { name: "PostgreSQL", category: "Data", description: "Open-source relational database." },
  {
    name: "Microsoft Entra ID",
    category: "Security",
    description: "Identity and access management for Microsoft cloud services.",
  },
  {
    name: "Azure Monitor",
    category: "Cloud",
    description: "Metrics, logs and alerts for Azure resources and applications.",
  },
  // Data
  { name: "Spark", category: "Data", description: "Distributed engine for large-scale data processing." },
  {
    name: "Databricks",
    category: "Data",
    description: "Lakehouse platform for data engineering, analytics and machine learning on Spark.",
  },
  {
    name: "Microsoft Fabric",
    category: "Data",
    description: "End-to-end analytics platform: lakehouse, pipelines, warehousing and Power BI.",
  },
  {
    name: "Azure Data Factory",
    category: "Data",
    description: "Cloud service for orchestrating data movement and transformation.",
  },
  {
    name: "Power BI",
    category: "Data",
    description: "Business intelligence: reports, dashboards and semantic models.",
  },
  { name: "Snowflake", category: "Data", description: "Cloud data warehouse." },
  {
    name: "Excel",
    category: "Data",
    description: "Spreadsheets for analysis, modelling and quick reporting.",
  },
  { name: "pandas", category: "Data", description: "Python library for working with tabular data." },
  {
    name: "Azure Event Hubs",
    category: "Cloud",
    description: "Event streaming service for high-volume data ingestion.",
  },
  // AI
  { name: "Azure OpenAI", category: "AI", description: "OpenAI language models hosted in Azure." },
  {
    name: "Azure AI Search",
    category: "AI",
    description: "Search service with vector and hybrid retrieval for AI applications.",
  },
  { name: "Copilot Studio", category: "AI", description: "Low-code tool for building copilots and agents." },
  {
    name: "Semantic Kernel",
    category: "AI",
    description: "SDK for orchestrating language models, plugins and memory in code.",
  },
  { name: "scikit-learn", category: "AI", description: "Python library for classical machine learning." },
  { name: "PyTorch", category: "AI", description: "Deep learning framework." },
  {
    name: "MLflow",
    category: "AI",
    description: "Tracking, packaging and deploying machine learning models.",
  },
  // Security
  {
    name: "Microsoft Sentinel",
    category: "Security",
    description: "Cloud SIEM for detecting and investigating threats.",
  },
  {
    name: "Microsoft Defender for Cloud",
    category: "Security",
    description: "Security posture management and threat protection for cloud workloads.",
  },
  // Business
  {
    name: "Power Platform",
    category: "Business",
    description: "Low-code apps, automation and agents: Power Apps and Power Automate.",
  },
  { name: "Jira", category: "Delivery", description: "Issue and project tracking." },
  { name: "Figma", category: "Business", description: "Collaborative interface design and prototyping." },
];

/** [skill or technology, what it builds on, strength 1–5]: "Databricks builds on Spark". */
export const buildsOn: [string, string, number][] = [
  ["TypeScript", "JavaScript", 5],
  ["React", "JavaScript", 5],
  ["Next.js", "React", 5],
  ["Angular", "TypeScript", 4],
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
  ["People Management", "Leadership", 4],
  ["Coaching & Mentoring", "Communication", 3],
  ["Account Management", "Stakeholder Management", 4],
  ["Commercial Awareness", "Financial Management", 3],
  ["Data Storytelling", "Data Visualisation", 4],
  ["User Stories", "Requirements Engineering", 3],
  ["Backlog Management", "User Stories", 3],
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
];

/** [from role, to role, strength]: typical career moves. */
export const nextSteps: [string, string, number][] = [
  ["Frontend Developer", "Full-stack Developer", 4],
  ["Backend Developer", "Full-stack Developer", 3],
  ["Backend Developer", "Data Engineer", 3],
  ["Backend Developer", "DevOps Engineer", 2],
  ["Data Analyst", "Analytics Engineer", 4],
  ["Data Analyst", "Data Engineer", 3],
  ["Analytics Engineer", "Data Engineer", 4],
  ["Data Engineer", "AI Engineer", 4],
  ["Data Engineer", "Solution Architect", 3],
  ["Data Scientist", "AI Engineer", 4],
  ["Full-stack Developer", "Solution Architect", 3],
  ["Full-stack Developer", "Engineering Manager", 2],
  ["DevOps Engineer", "Cloud Engineer", 4],
  ["Cloud Engineer", "Solution Architect", 4],
  ["Cloud Engineer", "Security Engineer", 2],
  ["Business Analyst", "Project Manager", 3],
  ["Business Analyst", "Product Owner", 4],
  ["Project Manager", "Delivery Manager", 5],
  ["Solution Architect", "Engineering Manager", 2],
];

/** Line thickness of a requirement, from its priority. */
export const requirementStrength = { critical: 5, important: 3, nice: 2 } as const;

/** Fictional demo people (example.com addresses). Seeded everywhere except production. */
export const demoUsers = [
  {
    id: "seed-alex",
    name: "Alex Rivera",
    email: "alex.rivera@example.com",
    appRole: "employee",
    currentRole: "Frontend Developer",
    manager: "seed-morgan",
    declares: ["JavaScript", "TypeScript", "React"],
  },
  {
    id: "seed-sam",
    name: "Sam Patel",
    email: "sam.patel@example.com",
    appRole: "employee",
    currentRole: "Project Manager",
    manager: "seed-morgan",
    declares: ["Jira"],
  },
  {
    id: "seed-morgan",
    name: "Morgan Lee",
    email: "morgan.lee@example.com",
    appRole: "manager",
    currentRole: "Engineering Manager",
    manager: null,
    declares: [],
  },
  {
    id: "seed-jordan",
    name: "Jordan Kim",
    email: "jordan.kim@example.com",
    appRole: "admin",
    currentRole: "Solution Architect",
    manager: null,
    declares: [],
  },
] as const;
