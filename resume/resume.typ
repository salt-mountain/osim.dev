// osim.dev resume — Typst source
// Compile: typst compile resume.typ resume.pdf

#set document(title: "Goran Osim — Resume", author: "Goran Osim")
#set page(margin: (x: 0.7in, y: 0.6in), paper: "us-letter")
#set text(font: "New Computer Modern", size: 10pt)
#set par(justify: true, leading: 0.6em)

// Disable default heading numbering
#set heading(numbering: none)

// --- Helper functions ---

#let header(name, details) = {
  align(center)[
    #text(size: 22pt, weight: "bold")[#name]
    #v(4pt)
    #text(size: 9pt, fill: rgb("#555"))[#details]
  ]
  v(8pt)
  line(length: 100%, stroke: 0.5pt + rgb("#333"))
  v(4pt)
}

#let section-heading(title) = {
  v(8pt)
  text(size: 11pt, weight: "bold", tracking: 0.05em)[#upper(title)]
  v(2pt)
  line(length: 100%, stroke: 0.3pt + rgb("#999"))
  v(4pt)
}

#let job(company, title, location, dates, bullets) = {
  v(4pt)
  grid(
    columns: (1fr, auto),
    text(weight: "bold", size: 10pt)[#company],
    text(size: 9pt, fill: rgb("#555"))[#dates],
  )
  grid(
    columns: (1fr, auto),
    text(style: "italic", size: 9.5pt)[#title],
    text(size: 9pt, fill: rgb("#555"))[#location],
  )
  if bullets.len() > 0 {
    v(3pt)
    for bullet in bullets {
      grid(
        columns: (14pt, 1fr),
        text(size: 9pt)[•],
        text(size: 9pt)[#bullet],
      )
      v(1.5pt)
    }
  }
  v(2pt)
}

// --- Document ---

#header(
  "Goran Osim",
  "Ashburn, VA 20148  |  goran.osim@gmail.com  |  (843) 655-0874  |  linkedin.com/in/goranosim  |  github.com/salt-mountain"
)

#section-heading("Work Experience")

#job(
  "Amazon Web Services",
  "System Development Engineer III",
  "Denver, Colorado",
  "11/2025 — Present",
  ()
)

#job(
  "Booz Allen Hamilton",
  "Chief Engineer",
  "McLean, Virginia",
  "07/2021 — 10/2025",
  (
    "Led a team of 7 Platform and Cloud engineers architecting and building a secure-by-default platform-as-a-service with automated resource deployment and a self-service developer portal.",
    "Designed and implemented a project onboarding pipeline for creating AWS accounts and Kubernetes clusters within 70 minutes leveraging AWS Landing Zone Accelerator, Step Functions, and Terraform.",
    "Spearheaded and mentored a team of 5 platform engineers designing and operationalizing an enterprise software platform for the F-35 Joint Program Office, automating VMware Tanzu Kubernetes Grid deployments.",
    "Built custom GitLab CI pipelines for cross-domain software artifact deployment from inter-connected USAF environments to disconnected environments utilizing Amazon Diode.",
    "Established GitLab CI pipelines for testing Kubernetes Platform applications and automated infrastructure deployments across Rancher RKE2, air-gapped Kubernetes, and K3D distributions.",
    "Deployed Kubernetes clusters with autoscaling capabilities, implementing horizontal and vertical strategies utilizing event-driven and resource-driven metrics for optimized resource utilization.",
  )
)

#job(
  "Booz Allen Hamilton",
  "Senior Lead Technologist",
  "McLean, Virginia",
  "03/2019 — 07/2021",
  (
    "Built a standardized Platform-as-a-Service / Platform-in-a-Box for the United States Air Force under the Chief Software Officer.",
    "Led a team of 4 Engineers as the Classified Operations Technical Anchor enabling low-side development and automating deployment of software to disconnected environments.",
    "Served on the Air Force Platform One program as an Advanced Kubernetes SME, developing and deploying platform capabilities utilizing open source technologies for government Mission Application Developers.",
    "Designed and deployed production grade Kubernetes platforms hosting software factories for government contract technical challenge evaluations.",
    "Selected as the lead technical presenter and SME for government proposal evaluations, conducting live demos, presenting technical orals, and developing technical volumes for competitive contract awards.",
  )
)

#job(
  "BigBear Inc",
  "Infrastructure Lead",
  "San Diego, California",
  "11/2017 — 03/2019",
  (
    "Led application teams in migrating from legacy virtual machines to custom built, high-performance compute clusters.",
    "Established automated CI/CD processes and deployment pipelines to build Docker containers and deploy into Kubernetes environments running on bare metal.",
    "Established the company's first large-scale performant Kubernetes cluster: 32 Nodes, 4TB RAM, 1024 Cores, and 64TB SSD storage.",
    "Grew overall company data center to 3000+ cores, 7+ TB of RAM, and 300 TB of mixed SSD/HDD storage.",
  )
)

#job(
  "BigBear Inc",
  "Senior Software Engineer",
  "San Diego, California",
  "01/2017 — 11/2017",
  (
    "Researched and implemented modernization strategies to modify the operational stack, remove brittle deployment processes, and adopt Docker and Kubernetes.",
    "Maintained a Virtual Private Cloud with over 1500 cores and 25 Servers, supporting a Cassandra cluster comprising billions of records.",
    "Provided 24/7 support and maintenance of the private cloud and associated ingest and egress data pipelines.",
  )
)

#job(
  "BigBear Inc",
  "Senior Software Engineer",
  "San Diego, California",
  "11/2015 — 01/2017",
  (
    "Developed an information mapping, geo-capable solution using Django backed by Elasticsearch, enabling search over 30 billion documents.",
    "Created Amazon CloudFormation scripts for automated deployments and scaling for both AWS and C2S.",
    "Prototyped and implemented custom solutions utilizing RDS, SQS, EC2, and S3 to provide durable services across multiple regions.",
    "Automated frontend and backend machine configuration using Fabric Scripts and CloudFormation for seamless, zero-touch deployment.",
  )
)

#job(
  "Data Meaning",
  "Software Engineer",
  "Vienna, Virginia",
  "04/2014 — 11/2015",
  (
    "Served on the Analytics Team of a major Hotel Company, converting outdated ETL processes into logical and stable data flows.",
    "Implemented automated Python scripts for data manipulation formerly done by hand, saving time on daily, weekly, and monthly tasks.",
    "Built a custom data retrieval script to automatically scrape vendor data from APIs and transform customer data, handling third-party API instability.",
    "Designed and tested a conversion plan to migrate data flows and warehouses to newer software versions with zero downtime.",
  )
)

#job(
  "CGI Federal",
  "Consultant / Application Developer",
  "Fairfax, Virginia",
  "02/2012 — 04/2014",
  (
    "Technical consultant on the Momentum Technical Support team, supporting issue resolution, development, and upgrade support for Java components.",
    "Supported implementation and maintenance of Momentum for multiple Federal clients in a geographically dispersed resource pool.",
    "Supported on-site project teams with new system implementations, providing application development, testing services, and issue analysis.",
    "Interviewed and mentored new Technical Consultants through the Momentum Apprenticeship Program.",
  )
)

#section-heading("Education")

#v(4pt)
#grid(
  columns: (1fr, auto),
  text(weight: "bold", size: 10pt)[Clemson University],
  text(size: 9pt, fill: rgb("#555"))[Clemson, South Carolina],
)
#text(style: "italic", size: 9.5pt)[Computer Science, Bachelor of Science — May 2011]

#section-heading("Skills")

#v(4pt)
#let skill-row(label, value) = {
  grid(
    columns: (120pt, 1fr),
    text(weight: "bold", size: 9pt)[#label],
    text(size: 9pt)[#value],
  )
  v(2pt)
}

#skill-row("Languages", "Python, Java, SQL, T-SQL, C, HTML/CSS, Go, Bash")
#skill-row("Cloud & Containers", "AWS, Kubernetes, Docker, OpenStack, Helm, ArgoCD, Rancher RKE2, K3D")
#skill-row("AWS Services", "EKS, ECS, RDS, SQS, SNS, R53, ELB, EC2, S3, CloudFormation, Step Functions, Landing Zone Accelerator")
#skill-row("IaC & CI/CD", "Terraform, Ansible, GitLab CI, GitHub Actions, GitOps")
#skill-row("Databases", "PostgreSQL, Elasticsearch, MS SQL Server, Cassandra, Redis")
#skill-row("Platforms & Tools", "Linux, Git, VMware Tanzu, Prometheus, Grafana, OpenTelemetry")
#skill-row("Other", "Conversationally fluent in German and Serbo-Croatian")
