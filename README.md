# Liberia Agency for Community Development (LACD) Platform

[![Deploy Next.js site to GitHub Pages](https://github.com/totagits/LACD-Platform/actions/workflows/deploy.yml/badge.svg)](https://github.com/totagits/LACD-Platform/actions/workflows/deploy.yml)

> **Local Leadership. Lasting Change.**  
> Official interactive web platform and electronic procurement evaluation portal for the **Liberia Agency for Community Development (LACD)**.

- **Live GitHub Pages URL**: [https://totagits.github.io/LACD-Platform/](https://totagits.github.io/LACD-Platform/)
- **Concept Demo Reference**: [https://lacd-concept-demo.mgwoah.chatgpt.site/#home](https://lacd-concept-demo.mgwoah.chatgpt.site/#home)

---

## Overview

The Liberia Agency for Community Development (LACD) is a legally registered, community-driven non-governmental organization established in 2012. LACD works across Liberia's 15 counties to strengthen livelihoods, food security, climate resilience, women and youth empowerment, and accountable local governance.

This platform provides:
1. **Public Web Experience**: An accessible, high-performance, mobile-responsive portal highlighting LACD’s mission, 6 core programme pillars, field projects, news, success stories, career vacancies, events calendar, and media gallery.
2. **Electronic Procurement Portal**: Complete transparency for public tenders, downloadable official solicitation document packages (RFQ, TOR, Financial Schedule, Submission Forms) generated in real time with branded PDF watermarking, bidder registration, login with Web Crypto authentication, proposal attachment validation, clarification centre, and electronic submission receipts.
3. **Role-Based CMS & Staff Workspace**: Secure staff portal featuring role-based access control (Administrator, Content Editor, Programme Author, Procurement Publisher, Analytics Viewer), rich-text page editor, media management, user administration, newsletter subscription tools, SEO management, audit activity logs, and backup simulation.
4. **Client-Side Persistence**: Zero-backend server requirement for static hosting. Evaluator data, bidder accounts, document attachments, and CMS records automatically persist across browser reloads using HTML5 `localStorage` and `sessionStorage`.

---

## Architecture & Technology Stack

- **Framework**: [Next.js 16 (Turbopack / App Router)](https://nextjs.org/)
- **Language**: TypeScript 5.9
- **Styling**: Modern CSS3 with Tailwind CSS 4, custom responsive design, and CSS backdrop-filter glassmorphism
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) for client-side branded PDF document synthesis (A4, custom headers/footers, dynamic pagination, and typography)
- **Security & Hashing**: Web Crypto API (`crypto.subtle.digest` SHA-256) for secure bidder authentication
- **Hosting**: Free static hosting on **GitHub Pages** automated via **GitHub Actions** (`.github/workflows/deploy.yml`)

---

## Getting Started

### Prerequisites
- Node.js `>= 22.13.0`
- npm `>= 10.0.0`

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/totagits/LACD-Platform.git
   cd LACD-Platform
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build and test static export**:
   ```bash
   npm run build
   ```
   Static output is generated in the `out/` directory.

---

## Deployment to GitHub Pages

Deployment is automated using GitHub Actions on every push to the `main` branch.

### Manual GitHub Pages Build
To build specifically for GitHub Pages with repository subpath:
```bash
NEXT_PUBLIC_BASE_PATH=/LACD-Platform npm run build
```

---

## Principal Evaluator Journeys

| # | Journey | Description |
|---|---------|-------------|
| 1 | **Explore Programmes & Projects** | Deep-dive into LACD's 6 programme pillars, county coverage, targets, indicators, and project progress bars. |
| 2 | **Search Public Information** | Filter reports, strategies, learning briefs, and policies by type or keyword and download documents. |
| 3 | **Review Procurement Notices** | Inspect live RFQs, deadlines, scope, eligibility, and evaluation criteria. |
| 4 | **Download Branded Solicitations** | Generate and download 4-part official solicitation packages in PDF format (RFQ, TOR, Financial Schedule, Bidder Forms). |
| 5 | **Bidder Account & Electronic Submission** | Register a company, upload compliance credentials (business registration, tax clearance), attach proposals, submit bids, and receive instant verifiable receipts. |
| 6 | **Clarification Centre** | Submit queries directly linked to tender references. |
| 7 | **Staff Portal & CMS Dashboard** | Access RBAC tools, publish news, edit page content, manage media, add users, export newsletter subscribers, and view audit history. |

---

## Demonstration Credentials

- **Bidder Portal**:
  - Email: `evaluator@example.com`
  - Password: `Demo@2026`
- **Staff Workspace**:
  - Email: `admin@lacd.demo`
  - Password: `Demo@2026`
  - Select any role (Administrator, Content Editor, Programme Author, Procurement Publisher, Analytics Viewer) from the role selector.

---

## Prepared by

Interactive concept demonstration prepared by **TOTAG IT Services** for RFQ evaluation.
