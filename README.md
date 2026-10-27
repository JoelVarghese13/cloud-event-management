# EventSphere — Cloud-Based Event Management & Ticketing Architecture
> **AWS Multi-Tier Infrastructure & Implementation — University Cloud Computing Project**

EventSphere is an end-to-end, resilient campus event management and auditorium ticketing platform engineered on **Amazon Web Services (AWS)**. It combines an **Apple-inspired Human Interface Guidelines design** with industry-standard cloud engineering: least-privilege IAM security, asynchronous serverless queue decoupling, collision-free auditorium seat booking, and strict zero-cost / Free Tier protection.

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
[Attendees / Admins] ───> |   Amazon EC2 (Node.js REST API :3000 + Nginx) |   |
[Apple Web Client]    |   |   Security Group: allow-web (22, 80, 3000)    |   |
                      |   +───────────────────┬───────────────────────────+   |
                      |                       │ (Private MySQL Traffic)       |
                      |                       ▼                               |
                      |   [Private Subnet 10.0.2.0/24]                        |
                      |   +-----------------------------------------------+   |
                      |   |  Amazon RDS MySQL 8.0 (eventmgmt)             |   |
                      |   |  Security Group: allow-rds (Port 3306)        |   |
                      |   +-----------------------------------------------+   |
                      +───────────────────────┼───────────────────────────────+
                                              │
                      +───────────────────────┼───────────────────────────────+
                      |         ASYNCHRONOUS SERVERLESS TIER                  |
                      |                                                       |
                      |   [EC2 API] ──(Book/Cancel Seat)──> [Amazon SQS Queue]|
                      |                                             │         |
                      |                                             ▼ (Batch) |
                      |                                     [AWS Lambda Worker]|
                      |                                             │         |
                      |                                             ▼ (Fanout)|
                      |                                     [Amazon SNS Topic]|
                      |                                             │         |
                      |                              ┌──────────────┴───────┐ |
                      |                              ▼                      ▼ |
                      |                     [Attendee Email]        [Staff Alerts]
                      +-------------------------------------------------------+
                                              │
                      +───────────────────────┴───────────────────────────────+
                      |             STORAGE & STATIC ASSETS TIER              |
                      |                                                       |
                      |   [Amazon S3 Flyers]     event-mgmt-flyers-838775536247
                      |   [Amazon S3 Web Mirror] event-mgmt-site-838775536247
                      +-------------------------------------------------------+
```

---

## 2. Key Features

### 💺 BookMyShow-Style Interactive Seat Selection
- Real-time visual auditorium seat map with rows A–E (VIP Front Row, Executive, Premium, Standard, Balcony).
- **Collision-Free Seat Locking**: Prevents double-booking conflicts using atomic database transactions.

### ✕ Individual Seat Cancellation
- Attendees can cancel **individual seats** (e.g. cancel `B5` while retaining `A2`) directly from their pass.
- Automatically decrements ticket quantity, increments available event capacity, and dispatches an asynchronous `SeatCancellation` event to SQS and SNS.

### 🍎 Apple Human Interface Guidelines Design
- **Apple Typography**: Native SF Pro / system font stack with tight tracking (`-0.03em`) and clear visual hierarchy.
- **Translucent Materials**: True OLED black canvas (`#000000`), frosted glass overlays (`backdrop-filter: blur(25px)`), and Apple Blue (`#0071e3`) pill buttons (`border-radius: 980px`).
- **Apple Wallet Passes**: Digital passes styled after Apple Wallet with perforated QR code stubs and seat tags.

### 🛡️ Unified Role Architecture (Admin & Attendee)
- **Student / Attendee**: Book seats, cancel individual seats, receive email tickets.
- **Administrator**: Access the **Admin Console** to publish events with direct Amazon S3 flyer uploads, manage attendee rosters, and operate the live **Gate Ticket Verifier**.

### 📡 Live AWS Cloud Telemetry Inspector
- In-app telemetry modal querying `/api/cloud/status` showing live health, latency (<10ms), and resource metrics for all 11 AWS services.

---

## 3. AWS Service Justification Table (Grading Rubric)

| # | AWS Service | Architecture Justification | Free Tier / Cost Protection |
|---|---|---|---|
| 1 | **Amazon EC2** | Hosts the Node.js Express REST API and Nginx reverse proxy, satisfying the requirement for an active virtual server layer. | `t3.micro` (750 free hrs/mo). |
| 2 | **Custom VPC** | Multi-subnet isolation (public and private subnets), ensuring RDS MySQL is completely private and shielded from the public internet. | 100% Free (No NAT Gateway used; IGW is free). |
| 3 | **Amazon RDS (MySQL)** | ACID-compliant relational storage for events, users, seats, and digital tickets with sub-10ms query latency. | `db.t3.micro` with 20GB GP2, single-AZ. |
| 4 | **Amazon S3** | Object storage for organizer-uploaded event flyer banners (`event-mgmt-flyers-...`) and static website hosting (`event-mgmt-site-...`). | Free Tier 5GB storage, 20,000 GET requests. |
| 5 | **AWS IAM** | Least-privilege IAM roles and instance profiles for EC2 and Lambda without hardcoded credentials. | 100% Free native AWS service. |
| 6 | **Amazon SQS** | Asynchronous message queue decoupling the synchronous REST API from ticket confirmation and cancellation processing. | First 1,000,000 requests/month Free. |
| 7 | **AWS Lambda** | Python 3.12 serverless worker triggered by SQS batches to process reservations and publish email alerts. | First 1,000,000 invocations Free. |
| 8 | **Amazon SNS** | Push notification topic fanning out ticket confirmations and cancellation receipts to registered emails. | First 1,000 email notifications/month Free. |
| 9 | **Amazon CloudWatch** | Monitors EC2 CPU utilization, RDS connections, and SQS queue depth with automated alarms. | Free Tier monitoring metrics and alarms. |
| 10 | **AWS Budgets** | Enforces a hard $2.00 spending cap with automated email alerts at 50% ($1.00) and 80% ($1.60) thresholds. | First 2 budgets are Free. |

---

## 4. Repository Structure

```
.
├── README.md                          # Project documentation and architectural report
├── .gitignore                         # Protects credentials, pem keys, and build outputs
├── infrastructure/                    # Infrastructure as Code (IaC) & SQL migrations
│   ├── clean_users.sql                # User purge and event capacity reset script
│   ├── add_seats_and_demo_events.sql  # Schema migration for seats & demo categories
│   ├── fix_passwords.sql              # Password hash repair utility
│   ├── flyers_bucket_policy.json      # S3 public read policy for event banners
│   ├── eventsphere.conf               # Nginx reverse proxy configuration
│   ├── budget.json                    # $2.00 University budget ceiling
│   ├── budget-notifications.json      # 50% & 80% spend alert thresholds
│   ├── cors.json                      # S3 CORS configuration
│   ├── userdata.sh                    # EC2 bootstrap script (Node.js 20 + PM2)
│   ├── deploy-all.ps1                 # 1-Click deployment script for Windows
│   └── cleanup.ps1                    # 1-Click resource teardown script
├── backend/                           # Node.js Express REST API
│   ├── package.json                   # Dependencies (Express, MySQL2, AWS SDK v3)
│   ├── server.js                      # Main Express server with telemetry routes
│   ├── db.js                          # Connection pool & query helpers
│   ├── schema.sql                     # Relational schema (users, events, tickets)
│   └── routes/
│       ├── auth.js                    # Registration, login, and admin claim
│       ├── events.js                  # Event catalog, seat availability & S3 upload
│       ├── tickets.js                 # Seat booking, single seat cancel & gate check-in
│       └── cloud.js                   # Real-time AWS service telemetry endpoint
├── lambda/                            # Serverless Worker
│   ├── worker.py                      # Python 3.12 SQS consumer & SNS email dispatcher
│   └── requirements.txt               # Lambda dependencies
└── frontend/                          # Apple-Styled React Application
    ├── package.json                   # React 18, React Router, Lucide icons, Axios
    ├── public/
    │   └── index.html                 # Apple meta headers & font preconnects
    └── src/
        ├── index.css                  # Apple Human Interface Guidelines design system
        ├── App.js                     # Frosted glass navigation & role-based routing
        ├── components/
        │   ├── SeatPicker.jsx         # BookMyShow interactive auditorium seat map
        │   └── CloudStatusModal.jsx   # Real-time AWS architecture inspector
        └── pages/
            ├── HomePage.jsx           # Apple editorial landing page & schedule
            ├── EventsPage.jsx         # Filterable event grid with seat booking modal
            ├── RegisterPage.jsx       # Apple-style segmented sign in & registration
            ├── MyTicketsPage.jsx      # Apple Wallet passes with individual seat deletion
            └── OrganizerDashboard.jsx # Admin Console with Gate Ticket Verifier
```

---

## 5. Quick Start Instructions

### A. Local Development (Zero Cloud Setup Required)
1. **Start the Backend API**:
   ```bash
   cd backend
   npm install
   npm start
   ```
   Runs on `http://localhost:3000`.

2. **Start the Apple-Styled Frontend**:
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Opens automatically at `http://localhost:3000` (or `http://localhost:3001`).

---

## 6. Live Deployment & Credentials

- **Live Application**: [http://3.111.149.119](http://3.111.149.119)
- **S3 Static Mirror**: [http://event-mgmt-site-838775536247.s3-website.ap-south-1.amazonaws.com](http://event-mgmt-site-838775536247.s3-website.ap-south-1.amazonaws.com)

| Account | Email | Password | Role & Permissions |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@university.edu` | `admin` | Full Admin Console, S3 Flyer Uploads, Gate Scanner |
| **Student Attendee** | Any sign-up (or `joelvarghese013@gmail.com`) | Your password | Seat Booking, Apple Wallet Passes, Seat Cancellation |
| **Admin Passcode** | — | `CAMPUS2026` | Enter during sign-in to unlock Admin Console |

---

## 7. AWS Resource Teardown (Preserve Credits)

Whenever you finish a presentation or grading session:
```powershell
cd infrastructure
.\cleanup.ps1 -Region "ap-south-1"
```
This terminates the EC2 instance, deletes the RDS database, and clears cloud resources to guarantee $0.00 ongoing cost.
