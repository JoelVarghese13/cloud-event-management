# Cloud-Based Event Management & Ticketing System
> **AWS Architecture Report & Full Implementation — University Cloud Computing Project**

An end-to-end, resilient multi-tier campus event management and ticket reservation system engineered on Amazon Web Services (AWS) using industry best practices, least-privilege IAM security, asynchronous serverless queue decoupling, and strict zero-cost / Free Tier optimization.

---

## 1. Cloud Architecture Overview

```
                      +-------------------------------------------------------+
                      |                      CUSTOM VPC                       |
                      |                    (10.0.0.0/16)                      |
                      |                                                       |
                      |   [Public Subnet 10.0.1.0/24]                         |
                      |   +-----------------------------------------------+   |
                      |   |  Internet Gateway (IGW)                       |   |
                      |   |         │                                     |   |
[Attendees / Admins] ───> |   Amazon EC2 (Node.js REST API :3000)         |   |
[Web Browser]         |   |   Security Group: allow-web (22, 80, 3000)    |   |
                      |   +───────────────────┬───────────────────────────+   |
                      |                       │ (Private MySQL Traffic)       |
                      |                       ▼                               |
                      |   [Private Subnet 10.0.2.0/24]                        |
                      |   +-----------------------------------------------+   |
                      |   |  Amazon RDS MySQL (eventmgmt)                 |   |
                      |   |  Security Group: allow-rds (Port 3306)        |   |
                      |   +-----------------------------------------------+   |
                      +───────────────────────┼───────────────────────────────+
                                              │
                      +───────────────────────┼───────────────────────────────+
                      |         ASYNCHRONOUS SERVERLESS TIER                  |
                      |                                                       |
                      |   [EC2 API] ──(Book Ticket)──> [Amazon SQS Queue]     |
                      |                                      │                |
                      |                                      ▼ (Batch Size: 5)|
                      |                              [AWS Lambda Worker]      |
                      |                                      │                |
                      |                                      ▼ (Publish)      |
                      |                              [Amazon SNS Topic]       |
                      |                                      │                |
                      |                       ┌──────────────┴──────────────┐ |
                      |                       ▼                             ▼ |
                      |              [Attendee Email]               [Team Alerts]
                      +-------------------------------------------------------+
```

---

## 2. Service Justification Table (Grading Rubric)

| # | AWS Service | One-Sentence Formal Justification | Free Tier / Cost Protection |
|---|---|---|---|
| 1 | **Amazon EC2** | Provides a persistent virtual server to host the Express REST API, satisfying the constraint that the core application layer must not be fully serverless. | `t2.micro` or `t3.micro` (750 free hrs/mo). |
| 2 | **Custom VPC** | Enforces network-level isolation with public and private subnets, ensuring the database tier is never directly reachable from the public internet. | 100% Free (No costly NAT Gateway used; IGW is free). |
| 3 | **Amazon RDS (MySQL)** | Manages an ACID-compliant relational database that stores structured application records (users, events, tickets). | `db.t3.micro` with 20GB GP2, single-AZ. |
| 4 | **Amazon S3** | Durable, infinitely scalable object storage for organizer-uploaded event flyers and static React web hosting. | Free Tier 5GB storage, 20,000 GET requests. |
| 5 | **AWS IAM** | Instance Profiles grant the EC2 and Lambda instances least-privilege permissions without embedding static credentials in code. | 100% Free native AWS service. |
| 6 | **AWS SSM Parameter Store** | Stores RDS credentials as SecureString parameters, enabling runtime secret fetching via the AWS SDK without hardcoded passwords. | Standard parameters are 100% Free. |
| 7 | **Amazon SQS** | Decouples the synchronous REST API from the ticket processing workflow, buffering high burst loads. | First 1,000,000 requests/month are Free. |
| 8 | **AWS Lambda** | Executes the ticket worker in a serverless, event-driven manner, triggered only when messages arrive in SQS. | First 1,000,000 invocations & 3.2M sec compute Free. |
| 9 | **Amazon SNS** | Fans out ticket confirmation emails to attendees and operational alarms to staff. | First 1,000 email notifications/month Free. |
| 10 | **Amazon CloudWatch** | Collects EC2 CPU and RDS connection metrics and raises alarms to notify the team of degradation. | 1 Dashboard and 1 Alarm (within 10 Free Tier alarms). |
| 11 | **AWS Budgets** | Enforces a hard cost ceiling ($2.00) by sending immediate email notifications if projected spend exceeds limits. | First 2 budgets are Free. |

---

## 3. Credit Protection Strategy (Zero-Cost / Low Credit Mode)

1. **NO NAT Gateway**: Standard NAT Gateways incur ~$32/month. We place EC2 in the Public Subnet with an Internet Gateway (IGW is free) and keep RDS in the Private Subnet accessible only via EC2 security group rules.
2. **Automated Teardown**: Run `infrastructure/cleanup.ps1` (or `cleanup.sh`) to instantly terminate EC2 and RDS instances whenever you finish a lab session.
3. **Hard Budget Alerts**: Pre-configured in `infrastructure/budget.json` with a $2.00 threshold to prevent surprise charges on university accounts.

---

## 4. Repository Structure

```
d:/CCL Project/
├── README.md                          # Comprehensive project documentation
├── .gitignore                         # Protects credentials, build outputs, and node_modules
├── infrastructure/                    # [Person A - Network & Security Lead]
│   ├── ec2-trust-policy.json          # EC2 IAM AssumeRole policy
│   ├── lambda-trust-policy.json       # Lambda IAM AssumeRole policy
│   ├── budget.json                    # $2.00 University budget ceiling
│   ├── budget-notifications.json      # 50% & 80% spend alerts
│   ├── cors.json                      # S3 bucket CORS for flyer uploads
│   ├── dashboard.json                 # CloudWatch EC2, RDS, SQS, Lambda monitoring
│   ├── userdata.sh                    # EC2 bootstrap script (Node.js 20 + PM2)
│   ├── deploy-all.ps1                 # 1-Click PowerShell deployment for Windows
│   ├── deploy-all.sh                  # 1-Click Bash deployment for Linux/macOS
│   ├── cleanup.ps1                    # 1-Click teardown script to save AWS credits
│   └── cleanup.sh                     # Bash teardown script
├── backend/                           # [Person B - Core Backend & DB Admin]
│   ├── package.json                   # Dependencies (Express, MySQL2, AWS SDK v3)
│   ├── server.js                      # Main Express REST server with CORS & healthchecks
│   ├── db.js                          # AWS SSM Parameter Store dynamic secret loader
│   ├── schema.sql                     # Database schema (users, events, tickets)
│   ├── routes/
│   │   ├── auth.js                    # JWT registration & login
│   │   ├── events.js                  # Event catalog & S3 flyer uploads
│   │   └── tickets.js                 # Ticket reservation & SQS message dispatcher
│   └── middleware/
│       └── authMiddleware.js          # Role-based authorization & JWT verification
├── lambda/                            # [Person C - Serverless Workflow Lead]
│   ├── worker.py                      # Python 3.12 SQS consumer & SNS email dispatcher
│   └── requirements.txt               # Testing dependencies
└── frontend/                          # [Person C - React Frontend Lead]
    ├── package.json                   # React 18, React Router, Lucide icons, Axios
    ├── public/
    │   └── index.html                 # Google Fonts (Outfit & Plus Jakarta Sans)
    └── src/
        ├── index.css                  # Modern dark glassmorphic design system
        ├── index.js                   # React DOM root
        ├── App.js                     # Routes, navigation, and auth state
        ├── api/
        │   └── axiosClient.js         # Axios interceptor injecting Bearer JWT tokens
        └── pages/
            ├── HomePage.jsx           # Landing page with architecture service badges
            ├── EventsPage.jsx         # Catalog search & SQS booking modal
            ├── RegisterPage.jsx       # Student attendee & organizer portal
            ├── MyTicketsPage.jsx      # Ticket pass display with pass codes & status
            └── OrganizerDashboard.jsx # Event creation, S3 flyer upload & capacity stats
```

---

## 5. Quick Start Instructions

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [Git](https://git-scm.com/)

### A. Clone the Repository
```bash
git clone https://github.com/JoelVarghese13/cloud-event-management.git
cd cloud-event-management
```

### B. Local Development (Zero Cloud Setup Required)
The project comes with a built-in mock database and fallback queue so anyone can run it locally without an AWS account or MySQL server!

1. **Start the Backend API**:
   ```bash
   cd backend
   npm install
   # (Optional) Copy example environment variables
   # Windows: copy .env.example .env | Mac/Linux: cp .env.example .env
   npm start
   ```
   The backend API will start on `http://localhost:3000`.

2. **Start the Frontend Web App**:
   Open a **new terminal window** in the project root:
   ```bash
   cd frontend
   npm install
   # Windows:
   copy .env.example .env
   # Mac/Linux:
   cp .env.example .env

   npm start
   ```
   The web application will open in your browser at `http://localhost:3001`!

### C. Test Accounts Pre-loaded
You can test immediately using these demo credentials or register a new account on the UI:
- **Admin**: `admin@university.edu` / `admin`
- **Organizer**: `organizer@university.edu` / `admin`
- **Attendee**: Register freely via the Sign Up form!

---

### D. Deploying to AWS (Cloud Infrastructure)
When you are ready to provision the live cloud architecture:
1. Configure your AWS credentials (`aws configure` or edit `~/.aws/credentials`).
2. Run the automated deployment script:
   ```powershell
   cd infrastructure
   .\deploy-all.ps1 -Region "ap-south-1" -StudentEmail "your-email@university.edu"
   ```

### E. Teardown Resources to Preserve AWS Credits
Whenever you finish presenting or testing in the cloud:
```powershell
cd infrastructure
.\cleanup.ps1 -Region "ap-south-1"
```
This terminates the EC2 instance, deletes the RDS database, and tears down cloud resources to ensure $0.00 cost.
