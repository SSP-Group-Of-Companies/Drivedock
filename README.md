# DriveDock – SSP Truck Line Hiring Application

**DriveDock** is an internal full-stack application designed to digitize and streamline the truck driver onboarding process at **SSP Truck Line Inc.**  
This monorepo contains both the frontend and backend components of the system.

---

## Project Structure


---

## 🏗 Current Status

| Component | Stack | Status |
|-----------|-------|--------|
| **Frontend** | Next.js + Tailwind + TypeScript 
| **Backend** | Node.js + Express (planned)
| **Auth** | Microsoft Entra ID / OAuth 
| **Database** | MongoDB / PostgreSQL
| **PDF Export** | Puppeteer / PDFMake 
| **Hosting** | Local server / Azure (TBD)

---

## 🌐 Application Layers

| Layer | Description | Access |
|-------|-------------|--------|
| **Driver Form** | Public onboarding wizard for truck drivers | No login |
| **Safety Dashboard** | Internal admin panel for document review | Microsoft SSO |

---

## Git Strategy

We follow a standard Git flow:

- `main`: stable production code
- `dev`: all features are merged here before production
- `feature/*`: short-lived branches for specific features or tasks


---

##  Contributors

| Name   | Role                        |
|--------|-----------------------------|
| Parv   | Team Lead & Designer        |
| Faruq | Full-stack Developer         |
| Ridoy  | Full-stack Developer        |

---

##  License

This project is internal and proprietary to **SSP Truck Line Inc.** All rights reserved.
