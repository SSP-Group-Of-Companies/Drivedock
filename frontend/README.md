# DriveDock – Frontend

DriveDock is an internal web-based hiring application designed for SSP Truck Line. It provides an intuitive, multilingual onboarding experience for truck driver applicants and a secure dashboard for the Safety Department to manage, review, and process submissions.

This `frontend` folder contains the **Next.js** frontend codebase, built with **TypeScript** and **Tailwind CSS**, and is structured for clarity, accessibility, and scalability.

---

## 🌐 Application Surfaces

### 1. Driver Interface (Public)

- **Path:** `/`
- **Access:** Public (no login required)
- **Purpose:** Allows drivers to fill out onboarding documents via a step-by-step form wizard.
- **Features:**
  - Multi-language support (English, Punjabi, French)
  - 6-step guided form flow
  - Progress bar
  - Resume code feature
  - Form validations
  - Confirmation & print-ready summary

### 2. Safety Dashboard (Internal)

- **Path:** `/dashboard`
- **Access:** Microsoft OAuth (SSP Staff only)
- **Purpose:** Internal dashboard for reviewing, printing, and exporting driver submissions.
- **Features (Planned):**
  - Secure Microsoft Entra ID login
  - Table of submissions (sortable, filterable)
  - Full document view by driver
  - Status tagging & audit trail
  - Download/Print options (audit-ready PDFs)

---

## Tech Stack

| Layer        | Tech/Tool                 |
|--------------|---------------------------|
| Framework    | [Next.js](https://nextjs.org/) (TypeScript) |
| UI           | [Tailwind CSS](https://tailwindcss.com/) |
| Auth (Planned) | Microsoft OAuth (Azure Entra ID) |
| Deployment   | TBD (Localhost / Azure / Internal Server) |

---

## Folder Structure (Simplified)

