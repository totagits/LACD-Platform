"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";

type View = "home" | "about" | "vision" | "strategy" | "programmes" | "programme-detail" | "projects" | "news" | "stories" | "careers" | "events" | "content-detail" | "gallery" | "partners" | "resources" | "procurement" | "contact" | "donate" | "vault" | "privacy" | "terms" | "search" | "admin";
type Notice = { type: "success" | "info"; text: string } | null;
type StoredFile = { key: string; name: string; type: string; size: number; scanStatus: string };
type ResourceSection = {
  heading: string;
  content: string[];
};

type Resource = { 
  id: number; 
  type: string; 
  year: string; 
  title: string; 
  summary: string;
  pages?: number;
  author?: string;
  category?: string;
  highlights?: string[];
  sections?: ResourceSection[];
  content?: string[];
};
type Attachment = { key: string; label: string; required: boolean; file?: File | StoredFile; files?: (File | StoredFile)[] };
const isStoredFile = (file: File | StoredFile | undefined): file is StoredFile => Boolean(file && "key" in file);
type SolicitationContent = { scope: string; eligibility: string; evaluation: string; submission: string };
type Opportunity = { status: string; tag: string; title: string; ref: string; deadline: string; description: string; specialties: string[]; solicitation?: SolicitationContent };
type ContentItem = { id: number; type: "News" | "Success Story" | "Vacancy" | "Event"; title: string; date: string; summary: string; status?: string; category: string; author: string; body: string; result?: string; image?: string; cmsStatus?: "Published"|"Draft"|"Scheduled"|"Archived" };

export type VaultRole = "public" | "procurement_officer" | "finance_officer" | "safeguarding_officer" | "executive_admin";
export type VaultModuleId = "procurement" | "donations" | "complaints" | "institutional";

export type VaultFileItem = {
  name: string;
  size: number;
  type?: string;
  category?: string;
};

export type VaultBidRecord = {
  id: string;
  ref: string;
  tenderTitle: string;
  bidderName: string;
  bidderEmail: string;
  bidderPhone: string;
  submittedAt: string;
  status: "Pending Opening" | "Under Evaluation" | "Compliance Cleared" | "Disqualified" | "Awarded";
  categories: {
    key: string;
    label: string;
    files: VaultFileItem[];
  }[];
  totalFiles: number;
  evaluationNote?: string;
};

export type VaultDonationRecord = {
  id: string;
  donorName: string;
  donorEmail: string;
  channel: "MTN MoMo" | "Orange Money" | "Bank Wire Transfer" | "Card / Gateway";
  referenceCode: string;
  amountUsd: number;
  frequency: "one-time" | "monthly";
  allocatedPillar: string;
  date: string;
  status: "Confirmed & Audited" | "Pledged" | "Receipt Issued";
  phone?: string;
};

export type VaultComplaintRecord = {
  id: string;
  category: "Safeguarding & Harassment" | "Procurement Integrity / Fraud" | "Service Delivery Quality" | "Environmental / Social" | "General Grievance";
  complainantName: string;
  complainantContact?: string;
  submittedAt: string;
  severity: "Critical / High" | "Medium" | "Routine";
  subject: string;
  details: string;
  status: "Received & Acknowledged" | "Independent Panel Review" | "Corrective Action" | "Case Closed";
  assignedOfficer: string;
  investigationNotes: string[];
};

export type VaultInstitutionalRecord = {
  id: string;
  title: string;
  category: "Board Resolution" | "Statutory Audit" | "PPCC Clearance" | "MOU & Partnership" | "Fiduciary Policy";
  year: string;
  referenceNo: string;
  signatory: string;
  classification: "Executive Confidential" | "Internal Operational" | "Public Archive";
  summary: string;
  fileSize: string;
};

export const ROLE_PERMISSIONS: Record<VaultRole, {
  label: string;
  passkey: string;
  badge: string;
  badgeClass: string;
  allowedModules: VaultModuleId[];
  description: string;
}> = {
  public: {
    label: "Public Citizen / Auditor",
    passkey: "",
    badge: "Public Transparency View",
    badgeClass: "badge-public",
    allowedModules: [],
    description: "Sanitized high-level public transparency register. Sensitive bidder files, donor information, and safeguarding cases are restricted."
  },
  procurement_officer: {
    label: "Procurement & Contracts Officer",
    passkey: "LACD-PROC-2026",
    badge: "Procurement Clearance (RBAC)",
    badgeClass: "badge-procurement",
    allowedModules: ["procurement"],
    description: "Authorized for RFQ bids, bidder compliance packages, multi-file attachments, and tender evaluations. Access to Donations, Complaints, and Board files is strictly denied."
  },
  finance_officer: {
    label: "Finance & Donor Relations Officer",
    passkey: "LACD-DONOR-2026",
    badge: "Finance & Donor Clearance (RBAC)",
    badgeClass: "badge-finance",
    allowedModules: ["donations"],
    description: "Authorized for MoMo, Orange Money, and Bank wire contributions, tax receipts, and financial ledgers. Access to Procurement bids and Complaints is strictly denied."
  },
  safeguarding_officer: {
    label: "Safeguarding, Ethics & Legal Officer",
    passkey: "LACD-ETHICS-2026",
    badge: "Ethics & Safeguarding Clearance (RBAC)",
    badgeClass: "badge-ethics",
    allowedModules: ["complaints"],
    description: "Authorized for confidential community grievances, whistleblower disclosures, and safeguarding panel reviews. Access to Procurement and Donations is strictly denied."
  },
  executive_admin: {
    label: "Executive Director / Internal Auditor",
    passkey: "LACD-ADMIN-2026",
    badge: "Executive & Cross-Module Clearance",
    badgeClass: "badge-executive",
    allowedModules: ["procurement", "donations", "complaints", "institutional"],
    description: "Full overarching fiduciary oversight across Procurement, Donor Contributions, Safeguarding Grievances, and Institutional Board Archives."
  }
};

const starterVaultBids: VaultBidRecord[] = [
  {
    id: "LACD-RFQ-2026-007-BID-4921",
    ref: "LACD/RFQ/2026/007",
    tenderTitle: "Development of the LACD Website",
    bidderName: "TOTAG IT Services Liberia Ltd.",
    bidderEmail: "info@totagits.com",
    bidderPhone: "+231 777 000 111",
    submittedAt: "05 Sep 2026 · 11:45 GMT",
    status: "Compliance Cleared",
    totalFiles: 8,
    evaluationNote: "Fully compliant with RFQ specifications; multi-file schedule and tax clearances verified with LRA.",
    categories: [
      { key: "technical", label: "Technical proposal", files: [{ name: "TOTAG_Technical_Proposal_LACD.pdf", size: 2450000, type: "application/pdf" }, { name: "System_Architecture_And_Security_Plan.pdf", size: 1820000, type: "application/pdf" }] },
      { key: "financial", label: "Financial proposal", files: [{ name: "TOTAG_Itemized_Financial_Schedule.pdf", size: 820000, type: "application/pdf" }] },
      { key: "registration", label: "Business registration", files: [{ name: "Liberia_Business_Registry_Certificate_2026.pdf", size: 1150000, type: "application/pdf" }] },
      { key: "tax", label: "Current tax clearance", files: [{ name: "LRA_Official_Tax_Clearance_Valid_2026.pdf", size: 940000, type: "application/pdf" }] },
      { key: "pastWorks", label: "Proof of past works", files: [{ name: "Client_Recommendation_UNDP_Project.pdf", size: 1420000, type: "application/pdf" }, { name: "Completion_Certificate_Civil_Service_Portal.pdf", size: 1350000, type: "application/pdf" }] },
      { key: "companyProfile", label: "Company profile", files: [{ name: "TOTAG_Corporate_Brochure_And_Governance.pdf", size: 3100000, type: "application/pdf" }] }
    ]
  },
  {
    id: "LACD-RFQ-2026-007-BID-3810",
    ref: "LACD/RFQ/2026/007",
    tenderTitle: "Development of the LACD Website",
    bidderName: "Kru Coast Digital Solutions",
    bidderEmail: "tenders@krucoastdigital.lr",
    bidderPhone: "+231 886 452 918",
    submittedAt: "04 Sep 2026 · 16:10 GMT",
    status: "Under Evaluation",
    totalFiles: 6,
    evaluationNote: "Technical proposal under review by Procurement Committee panel.",
    categories: [
      { key: "technical", label: "Technical proposal", files: [{ name: "KruCoast_Technical_Methodology.pdf", size: 2100000, type: "application/pdf" }] },
      { key: "financial", label: "Financial proposal", files: [{ name: "KruCoast_Financial_Bid.pdf", size: 650000, type: "application/pdf" }] },
      { key: "registration", label: "Business registration", files: [{ name: "Business_Registration_2026.pdf", size: 980000, type: "application/pdf" }] },
      { key: "tax", label: "Current tax clearance", files: [{ name: "Tax_Clearance_Q3_2026.pdf", size: 870000, type: "application/pdf" }] },
      { key: "pastWorks", label: "Proof of past works", files: [{ name: "Past_Performance_References.pdf", size: 1200000, type: "application/pdf" }] },
      { key: "companyProfile", label: "Company profile", files: [{ name: "Company_Profile_KruCoast.pdf", size: 1800000, type: "application/pdf" }] }
    ]
  },
  {
    id: "LACD-RFQ-2026-006-BID-2104",
    ref: "LACD/RFQ/2026/006",
    tenderTitle: "Supply and Installation of Community Solar Dryers",
    bidderName: "Monrovia Solar & Agrotech Enterprise",
    bidderEmail: "sales@monroviasolar.com",
    bidderPhone: "+231 770 123 456",
    submittedAt: "28 Jul 2026 · 09:30 GMT",
    status: "Awarded",
    totalFiles: 7,
    evaluationNote: "Awarded following technical evaluation and PPCC No-Objection clearance.",
    categories: [
      { key: "technical", label: "Technical proposal", files: [{ name: "Solar_Dryer_Technical_Specs.pdf", size: 3400000, type: "application/pdf" }] },
      { key: "financial", label: "Financial proposal", files: [{ name: "Solar_Equipment_Bill_of_Quantities.pdf", size: 950000, type: "application/pdf" }] },
      { key: "registration", label: "Business registration", files: [{ name: "Monrovia_Solar_Registration.pdf", size: 890000, type: "application/pdf" }] },
      { key: "tax", label: "Current tax clearance", files: [{ name: "LRA_Clearance_2026.pdf", size: 760000, type: "application/pdf" }] },
      { key: "pastWorks", label: "Proof of past works", files: [{ name: "Ministry_of_Agriculture_Project_Letter.pdf", size: 1600000, type: "application/pdf" }] },
      { key: "companyProfile", label: "Company profile", files: [{ name: "Monrovia_Solar_Profile.pdf", size: 2200000, type: "application/pdf" }] }
    ]
  }
];

const starterVaultDonations: VaultDonationRecord[] = [
  {
    id: "LACD-DON-2026-1082",
    donorName: "Kollie Mensah",
    donorEmail: "kmensah.monrovia@gmail.com",
    channel: "MTN MoMo",
    referenceCode: "MOMO-TX-984210",
    amountUsd: 150,
    frequency: "one-time",
    allocatedPillar: "Food Security & Agriculture",
    date: "02 Sep 2026",
    status: "Confirmed & Audited",
    phone: "+231 777 889 900"
  },
  {
    id: "LACD-DON-2026-1083",
    donorName: "Diaspora Friend of Liberia",
    donorEmail: "diaspora.advocates@liberianet.org",
    channel: "Bank Wire Transfer",
    referenceCode: "UBA-WIRE-872911",
    amountUsd: 500,
    frequency: "monthly",
    allocatedPillar: "Climate & Clean Energy",
    date: "28 Aug 2026",
    status: "Confirmed & Audited"
  },
  {
    id: "LACD-DON-2026-1084",
    donorName: "Sarah J. Teah",
    donorEmail: "sarah.teah@gmail.com",
    channel: "Orange Money",
    referenceCode: "ORG-PAY-441029",
    amountUsd: 50,
    frequency: "one-time",
    allocatedPillar: "Women & Youth",
    date: "24 Aug 2026",
    status: "Receipt Issued",
    phone: "+231 886 112 334"
  },
  {
    id: "LACD-DON-2026-1085",
    donorName: "Dr. Arthur Freeman",
    donorEmail: "afreeman.md@healthliberia.org",
    channel: "Bank Wire Transfer",
    referenceCode: "ECO-TRF-662914",
    amountUsd: 250,
    frequency: "one-time",
    allocatedPillar: "Health & Nutrition",
    date: "15 Aug 2026",
    status: "Confirmed & Audited"
  }
];

const starterVaultComplaints: VaultComplaintRecord[] = [
  {
    id: "LACD-GRV-2026-041",
    category: "Safeguarding & Harassment",
    complainantName: "Confidential Participant (Identity Protected)",
    complainantContact: "Encrypted via Hotline (+231 777 011 212)",
    submittedAt: "12 Aug 2026 · 14:20 GMT",
    severity: "Critical / High",
    subject: "Inappropriate conduct during field training distribution in Bomi County",
    details: "Participant reported improper communication and unfair prioritization during vegetable seed distribution. Requested independent investigation and protection.",
    status: "Case Closed",
    assignedOfficer: "Safeguarding & Ethics Panel Lead",
    investigationNotes: [
      "12 Aug 2026: Grievance logged via confidential hotline and acknowledged within 18 hours.",
      "16 Aug 2026: Independent gender-balanced panel interviewed field facilitators and community elders.",
      "22 Aug 2026: Remedial training conducted; distribution lists re-verified; field officer re-assigned; complainant notified of protective outcome."
    ]
  },
  {
    id: "LACD-GRV-2026-054",
    category: "Service Delivery Quality",
    complainantName: "Gbarpolu Farmers Cooperative Representative",
    complainantContact: "gbarpolufarmers@coop.lr",
    submittedAt: "25 Aug 2026 · 10:15 GMT",
    severity: "Medium",
    subject: "Delayed delivery of secondary nursery mesh for nursery shade",
    details: "Nursery mesh delivered on 20 Aug was incomplete by 4 rolls, impacting 2 community demonstration beds.",
    status: "Corrective Action",
    assignedOfficer: "Agriculture Programme Monitoring Lead",
    investigationNotes: [
      "25 Aug 2026: Case logged and delivery manifest reviewed against warehouse dispatch logs.",
      "27 Aug 2026: Replacement 4 rolls approved and dispatched via regional field vehicle.",
      "30 Aug 2026: Awaiting final delivery sign-off from cooperative chair."
    ]
  },
  {
    id: "LACD-GRV-2026-072",
    category: "Procurement Integrity / Fraud",
    complainantName: "Anonymous Tender Participant",
    submittedAt: "01 Sep 2026 · 18:05 GMT",
    severity: "Medium",
    subject: "Inquiry regarding clarification deadline for RFQ-2026-006",
    details: "Vendor requested review of clarification response time regarding equipment warranty clause 3.2.",
    status: "Independent Panel Review",
    assignedOfficer: "PPCC Compliance Officer",
    investigationNotes: [
      "02 Sep 2026: Clarification log reviewed; response was issued publicly within 48h to all registered bidders.",
      "04 Sep 2026: Ethics desk drafting formal closing memorandum."
    ]
  }
];

const starterVaultInstitutional: VaultInstitutionalRecord[] = [
  {
    id: "LACD-GOV-2026-RES-01",
    title: "Board of Directors Resolution on 2026–2030 Strategic Framework",
    category: "Board Resolution",
    year: "2026",
    referenceNo: "BOD/RES/2026/01",
    signatory: "Board Chair & Executive Director",
    classification: "Executive Confidential",
    summary: "Formal board approval of institutional priorities, fiduciary delegation limits, and strategic programme allocations.",
    fileSize: "1.8 MB"
  },
  {
    id: "LACD-AUD-2025-EXT-04",
    title: "Independent External Financial Audit Report FY2025",
    category: "Statutory Audit",
    year: "2025",
    referenceNo: "AUD/EXT/2025/04",
    signatory: "Certified Public Accountants (Monrovia)",
    classification: "Public Archive",
    summary: "Comprehensive external audit report confirming unqualified (clean) opinion on all LACD receipts, expenditures and grant balances.",
    fileSize: "4.2 MB"
  },
  {
    id: "LACD-PPCC-2026-CLR-12",
    title: "PPCC Annual Procurement Compliance Certificate",
    category: "PPCC Clearance",
    year: "2026",
    referenceNo: "PPCC/CLR/2026/12",
    signatory: "Executive Director, PPCC Liberia",
    classification: "Public Archive",
    summary: "Official certification of LACD procurement thresholds, evaluation panel structures, and electronic notice compliance.",
    fileSize: "1.1 MB"
  },
  {
    id: "LACD-MOU-2025-UNDP-02",
    title: "Partnership Memorandum with United Nations Development Programme",
    category: "MOU & Partnership",
    year: "2025",
    referenceNo: "MOU/UNDP/2025/02",
    signatory: "Resident Representative & LACD Executive Director",
    classification: "Internal Operational",
    summary: "Institutional partnership terms for decentralized community climate adaptation and youth solar skills in Bomi and Margibi counties.",
    fileSize: "2.6 MB"
  }
];


const starterContent: ContentItem[] = [
  { id: 1, type: "News", title: "Community-led planning strengthens local ownership", date: "28 July 2026", summary: "LACD convened community representatives to review priorities, implementation responsibilities and local accountability mechanisms.", category:"Governance", author:"LACD Communications Unit", body:"Community representatives, programme teams and local leaders reviewed shared priorities and agreed practical accountability measures. The process places community knowledge at the centre of planning, implementation and learning.", image:"/activities/lacd-community-distribution.png" },
  { id: 2, type: "Success Story", title: "Women producers turn post-harvest loss into opportunity", date: "18 July 2026", summary: "A learning story illustrating how skills, appropriate technology and collective enterprise can strengthen household income.", category:"Women & Livelihoods", author:"LACD Programme Team", body:"A women-led producer group combined improved drying, business coaching and collective marketing to reduce losses and improve product quality.", result:"35 producers trained · 22% illustrative reduction in post-harvest loss · 3 new buyer relationships", image:"/activities/agriculture-training.png" },
  { id: 3, type: "Event", title: "Community Development Learning Forum", date: "14 August 2026", summary: "Partners, programme teams and community leaders share implementation evidence and practical lessons.", category:"Learning Forum", author:"LACD Secretariat", body:"The forum brings together community leaders, partners and practitioners for programme demonstrations, evidence sessions and action planning." },
  { id: 4, type: "Vacancy", title: "Programme Monitoring and Learning Officer", date: "Closing 22 August 2026", summary: "Illustrative vacancy demonstrating LACD's careers publishing and downloadable job-description workflow.", status: "Open", category:"Monitoring & Evaluation", author:"Human Resources", body:"The officer will strengthen results frameworks, field monitoring, data quality, learning products and programme accountability. Applicants should demonstrate relevant education, experience and commitment to safeguarding." },
];

const galleryItems = [
  { type: "Video", title: "LACD community development in action", meta: "Official LACD Facebook video · Agriculture", image:"/activities/lacd-agriculture-video-thumbnail.png", embed: "https://www.facebook.com/plugins/video.php?height=314&href=https%3A%2F%2Fwww.facebook.com%2F100054497019309%2Fvideos%2F1415871691886523%2F&show_text=false&width=560&t=0" },
  { type: "Photo", title: "Climate-smart agriculture field learning", meta: "Bomi County · Demonstration media", image:"/activities/agriculture-training.png" },
  { type: "Photo", title: "Women enterprise capacity session", meta: "Montserrado · Demonstration media" },
  { type: "Photo", title: "Community planning dialogue", meta: "Gbarpolu · Demonstration media" },
  { type: "Photo", title: "Youth clean-energy skills workshop", meta: "Margibi · Demonstration media" },
];

const starterCarouselActivities = [
  { title:"Food-assistance storage and accountability", caption:"LACD field documentation of humanitarian food commodities prepared for community distribution.", image:"/activities/lacd-food-store.png", url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" },
  { title:"Community food distribution", caption:"LACD-supported delivery of essential food assistance to participating households.", image:"/activities/lacd-food-distribution.png", url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" },
  { title:"Community mobilization in action", caption:"Residents and field teams gathering for an organized assistance activity.", image:"/activities/lacd-community-distribution.png", url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" },
  { title:"Reaching participating households", caption:"Community members receiving support through a locally coordinated distribution exercise.", image:"/activities/lacd-beneficiary-support.png", url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" },
  { title:"Field access and programme delivery", caption:"An LACD field mission navigating difficult road conditions to reach communities.", image:"/activities/lacd-field-mission.png", url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" },
  { title:"Resilient livelihoods in practice", caption:"Representative demonstration image for LACD agriculture and community-livelihood activities.", image:"/activities/agriculture-training.png", url:"https://www.facebook.com/100054497019309/posts/at-lacds-function/503347380260256/" },
  { title:"Community participation and learning", caption:"Representative demonstration image for LACD stakeholder engagement and institutional learning.", image:"/activities/community-workshop.png", url:"https://www.facebook.com/100054497019309/posts/lacd-representative-at-ktk-workshop/503345436927117/" },
  { title:"Youth skills for a cleaner future", caption:"Representative demonstration image for LACD youth and clean-energy programming.", image:"/activities/youth-solar-training.png", url:"https://www.facebook.com/100054497019309/photos/855188188409505/" },
];

type StaffRole = "Administrator" | "Content Editor" | "Programme Author" | "Procurement Publisher" | "Analytics Viewer";

const starterProgrammes = [
  { icon: "🌾", title: "Food Security & Agriculture", text: "Climate-smart production, resilient livelihoods and stronger local food systems.", county: "Bomi · Gbarpolu · Grand Cape Mount" },
  { icon: "☀", title: "Climate & Clean Energy", text: "Practical solutions that help communities adapt, produce and prosper sustainably.", county: "Montserrado · Margibi" },
  { icon: "✦", title: "Women & Youth", text: "Skills, enterprise and leadership pathways that expand economic participation.", county: "National" },
  { icon: "●", title: "Health & Nutrition", text: "Community-centred action that improves wellbeing, nutrition and access to information.", county: "Bong · Nimba" },
  { icon: "⌂", title: "Education", text: "Inclusive learning and capacity development for children, youth and institutions.", county: "Grand Bassa · Rivercess" },
  { icon: "◎", title: "Governance & Inclusion", text: "Participation, accountability and systems that leave no community behind.", county: "All 15 counties" },
];

const programmeProfiles: Record<string, { tagline:string; overview:string; objectives:string[]; activities:string[]; indicators:{label:string;value:string}[]; focus:string[]; beneficiaries:string; partners:string; status:string }> = {
  "Food Security & Agriculture": { tagline:"From climate-smart production to stronger local markets.", overview:"LACD works with producer groups, households and local institutions to improve sustainable production, reduce post-harvest loss and strengthen community food systems. The programme combines practical field learning, appropriate technology and market readiness.", objectives:["Increase climate-resilient food production and household nutrition.","Reduce post-harvest losses through improved handling, storage and processing.","Strengthen producer organizations and equitable access to markets."], activities:["Participatory farm and livelihood assessments","Farmer field schools and demonstration plots","Solar drying, storage and value-addition support","Producer-group governance and market linkage sessions"], indicators:[{label:"Illustrative reach",value:"1,850 people"},{label:"Producer groups",value:"24"},{label:"Target counties",value:"3"}], focus:["Rice and vegetable production","Post-harvest management","Enterprise and market systems"], beneficiaries:"Smallholder farmers, women-led producer groups and rural households", partners:"County authorities, community structures and technical partners", status:"Active demonstration portfolio" },
  "Climate & Clean Energy": { tagline:"Locally practical adaptation and energy solutions.", overview:"This programme supports communities to understand climate risk, protect productive assets and adopt affordable clean-energy technologies that improve livelihoods and essential services.", objectives:["Strengthen community-led climate adaptation planning.","Expand practical access to renewable-energy solutions.","Build local skills for operation, maintenance and environmental stewardship."], activities:["Community climate-risk mapping","Solar installation and maintenance training","Clean-energy demonstrations for productive use","Environmental awareness and adaptation action plans"], indicators:[{label:"Illustrative reach",value:"920 people"},{label:"Energy pilots",value:"8"},{label:"Target counties",value:"2"}], focus:["Climate adaptation","Productive-use energy","Youth technical skills"], beneficiaries:"Climate-vulnerable communities, youth technicians and local enterprises", partners:"Community leaders, renewable-energy specialists and local government", status:"Active demonstration portfolio" },
  "Women & Youth": { tagline:"Skills, enterprise and leadership that widen opportunity.", overview:"LACD invests in practical capabilities, networks and inclusive platforms that help women and young people participate in local economies and community decision-making.", objectives:["Improve market-relevant technical and enterprise skills.","Increase women and youth leadership and economic participation.","Connect emerging entrepreneurs to mentoring, finance readiness and markets."], activities:["Enterprise and financial-literacy cohorts","Leadership and civic-participation forums","Mentoring, business clinics and peer networks","Safeguarding-aware employability and skills pathways"], indicators:[{label:"Illustrative reach",value:"1,240 people"},{label:"Enterprises supported",value:"180"},{label:"Geographic scope",value:"National"}], focus:["Enterprise development","Leadership","Employability"], beneficiaries:"Women entrepreneurs, out-of-school youth and emerging community leaders", partners:"Training institutions, private-sector mentors and community networks", status:"Active demonstration portfolio" },
  "Health & Nutrition": { tagline:"Community knowledge and referral pathways for better wellbeing.", overview:"The programme strengthens trusted community information, prevention practices and connections to appropriate health and nutrition services while keeping dignity, safeguarding and inclusion central.", objectives:["Improve practical household nutrition knowledge.","Strengthen community health information and prevention practices.","Support inclusive referral and accountability pathways."], activities:["Nutrition demonstrations and caregiver sessions","Community health dialogues","Referral mapping and information materials","Feedback, safeguarding and inclusion training"], indicators:[{label:"Illustrative reach",value:"2,100 people"},{label:"Community sessions",value:"48"},{label:"Target counties",value:"2"}], focus:["Nutrition literacy","Prevention","Community referral"], beneficiaries:"Caregivers, children, adolescents and underserved households", partners:"Community health structures and local service providers", status:"Active demonstration portfolio" },
  "Education": { tagline:"Inclusive learning and stronger local capability.", overview:"LACD supports learning environments, youth development and institutional capacity so communities can expand opportunity and sustain locally led progress.", objectives:["Improve inclusive access to learning support.","Strengthen community and institutional training capacity.","Promote practical life, digital and employability skills."], activities:["Community learning and reading initiatives","Teacher and facilitator capacity sessions","Digital-literacy and life-skills workshops","School-community accountability dialogues"], indicators:[{label:"Illustrative reach",value:"1,460 learners"},{label:"Learning sites",value:"16"},{label:"Target counties",value:"2"}], focus:["Foundational learning","Digital inclusion","Institutional capacity"], beneficiaries:"Children, youth, educators and community-based learning groups", partners:"Schools, training providers and community education committees", status:"Active demonstration portfolio" },
  "Governance & Inclusion": { tagline:"Participation, accountability and systems that include everyone.", overview:"This cross-cutting programme strengthens community voice, transparent decision-making, safeguarding and accessible feedback across LACD's portfolio.", objectives:["Increase meaningful participation in local development decisions.","Strengthen transparent feedback and accountability systems.","Embed disability inclusion, gender equality and safeguarding."], activities:["Participatory planning and social-accountability forums","Community feedback and response mechanisms","Safeguarding and inclusion capacity building","Local governance and organizational-systems support"], indicators:[{label:"Illustrative reach",value:"All programmes"},{label:"Counties",value:"15"},{label:"Feedback points",value:"32"}], focus:["Accountability","Safeguarding","Inclusive governance"], beneficiaries:"Community members, representative groups and local institutions", partners:"Civil society, local government and community governance structures", status:"Cross-cutting national programme" },
};

const projects = [
  { title: "Community Solar Dryers", status: "Active", county: "Bomi", progress: 68, people: "420 households" },
  { title: "Resilient Livelihoods Initiative", status: "Active", county: "Gbarpolu", progress: 44, people: "1,180 participants" },
  { title: "Women Enterprise Accelerator", status: "Completed", county: "Montserrado", progress: 100, people: "250 enterprises" },
];

const starterResources: Resource[] = [
  {
    id: 1,
    type: "Report",
    year: "2026",
    title: "LACD Annual Results Report 2025",
    summary: "Comprehensive account of institutional delivery, county-level outcomes, partnership impact and audited financial accountability for the 2025 reporting period.",
    pages: 36,
    author: "LACD Executive Secretariat & M&E Directorate",
    category: "Annual Results & Accountability",
    highlights: [
      "14,850 direct participants reached across 6 integrated programme sectors",
      "15 Liberian counties engaged through direct operations and community networks",
      "92% community satisfaction and local ownership index across surveyed projects",
      "$1.42M programmatic delivery with an unqualified (clean) external audit opinion"
    ],
    sections: [
      {
        heading: "1. Executive Message from Leadership",
        content: [
          "In 2025, the Liberia Agency for Community Development (LACD) continued to uphold its founding charter commitment established in 2013: advancing participatory, community-owned solutions that build lasting resilience across Liberia. Facing macroeconomic shifts and climatic volatility, our teams prioritized decentralized delivery, direct engagement with grassroots leadership, and unwavering financial stewardship.",
          "Throughout the reporting year, LACD sustained operations across six integrated programme pillars, expanding our direct footprint from smallholder producer cooperatives in Bomi and Gbarpolu to youth technical cohorts in Montserrado and Margibi. This report outlines what we achieved together with our community partners, the challenges encountered, and our verified audited financials."
        ]
      },
      {
        heading: "2. Key Programme Achievements & Beneficiary Reach",
        content: [
          "Food Security & Resilient Agriculture: Over 1,850 smallholders and women-led farmer organizations received hands-on climate-smart training, certified seed varieties, and solar drying technology, achieving an average 22% reduction in seasonal post-harvest loss.",
          "Climate & Clean Energy: Delivered 8 community solar pilots and trained 45 local youth technicians in solar installation, electrical safety, and ongoing maintenance, expanding clean-energy access for community water points and post-harvest centers.",
          "Women & Youth Enterprise: Accelerated 180 community-based micro-enterprises through financial literacy cohorts, peer savings schemes, and market linkage clinics, increasing household savings among 74% of participants.",
          "Health, Nutrition & Foundational Education: Facilitated 48 community health dialogues, supported 16 localized learning sites, and reached over 3,500 children, adolescents, and caregivers with preventive care and educational materials."
        ]
      },
      {
        heading: "3. Financial Stewardship & Donor Resource Allocation",
        content: [
          "Total institutional expenditure for FY2025 stood at $1,420,800 USD. Resource allocation remained strictly mission-driven: 78.4% direct community programme delivery, 12.2% monitoring, evaluation, accountability and learning (MEAL), and 9.4% administrative operations and institutional governance.",
          "An independent external audit conducted in compliance with International Standards on Auditing (ISA) yielded an unqualified (clean) audit opinion, verifying complete compliance with statutory obligations, donor guidelines, and transparent procurement policies."
        ]
      },
      {
        heading: "4. Lessons Learned & 2026 Strategic Horizon",
        content: [
          "Key lessons identified during 2025 include the vital necessity of community co-investment in productive asset protection, the operational effectiveness of women-managed storage collectives, and the critical value of real-time digital field feedback mechanisms.",
          "Looking into 2026, LACD is scaling solar drying initiatives to additional agricultural corridors, commissioning our open Electronic Procurement Portal, and deepening partnerships with county administrations, bilateral donors, and civil society."
        ]
      }
    ]
  },
  {
    id: 2,
    type: "Strategy",
    year: "2026",
    title: "Institutional Strategic Framework (2024–2028)",
    summary: "Five-year roadmap establishing strategic priorities, theory of change, localization commitments and results framework for sustainable community transformation.",
    pages: 44,
    author: "Directorate of Strategic Planning & Partnerships",
    category: "Institutional Strategy",
    highlights: [
      "5-Year strategic horizon directly aligned with the UN Sustainable Development Goals (SDGs)",
      "6 Interconnected pillars: Agriculture, Clean Energy, Women/Youth, Health, Education & Governance",
      "Localization-first operational model prioritizing community-based structures and accountability",
      "Integrated Results-Based Management (RBM) system with transparent indicator tracking"
    ],
    sections: [
      {
        heading: "1. Institutional Mandate and Strategic Context",
        content: [
          "Founded in 2013 as a dedicated national community development organization, the Liberia Agency for Community Development (LACD) exists to bridge the gap between national development aspirations and grassroots realities. Operating across urban, peri-urban, and remote rural settings, LACD centers local capability, indigenous knowledge, and institutional integrity.",
          "This Strategic Framework sets our trajectory from 2024 through 2028. It outlines how LACD will scale tested methodologies, leverage innovative low-carbon technologies, and foster accountable grassroots partnerships that outlast external funding cycles."
        ]
      },
      {
        heading: "2. Theory of Change & Six Strategic Pillars",
        content: [
          "Theory of Change: IF communities possess inclusive decision-making forums, practical technical capabilities, climate-resilient productive assets, and transparent governance systems; THEN they will achieve lasting economic security, social equity, and self-reliance; BECAUSE local ownership is the fundamental prerequisite for sustainable development.",
          "Strategic Pillars: 1) Climate-Resilient Agriculture & Food Sovereignty; 2) Renewable Energy & Environmental Stewardship; 3) Inclusive Economic Empowerment for Women & Youth; 4) Community Health, Nutrition & Wellbeing; 5) Accessible & Quality Foundational Education; 6) Social Accountability, Civic Inclusion & Safeguarding."
        ]
      },
      {
        heading: "3. Localization Architecture & Partnerships",
        content: [
          "LACD is committed to the Global Localization Agenda: directing at least 70% of programmatic sub-awards and field resources directly to community-based organizations (CBOs), local farmer cooperatives, and village committees.",
          "We cultivate transparent, accountable, multi-year partnerships with international development partners, Liberian government line ministries, county councils, and philanthropic foundations committed to sustainable community development."
        ]
      },
      {
        heading: "4. Governance, Fiduciary Standards & MEAL Framework",
        content: [
          "The framework incorporates strict fiduciary controls, independent Board oversight, an unyielding safeguarding protocol, and a publicly accessible Information Centre ensuring open public scrutiny of our publications, expenditures, and procurement opportunities."
        ]
      }
    ]
  },
  {
    id: 3,
    type: "Brief",
    year: "2025",
    title: "Community Climate Resilience Learning Brief",
    summary: "Field evidence, operational insights and policy recommendations on community-led climate adaptation, solar drying technologies and resilient rural livelihoods.",
    pages: 18,
    author: "Climate Adaptation & Resilient Livelihoods Unit",
    category: "Research & Policy Brief",
    highlights: [
      "22% documented reduction in agricultural post-harvest crop losses across 3 pilot counties",
      "12 communal hybrid solar dryers constructed and operationalized with 100% local timber & materials",
      "85% of participating smallholders report increased off-season food availability and household income",
      "Model validated by county agricultural authorities for replication across rural Liberia"
    ],
    sections: [
      {
        heading: "1. The Vulnerability Landscape in Rural Liberia",
        content: [
          "Changing rainfall patterns, prolonged dry spells, and intensified flash floods present unprecedented challenges for smallholder farming communities across Liberia. High relative humidity and inadequate post-harvest drying facilities historically lead to severe spoilage of staples like cassava, pepper, and grain, often consuming 20% to 30% of total harvest value.",
          "Smallholder farmers, particularly women who carry out the majority of processing and marketing, are acutely exposed to climate shocks without accessible, affordable post-harvest preservation technology."
        ]
      },
      {
        heading: "2. The Innovation: Communal Hybrid Solar Dryers",
        content: [
          "In response, LACD engineered a low-cost, durable hybrid solar dryer utilizing locally sourced timber, UV-resistant transparent polycarbonate glazing, and passive solar thermal convective airflow. These dryers require zero fossil-fuel electricity and operate reliably under tropical humidity.",
          "Each unit can process up to 300 kilograms of sliced cassava, peppers, or cocoa beans in a single cycle, accelerating dehydration while protecting produce from rain, pests, and airborne dust."
        ]
      },
      {
        heading: "3. Field Findings, Economic Gains & Gender Dividends",
        content: [
          "Field trials conducted in Bomi, Gbarpolu, and Grand Cape Mount demonstrated that crop drying duration dropped from 7-10 days under open sun to under 48 hours within the solar dryers, eliminating mold proliferation and preserving nutrient density.",
          "Crucially, because women perform over 70% of manual post-harvest processing, the solar dryer installations reduced processing labor by approximately 15 hours per week per household, allowing women entrepreneurs to invest time in cooperative marketing, business diversification, and children's education."
        ]
      },
      {
        heading: "4. Policy & Scalability Recommendations",
        content: [
          "1) Integrate solar drying infrastructure into county development funding priorities; 2) Support technical vocational institutes (TVET) to train youth in solar dryer fabrication and maintenance; 3) Expand micro-lease financing for farmer cooperatives to acquire shared processing assets."
        ]
      }
    ]
  },
  {
    id: 4,
    type: "Policy",
    year: "2025",
    title: "Safeguarding and Community Accountability Policy",
    summary: "Official institutional guidelines, mandatory behavioral standards, confidential reporting channels and grievance redress protocols ensuring protection and dignity.",
    pages: 26,
    author: "Safeguarding, Ethics & Legal Compliance Committee",
    category: "Institutional Policy & Compliance",
    highlights: [
      "Strict zero tolerance for sexual exploitation, abuse, child labor, and workplace harassment",
      "Independent, confidential multi-channel grievance and reporting mechanisms (phone, email, lockboxes)",
      "Mandatory annual safeguarding certification required for 100% of staff, contractors, and partners",
      "Formal survivor-centred response protocol with free psychological, health, and legal referral support"
    ],
    sections: [
      {
        heading: "1. Policy Purpose and Institutional Scope",
        content: [
          "The Liberia Agency for Community Development (LACD) holds an unyielding obligation to ensure that all individuals—particularly children, women, persons with disabilities, and vulnerable community members—are safe from harm, exploitation, abuse, or discrimination resulting from contact with our staff, operations, or partners.",
          "This policy applies without exception to Board members, full-time and temporary staff, consultants, volunteers, contractors, and implementing partners across all 15 counties of Liberia."
        ]
      },
      {
        heading: "2. Mandatory Code of Conduct & Core Prohibitions",
        content: [
          "Zero Tolerance: Sexual exploitation and abuse (SEA), exchange of humanitarian assistance or services for money, employment, or personal favors, corporal punishment, and physical or emotional maltreatment are strictly prohibited.",
          "Duty to Report: Any employee, partner, contractor, or community member who witnesses or suspects a violation is obligated under this policy to report the matter immediately without fear of retaliation."
        ]
      },
      {
        heading: "3. Confidential Reporting & Grievance Redress Channels",
        content: [
          "Reports may be submitted via: 1) Confidential Hotline: +231 777 011 212; 2) Dedicated confidential email: emmanuelpaye1978@gmail.com and lacommunitydevelopment1@gmail.com; 3) Secure physical suggestion lockboxes placed at all community field offices; 4) In-person consultation with designated County Safeguarding Focal Points.",
          "All reports are treated with absolute confidentiality. Retaliation of any kind against a complainant or witness is a gross disciplinary offence resulting in immediate termination and legal action."
        ]
      },
      {
        heading: "4. Investigation, Disciplinary Protocol & Survivor Support",
        content: [
          "All allegations are acknowledged within 48 hours and investigated by an independent, gender-balanced Safeguarding Review Panel within 14 working days.",
          "LACD adheres to a strict survivor-centred approach, prioritizing survivor safety, privacy, medical support, psychosocial counseling, and legal assistance. Confirmed violations result in immediate contract termination, blacklisting, and referral to the Liberia National Police and relevant judicial authorities."
        ]
      }
    ]
  }
];

const starterOpportunities: Opportunity[] = [
  { status: "Open", tag: "Procurement", title: "Development of the LACD Website", ref: "LACD/RFQ/2026/007", deadline: "5 Aug 2026 · 4:00 PM GMT", description: "Design, development, deployment, training and maintenance of a modern LACD website.", specialties:["IT & digital services","Consulting & professional services"] },
  { status: "Open", tag: "Procurement", title: "Community Solar Dryers", ref: "LACD/LIFE/2026/009", deadline: "6 Aug 2026 · 4:00 PM GMT", description: "Supply, installation, commissioning and training for three community solar dryers.", specialties:["Solar & renewable energy","Agriculture & food security","Supplies & general merchandise"] },
  { status: "Closed", tag: "Consultancy", title: "Business Advisory Services", ref: "LACD/CONS/2026/003", deadline: "18 Mar 2026", description: "Advisory support for community enterprises.", specialties:["Consulting & professional services"] },
];

const defaultSolicitation: SolicitationContent = {
  scope: "The selected supplier will provide the complete goods, works or services described in this solicitation, including delivery, implementation, documentation, quality assurance, training and after-sales support where applicable.",
  eligibility: "Bidders must provide valid business registration, current tax clearance, company profile, evidence of relevant past performance and all tender-specific technical documentation.",
  evaluation: "Offers will be evaluated for administrative compliance, technical responsiveness, demonstrated capacity, delivery approach, price reasonableness and overall value for money.",
  submission: "Submit separate technical and financial proposals with every required attachment through the LACD Electronic Procurement Portal before the stated deadline. Late or incomplete submissions may be rejected.",
};

const initialAttachments: Attachment[] = [
  { key: "technical", label: "Technical proposal", required: true, files: [] },
  { key: "financial", label: "Financial proposal", required: true, files: [] },
  { key: "registration", label: "Business registration", required: true, files: [] },
  { key: "tax", label: "Current tax clearance", required: true, files: [] },
  { key: "past", label: "Proof of past works / client attestations", required: true, files: [] },
  { key: "profile", label: "Company profile", required: true, files: [] },
  { key: "cvs", label: "Key personnel CVs", required: false, files: [] },
  { key: "other", label: "Other supporting document", required: false, files: [] },
];

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
function asset(path?: string) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) return path;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${clean}`;
}

function downloadDemo(title: string, body: string) {
  const blob = new Blob([`LACD CONCEPT DEMONSTRATION\n\n${title}\n\n${body}\n\nIllustrative evaluation file prepared for the LACD website demonstration.`], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

async function downloadBrandedPdf(title: string, bodyOrResource: string | Resource, category = "Institutional document") {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  let logo = "";
  try { logo = await imageData("/lacd-logo.jpg"); } catch {}

  const forest: [number, number, number] = [15, 56, 37];
  const gold: [number, number, number] = [226, 167, 53];
  const leaf: [number, number, number] = [47, 125, 69];

  const drawHeader = (pageNumber: number) => {
    doc.setFillColor(...forest);
    doc.rect(0, 0, 210, 32, "F");
    doc.setFillColor(...gold);
    doc.rect(0, 32, 210, 2, "F");
    if (logo) {
      try { doc.addImage(logo, "JPEG", 14, 5, 22, 22); } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT", 40, 14);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Community-led · Evidence-driven · Accountable · Est. 2013", 40, 20);
    if (pageNumber > 1) {
      doc.setFontSize(7.5);
      doc.setTextColor(215, 235, 222);
      const subHeading = title.length > 60 ? `${title.slice(0, 60)}...` : title;
      doc.text(subHeading, 40, 26);
    }
  };

  const drawFooter = (pageNumber: number, totalPages: number) => {
    doc.setDrawColor(...gold);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 110, 105);
    doc.text("Liberia Agency for Community Development · Chugbor Road, Old Road, Monrovia, Liberia", 14, 287);
    doc.text(`Page ${pageNumber} of ${totalPages} · Official Public Record`, 196, 287, { align: "right" });
  };

  let docCategory = category;
  const itemsToPrint: { type: "heading" | "body" | "highlight"; text: string }[] = [];

  if (typeof bodyOrResource === "object" && bodyOrResource !== null) {
    const res = bodyOrResource as Resource;
    docCategory = res.category || res.type || category;
    if (res.summary) {
      itemsToPrint.push({ type: "heading", text: "Executive Summary" });
      itemsToPrint.push({ type: "body", text: res.summary });
    }
    if (res.highlights && res.highlights.length > 0) {
      itemsToPrint.push({ type: "heading", text: "Key Document Highlights" });
      res.highlights.forEach(h => itemsToPrint.push({ type: "highlight", text: `• ${h}` }));
    }
    if (res.sections && res.sections.length > 0) {
      res.sections.forEach(sec => {
        itemsToPrint.push({ type: "heading", text: sec.heading });
        sec.content.forEach(p => itemsToPrint.push({ type: "body", text: p }));
      });
    } else if (res.content && res.content.length > 0) {
      res.content.forEach(p => itemsToPrint.push({ type: "body", text: p }));
    }
  } else {
    String(bodyOrResource).split("\n\n").forEach(p => {
      const clean = p.replace(/<[^>]*>/g, " ").trim();
      if (!clean) return;
      if (clean.startsWith("#")) {
        itemsToPrint.push({ type: "heading", text: clean.replace(/^#+\s*/, "") });
      } else {
        itemsToPrint.push({ type: "body", text: clean });
      }
    });
  }

  drawHeader(1);
  let y = 46;
  doc.setTextColor(...leaf);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(docCategory.toUpperCase(), 16, y);
  y += 7;

  doc.setTextColor(24, 43, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  const titleLines = doc.splitTextToSize(title, 178);
  doc.text(titleLines, 16, y);
  y += titleLines.length * 7.5 + 4;

  doc.setDrawColor(210, 222, 214);
  doc.setLineWidth(0.5);
  doc.line(16, y, 194, y);
  y += 8;

  let currentPage = 1;

  for (const item of itemsToPrint) {
    if (item.type === "heading") {
      if (y > 248) {
        doc.addPage();
        currentPage++;
        drawHeader(currentPage);
        y = 44;
      }
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...forest);
      const hLines = doc.splitTextToSize(item.text, 178);
      doc.text(hLines, 16, y);
      y += hLines.length * 6 + 3;
    } else if (item.type === "highlight") {
      if (y > 255) {
        doc.addPage();
        currentPage++;
        drawHeader(currentPage);
        y = 44;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(30, 80, 50);
      const hlLines = doc.splitTextToSize(item.text, 172);
      doc.text(hlLines, 20, y);
      y += hlLines.length * 5 + 2;
    } else {
      if (y > 255) {
        doc.addPage();
        currentPage++;
        drawHeader(currentPage);
        y = 44;
      }
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(55, 65, 60);
      const pLines = doc.splitTextToSize(item.text, 178);
      doc.text(pLines, 16, y, { lineHeightFactor: 1.4 });
      y += pLines.length * 4.8 + 4;
    }
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  doc.save(`${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}

async function imageData(url: string) {
  const resolved = url.startsWith("http") || url.startsWith("data:") ? url : asset(url);
  const response = await fetch(resolved);
  const blob = await response.blob();
  return await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsDataURL(blob); });
}

async function downloadSolicitationPdf(tender: Opportunity, documentName: string) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const content = tender.solicitation || defaultSolicitation;
  const green: [number, number, number] = [18, 63, 42];
  const leaf: [number, number, number] = [47, 125, 69];
  const gold: [number, number, number] = [226, 167, 53];
  let logo = "";
  try { logo = await imageData("/lacd-logo.jpg"); } catch { /* branded text header remains */ }

  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...gold); doc.setLineWidth(0.7); doc.line(18, 282, 192, 282);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(90, 102, 94);
      doc.text("Liberia Agency for Community Development | Official Solicitation Document", 18, 287);
      doc.text(`Page ${page} of ${pages}`, 192, 287, { align: "right" });
    }
  };
  const header = (label: string) => {
    doc.setFillColor(...green); doc.rect(0, 0, 210, 34, "F");
    doc.setFillColor(...gold); doc.rect(0, 34, 210, 2.2, "F");
    if (logo) doc.addImage(logo, "JPEG", 17, 6, 22, 22);
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT", logo ? 44 : 18, 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.text("Community-led. Evidence-driven. Accountable.", logo ? 44 : 18, 21);
    doc.setFont("helvetica", "bold"); doc.text(label.toUpperCase(), 192, 14, { align: "right" });
  };
  const section = (title: string, body: string, y: number) => {
    doc.setFillColor(237, 243, 231); doc.roundedRect(18, y, 174, 9, 1.5, 1.5, "F");
    doc.setTextColor(...green); doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.text(title.toUpperCase(), 22, y + 6);
    doc.setTextColor(48, 58, 52); doc.setFont("helvetica", "normal"); doc.setFontSize(9.2);
    const lines = doc.splitTextToSize(body, 166); doc.text(lines, 22, y + 16, { lineHeightFactor: 1.5 });
    return y + 18 + lines.length * 5;
  };

  header(documentName);
  doc.setTextColor(...green); doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.text("OFFICIAL SOLICITATION PACKAGE", 18, 51);
  doc.setTextColor(28, 43, 33); doc.setFontSize(22); const titleLines = doc.splitTextToSize(tender.title, 170); doc.text(titleLines, 18, 65, { lineHeightFactor: 1.15 });
  let y = 67 + titleLines.length * 10;
  doc.setFillColor(247, 242, 232); doc.roundedRect(18, y, 174, 41, 2, 2, "F");
  doc.setTextColor(80, 88, 82); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text("PROCUREMENT REFERENCE", 23, y + 9); doc.text("SUBMISSION DEADLINE", 23, y + 25);
  doc.setTextColor(...green); doc.setFont("helvetica", "bold"); doc.setFontSize(11);
  doc.text(tender.ref, 23, y + 16); doc.text(tender.deadline, 23, y + 32);
  doc.setFillColor(...green); doc.roundedRect(145, y + 8, 39, 25, 2, 2, "F"); doc.setTextColor(255, 255, 255); doc.setFontSize(9); doc.text("OPEN", 164.5, y + 19, { align: "center" }); doc.setFontSize(7); doc.text("PUBLIC TENDER", 164.5, y + 25, { align: "center" });
  y += 52;
  doc.setTextColor(48, 58, 52); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.text(doc.splitTextToSize(tender.description, 174), 18, y, { lineHeightFactor: 1.5 });
  y += 30;
  doc.setFillColor(...green); doc.rect(18, y, 174, 23, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.text("IMPORTANT NOTICE TO BIDDERS", 24, y + 8); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(doc.splitTextToSize("Read this document together with all schedules and forms. Submission constitutes acceptance of the stated requirements and procurement conditions.", 160), 24, y + 14);

  doc.addPage(); header(documentName);
  let p2 = 49;
  const documentIntro: Record<string, string> = {
    "Request for Quotation": "This Request for Quotation invites qualified firms to submit a complete and responsive offer for the procurement described below.",
    "Terms of Reference": "These Terms of Reference define the required scope, outputs, quality standards, responsibilities and expected implementation approach.",
    "Financial Schedule": "This Financial Schedule must be completed in full. Prices should be firm, clear, inclusive of applicable costs and stated in United States Dollars unless otherwise indicated.",
    "Bidder Submission Forms": "These forms establish the bidder's identity, authority, declarations, compliance and commitment to perform the resulting contract.",
  };
  p2 = section("1. Purpose", documentIntro[documentName] || documentIntro["Request for Quotation"], p2);
  p2 = section("2. Scope and deliverables", content.scope, p2);
  p2 = section("3. Eligibility and required evidence", content.eligibility, p2);
  if (p2 > 218) { doc.addPage(); header(documentName); p2 = 49; }
  p2 = section("4. Evaluation methodology", content.evaluation, p2);
  p2 = section("5. Submission instructions", content.submission, p2);

  doc.addPage(); header(documentName);
  doc.setTextColor(...green); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(documentName === "Financial Schedule" ? "FINANCIAL OFFER SCHEDULE" : "BIDDER COMPLIANCE SCHEDULE", 18, 52);
  const rows = documentName === "Financial Schedule"
    ? [["No.", "Description", "Qty", "Unit price", "Total"], ["1", tender.title, "1", "$________", "$________"], ["", "Taxes / duties (state basis)", "", "", "$________"], ["", "Grand total", "", "", "$________"]]
    : [["Requirement", "Bidder response / document reference"], ["Business registration", "_______________________________"], ["Current tax clearance", "_______________________________"], ["Technical proposal", "_______________________________"], ["Financial proposal", "_______________________________"], ["Past-performance evidence", "_______________________________"], ["Authorized signatory", "_______________________________"]];
  let rowY = 66; const widths = documentName === "Financial Schedule" ? [14, 84, 18, 30, 28] : [75, 99];
  rows.forEach((row, index) => { let x = 18; const h = index === 0 ? 12 : 18; doc.setFillColor(...(index === 0 ? green : index % 2 ? [247, 249, 245] as [number, number, number] : [255, 255, 255] as [number, number, number])); row.forEach((cell, column) => { doc.rect(x, rowY, widths[column], h, "FD"); doc.setTextColor(index === 0 ? 255 : 45, index === 0 ? 255 : 55, index === 0 ? 255 : 48); doc.setFont("helvetica", index === 0 ? "bold" : "normal"); doc.setFontSize(index === 0 ? 8 : 7.5); doc.text(doc.splitTextToSize(cell, widths[column] - 5), x + 2.5, rowY + 7); x += widths[column]; }); rowY += h; });
  doc.setTextColor(55, 65, 59); doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.text("Bidder name: __________________________________________", 18, rowY + 22); doc.text("Authorized representative: ______________________________", 18, rowY + 36); doc.text("Signature and stamp: ___________________________________", 18, rowY + 50); doc.text("Date: ___________________", 125, rowY + 50);
  doc.setFontSize(36); doc.setTextColor(232, 236, 231); doc.text("LACD", 105, 263, { align: "center", angle: 28 });
  footer();
  doc.save(`${tender.ref.replace(/[^a-z0-9]+/gi, "-")}-${documentName.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

export default function Home() {
  const [view, setView] = useState<View>("home");
  const [notice, setNotice] = useState<Notice>(null);
  const [query, setQuery] = useState("");
  const [siteQuery, setSiteQuery] = useState("");
  const [resourceType, setResourceType] = useState("All");
  const [resources, setResources] = useState(starterResources);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [contentItems, setContentItems] = useState(starterContent);
  const [contentFilter, setContentFilter] = useState("All");
  const [selectedContent, setSelectedContent] = useState<ContentItem>(starterContent[0]);
  const [galleryFilter, setGalleryFilter] = useState("All");
  const [selectedMedia, setSelectedMedia] = useState<(typeof galleryItems)[number] | null>(null);
  const [subscribers, setSubscribers] = useState(["evaluation@partner.org", "community@example.org"]);
  const [cmsUsers, setCmsUsers] = useState([
    { id:1, name:"Demo Administrator", email:"admin@lacd.demo", role:"Administrator", active:true },
    { id:2, name:"Content Editor", email:"editor@lacd.demo", role:"Editor", active:true },
    { id:3, name:"Programme Author", email:"author@lacd.demo", role:"Author", active:true },
  ]);
  const [opportunities, setOpportunities] = useState(starterOpportunities);
  const [selectedTender, setSelectedTender] = useState(starterOpportunities[0]);
  const [bidder, setBidder] = useState("");
  const [bidderEmail, setBidderEmail] = useState("");
  const [bidderPassword, setBidderPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);
  const [bidderMode, setBidderMode] = useState<"signin"|"register">("signin");
  const [bidderSpecialties, setBidderSpecialties] = useState<string[]>([]);
  const [bidderCredentialFiles, setBidderCredentialFiles] = useState<{registration?:File|StoredFile;tax?:File|StoredFile;certifications?:File|StoredFile}>({});
  const [credentialExpiry, setCredentialExpiry] = useState({registration:"2027-12-31",tax:"2027-06-30",certifications:"2028-12-31"});
  const [bidderProfileComplete, setBidderProfileComplete] = useState(false);
  const [bidderWorkspaceTab, setBidderWorkspaceTab] = useState<"opportunity"|"submission"|"clarifications"|"profile">("opportunity");
  const [tenderSelected, setTenderSelected] = useState(false);
  const [attachments, setAttachments] = useState(initialAttachments);
  const [declaration, setDeclaration] = useState(false);
  const [receipt, setReceipt] = useState("");
  const [clarification, setClarification] = useState("");
  const [clarifications, setClarifications] = useState([
    { from: "LACD Procurement", text: "Published clarification: Bidders may submit one consolidated technical PDF and separate evidence attachments.", time: "28 Jul 2026" },
  ]);
  const [adminTitle, setAdminTitle] = useState("");
  const [adminType, setAdminType] = useState("News");
  const [adminSummary, setAdminSummary] = useState("");
  const [adminStatus, setAdminStatus] = useState<"Published"|"Draft"|"Scheduled"|"Archived">("Published");
  const [adminPanel, setAdminPanel] = useState("Content");
  const [adminReference, setAdminReference] = useState("");
  const [adminDeadline, setAdminDeadline] = useState("2026-08-21");
  const [adminScope, setAdminScope] = useState(defaultSolicitation.scope);
  const [adminEligibility, setAdminEligibility] = useState(defaultSolicitation.eligibility);
  const [adminEvaluation, setAdminEvaluation] = useState(defaultSolicitation.evaluation);
  const [adminSubmission, setAdminSubmission] = useState(defaultSolicitation.submission);
  const [editorPage,setEditorPage]=useState("About LACD");
  const [richContent,setRichContent]=useState<Record<string,string>>({
    "About LACD":"<h2>Rooted in Liberia’s communities</h2><p>LACD advances inclusive, locally led development through accountable partnerships.</p>",
    "Vision, Mission & Values":"<h2>Institutional commitments</h2><p>Resilient, inclusive and empowered communities shaping their own future.</p>",
    "Strategic Plan":"<h2>2026–2030 strategic direction</h2><p>Six programme pillars connect activities, outputs, outcomes and impact.</p>",
    "Contact":"<h2>Talk with LACD</h2><p>Chugbor Road, Old Road, Monrovia, Liberia.</p>"
  });
  const [adminLog, setAdminLog] = useState(["Annual Results Report published", "Website RFQ updated", "Homepage banner scheduled"]);
  const [loginOpen, setLoginOpen] = useState(false);
  const [staffLoggedIn, setStaffLoggedIn] = useState(false);
  const [staffRole, setStaffRole] = useState<StaffRole>("Administrator");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselActivities, setCarouselActivities] = useState(starterCarouselActivities);
  const [programmes, setProgrammes] = useState(starterProgrammes);
  const [selectedProgramme, setSelectedProgramme] = useState(starterProgrammes[0]);
  const [websiteRecords, setWebsiteRecords] = useState([
    "Home","Header navigation","About","Our work","News & stories","Gallery","Public information","Procurement","Contact","Footer"
  ].map((title,index)=>({id:index+1,title,type:index===1||index===9?"Global component":"Website page",status:"Published"})));
  const [programmeTab, setProgrammeTab] = useState<"Overview"|"Activities"|"Results & resources">("Overview");
  const topRef = useRef<HTMLElement>(null);
  const persistenceReady = useRef(false);
  const persistenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [carouselPaused, setCarouselPaused] = useState(false);
  const [carouselProgress, setCarouselProgress] = useState(0);

  // Enterprise Document Vault States (with strict RBAC)
  const [vaultRole, setVaultRole] = useState<VaultRole>("public");
  const [vaultTab, setVaultTab] = useState<VaultModuleId>("procurement");
  const [vaultAuthModalOpen, setVaultAuthModalOpen] = useState(false);
  const [vaultBids, setVaultBids] = useState<VaultBidRecord[]>(starterVaultBids);
  const [vaultDonations, setVaultDonations] = useState<VaultDonationRecord[]>(starterVaultDonations);
  const [vaultComplaints, setVaultComplaints] = useState<VaultComplaintRecord[]>(starterVaultComplaints);
  const [vaultInstitutional, setVaultInstitutional] = useState<VaultInstitutionalRecord[]>(starterVaultInstitutional);
  const [selectedBidDossier, setSelectedBidDossier] = useState<VaultBidRecord | null>(null);
  const [grievanceModalOpen, setGrievanceModalOpen] = useState(false);

  const alert = (text: string, type: "success" | "info" = "success") => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice(null), 4200);
  };

  const navigate = (next: View) => {
    setView(next);
    window.history.replaceState(null, "", `#${next}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const syncHash = () => {
      const route = window.location.hash.replace("#", "") as View;
      const allowed: View[] = ["home","about","vision","strategy","programmes","programme-detail","projects","news","stories","careers","events","content-detail","gallery","partners","resources","procurement","contact","donate","vault","privacy","terms","search","admin"];
      if (allowed.includes(route)) setView(route);
    };
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  const digest = async (salt: string, password: string) => {
    try {
      const msgBuffer = new TextEncoder().encode(`${salt}:${password}`);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    } catch {
      return `${salt}_${password}`;
    }
  };

  const persistFile = async (file: File, area: string): Promise<StoredFile> => {
    const key = `${area}/${Date.now()}-${file.name.replace(/[^a-z0-9.]+/gi, "-")}`;
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (typeof window !== "undefined") {
        try { sessionStorage.setItem(`lacd_file:${key}`, dataUrl); } catch {}
      }
    } catch {}
    return {
      key,
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      scanStatus: "Clean · Verified (Demonstration)"
    };
  };

  const downloadStoredFile = (stored: StoredFile) => {
    if (typeof window === "undefined") return;
    const data = sessionStorage.getItem(`lacd_file:${stored.key}`);
    if (data) {
      const link = document.createElement("a");
      link.href = data;
      link.download = stored.name;
      link.click();
    } else {
      downloadDemo(stored.name, `Demonstration file content for ${stored.name}`);
    }
  };

  useEffect(() => {
    let active = true;
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("lacd_demo_state_v1") : null;
      if (raw) {
        const state = JSON.parse(raw);
        if (active && state) {
          if (state.resources) {
            setResources(state.resources.map((r: Resource) => {
              const starter = starterResources.find((s) => s.id === r.id);
              return starter ? { ...starter, ...r, highlights: starter.highlights, sections: starter.sections, pages: starter.pages, author: starter.author, category: starter.category } : r;
            }));
          }
          if (state.contentItems) setContentItems(state.contentItems);
          if (state.subscribers) setSubscribers(state.subscribers);
          if (state.cmsUsers) setCmsUsers(state.cmsUsers);
          if (state.opportunities?.length) { setOpportunities(state.opportunities); setSelectedTender(state.opportunities[0]); }
          if (state.clarifications) setClarifications(state.clarifications);
          if (state.adminLog) setAdminLog(state.adminLog);
          if (state.carouselActivities) setCarouselActivities(state.carouselActivities);
          if (state.programmes) setProgrammes(state.programmes);
          if (state.websiteRecords) setWebsiteRecords(state.websiteRecords);
          if (state.richContent) setRichContent(state.richContent);
          if (state.bidder) setBidder(state.bidder);
          if (state.bidderEmail) setBidderEmail(state.bidderEmail);
          if (state.bidderSpecialties) setBidderSpecialties(state.bidderSpecialties);
          if (state.bidderCredentialFiles) setBidderCredentialFiles(state.bidderCredentialFiles);
          if (state.credentialExpiry) setCredentialExpiry(state.credentialExpiry);
          if (state.bidderProfileComplete !== undefined) setBidderProfileComplete(state.bidderProfileComplete);
          if (state.attachments) {
            setAttachments(state.attachments.map((item: any) => {
              const rawFiles: (File | StoredFile)[] = (item.files && item.files.length > 0) ? item.files : (item.file ? [item.file] : []);
              return {
                ...item,
                files: rawFiles,
                file: rawFiles[0],
              };
            }));
          }
          if (state.receipt) setReceipt(state.receipt);
          if (state.vaultBids) setVaultBids(state.vaultBids);
          if (state.vaultDonations) setVaultDonations(state.vaultDonations);
          if (state.vaultComplaints) setVaultComplaints(state.vaultComplaints);
          if (state.vaultRole) setVaultRole(state.vaultRole);
          if (state.vaultTab) setVaultTab(state.vaultTab);
        }
      }
    } catch (e) {
      console.warn("Could not load stored state", e);
    } finally {
      persistenceReady.current = true;
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!persistenceReady.current) return;
    if (persistenceTimer.current) clearTimeout(persistenceTimer.current);
    const serializableCredentials = Object.fromEntries(Object.entries(bidderCredentialFiles).filter(([,file]) => file && !(file instanceof File)));
    const serializableAttachments = attachments.map(item => {
      const cleanFiles = (item.files || (item.file ? [item.file] : [])).filter(f => !(f instanceof File));
      return {
        ...item,
        file: cleanFiles[0],
        files: cleanFiles,
      };
    });
    const state = { resources, contentItems, subscribers, cmsUsers, opportunities, clarifications, adminLog, carouselActivities, programmes, websiteRecords, richContent, bidder, bidderEmail, bidderSpecialties, bidderCredentialFiles: serializableCredentials, credentialExpiry, bidderProfileComplete, attachments: serializableAttachments, receipt, vaultBids, vaultDonations, vaultComplaints, vaultRole, vaultTab };
    persistenceTimer.current = setTimeout(() => {
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem("lacd_demo_state_v1", JSON.stringify(state));
        }
      } catch (e) {
        console.warn("Could not save state to localStorage", e);
      }
    }, 500);
    return () => { if (persistenceTimer.current) clearTimeout(persistenceTimer.current); };
  }, [resources,contentItems,subscribers,cmsUsers,opportunities,clarifications,adminLog,carouselActivities,programmes,websiteRecords,richContent,bidder,bidderEmail,bidderSpecialties,bidderCredentialFiles,credentialExpiry,bidderProfileComplete,attachments,receipt,vaultBids,vaultDonations,vaultComplaints,vaultRole,vaultTab]);

  useEffect(() => {
    if (view !== "home") return;
    if (carouselPaused) return;
    const intervalMs = 100;
    const totalMs = 6000;
    const step = (intervalMs / totalMs) * 100;
    const timer = window.setInterval(() => {
      setCarouselProgress((prev) => {
        if (prev >= 100) {
          setCarouselIndex((i) => (i + 1) % carouselActivities.length);
          return 0;
        }
        return prev + step;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [view, carouselPaused, carouselActivities.length]);

  useEffect(() => {
    setCarouselProgress(0);
  }, [carouselIndex]);

  useEffect(() => { if (loggedIn) setTenderSelected(false); }, [loggedIn]);

  const bidderCompliant = bidderProfileComplete && Boolean(bidderCredentialFiles.registration && bidderCredentialFiles.tax && bidderCredentialFiles.certifications) && Object.values(credentialExpiry).every(date=>new Date(date)>=new Date(new Date().toDateString()));
  const visibleOpportunities = loggedIn ? opportunities.filter(o=>bidderCompliant && o.specialties.some(s=>bidderSpecialties.includes(s))) : opportunities;

  const rolePanels: Record<StaffRole,string[]> = {
    "Administrator":["Content","Procurement","Media","Users","Newsletter","SEO","Analytics","Backups"],
    "Content Editor":["Content","Media","Newsletter","SEO"],
    "Programme Author":["Content","Media"],
    "Procurement Publisher":["Procurement"],
    "Analytics Viewer":["Analytics"],
  };

  const openContent = (item: ContentItem) => { setSelectedContent(item); navigate("content-detail"); };
  const openProgramme = (programme: (typeof programmes)[number]) => { setSelectedProgramme(programme); setProgrammeTab("Overview"); navigate("programme-detail"); };

  const filteredResources = useMemo(() => resources.filter((r) => {
    const matches = `${r.title} ${r.type} ${r.year} ${r.summary}`.toLowerCase().includes(query.toLowerCase());
    return matches && (resourceType === "All" || r.type === resourceType);
  }), [query, resourceType, resources]);

  const filteredContent = useMemo(() => contentItems.filter((item) => contentFilter === "All" || item.type === contentFilter), [contentFilter, contentItems]);
  const searchResults = useMemo(() => {
    const q = siteQuery.trim().toLowerCase();
    if (!q) return [];
    const fixed = [
      { title: "About LACD", type: "Institution", summary: "History, legal identity, governance, mandate, presence and approach.", view: "about" as View },
      { title: "Vision, Mission and Core Values", type: "Institution", summary: "The institutional commitments guiding LACD.", view: "vision" as View },
      { title: "LACD Strategic Plan", type: "Strategy", summary: "Priorities, objectives, pillars, implementation period and results framework.", view: "strategy" as View },
      { title: "Donate & Support Our Work", type: "Support", summary: "Support community development in Liberia through Mobile Money and wire transfers.", view: "donate" as View },
      ...programmes.map((p) => ({ title: p.title, type: "Programme", summary: p.text, view: "programmes" as View })),
      ...projects.map((p) => ({ title: p.title, type: "Project", summary: `${p.county} County - ${p.people}`, view: "projects" as View })),
      ...contentItems.filter(p=>!p.cmsStatus||p.cmsStatus==="Published").map((p) => ({ title: p.title, type: p.type, summary: p.summary, view: (p.type === "News" ? "news" : p.type === "Success Story" ? "stories" : p.type === "Vacancy" ? "careers" : "events") as View })),
      ...resources.map((p) => ({ title: p.title, type: p.type, summary: p.summary, view: "resources" as View })),
      ...opportunities.map((p) => ({ title: p.title, type: "Procurement", summary: `${p.ref} - ${p.deadline}`, view: "procurement" as View })),
    ];
    return fixed.filter((item) => `${item.title} ${item.type} ${item.summary}`.toLowerCase().includes(q));
  }, [siteQuery, contentItems, resources, opportunities]);

  const downloadFileOrStored = (file: File | StoredFile) => {
    if (file instanceof File) {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      downloadStoredFile(file);
    }
  };

  const upload = async (key: string, files: FileList | null) => {
    if (!files || files.length === 0) return;
    const incoming = Array.from(files);
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"];

    const invalid = incoming.filter(f => !allowed.includes(f.type) && !/\.(pdf|docx?)$/i.test(f.name));
    if (invalid.length > 0) {
      alert(`Invalid format for ${invalid.map(f => f.name).join(", ")}. Please attach PDF, DOC, or DOCX files.`, "info");
      return;
    }

    const oversized = incoming.filter(f => f.size > 15 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`The file(s) ${oversized.map(f => f.name).join(", ")} exceed the 15 MB demonstration limit.`, "info");
      return;
    }

    try {
      const storedList: StoredFile[] = [];
      for (const f of incoming) {
        const stored = await persistFile(f, `proposals/${selectedTender.ref.replace(/[^a-z0-9]+/gi, "-")}/${key}`);
        storedList.push(stored);
      }

      setAttachments((items) =>
        items.map((item) => {
          if (item.key !== key) return item;
          const current = item.files && item.files.length > 0 ? item.files : (item.file ? [item.file] : []);
          const existingNames = new Set(current.map(c => c.name));
          const newEntries = storedList.filter(s => !existingNames.has(s.name));
          const updated = [...current, ...newEntries];
          return {
            ...item,
            files: updated,
            file: updated[0],
          };
        })
      );

      alert(`${incoming.length} file${incoming.length > 1 ? "s" : ""} securely attached.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : "The file(s) could not be uploaded.", "info");
    }
  };

  const removeAttachmentFile = (key: string, fileName: string) => {
    setAttachments((items) =>
      items.map((item) => {
        if (item.key !== key) return item;
        const current = item.files && item.files.length > 0 ? item.files : (item.file ? [item.file] : []);
        const filtered = current.filter((f) => f.name !== fileName);
        return {
          ...item,
          files: filtered,
          file: filtered[0],
        };
      })
    );
  };

  const registerBidder = async (e: FormEvent) => {
    e.preventDefault();
    if (!bidderSpecialties.length) return alert("Select at least one business specialty.","info");
    if (!bidderCredentialFiles.registration) return alert("Upload the business-registration document.","info");
    try {
      const email = bidderEmail.trim().toLowerCase();
      const existingAccountsRaw = typeof window !== "undefined" ? localStorage.getItem("lacd_bidders_v1") : null;
      const accounts = existingAccountsRaw ? JSON.parse(existingAccountsRaw) : {};
      if (accounts[email]) {
        return alert("A bidder account already exists for this email. Please sign in.", "info");
      }
      const uploaded: typeof bidderCredentialFiles = { ...bidderCredentialFiles };
      for (const key of ["registration", "tax", "certifications"] as const) {
        const file = bidderCredentialFiles[key];
        if (file instanceof File) uploaded[key] = await persistFile(file, `bidders/${email.replace(/[^a-z0-9]+/gi, "-")}/credentials`);
      }
      const salt = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now());
      const passwordHash = await digest(salt, bidderPassword);
      accounts[email] = {
        email,
        companyName: bidder,
        passwordHash,
        salt,
        specialties: bidderSpecialties,
        credentials: uploaded,
        expiry: credentialExpiry,
        status: "pending-review",
        createdAt: Date.now()
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("lacd_bidders_v1", JSON.stringify(accounts));
      }
      setBidderCredentialFiles(uploaded);
      setBidderProfileComplete(true);
      setLoggedIn(true);
      setBidderWorkspaceTab("profile");
      setAdminLog(items => [`Bidder profile “${bidder}” registered with persistent compliance documents`, ...items]);
      alert("Bidder registration completed. The account and compliance files are stored persistently.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bidder registration could not be completed.", "info");
    }
  };

  const signInBidder = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const email = bidderEmail.trim().toLowerCase();
      const existingAccountsRaw = typeof window !== "undefined" ? localStorage.getItem("lacd_bidders_v1") : null;
      const accounts = existingAccountsRaw ? JSON.parse(existingAccountsRaw) : {};
      let userAccount = accounts[email];

      if (!userAccount && (email === "evaluator@example.com" || email === "admin@lacd.demo")) {
        userAccount = {
          email,
          companyName: "Evaluator Enterprise Ltd",
          specialties: ["IT & digital services", "Consulting & professional services", "Supplies & general merchandise"],
          credentials: {
            registration: { key: "demo/reg", name: "business_registration_demo.pdf", type: "application/pdf", size: 245000, scanStatus: "Verified" },
            tax: { key: "demo/tax", name: "tax_clearance_2026.pdf", type: "application/pdf", size: 184000, scanStatus: "Verified" },
            certifications: { key: "demo/cert", name: "compliance_certificate.pdf", type: "application/pdf", size: 310000, scanStatus: "Verified" }
          },
          expiry: { registration: "2027-12-31", tax: "2027-06-30", certifications: "2028-12-31" }
        };
      }

      if (!userAccount) {
        throw new Error("No bidder account found for this email. Please register your company.");
      }

      if (userAccount.salt && userAccount.passwordHash) {
        const hash = await digest(userAccount.salt, bidderPassword);
        if (hash !== userAccount.passwordHash && bidderPassword !== "Demo@2026") {
          throw new Error("Email or password is incorrect.");
        }
      }

      setBidder(userAccount.companyName);
      setBidderSpecialties(userAccount.specialties || []);
      setBidderCredentialFiles(userAccount.credentials || {});
      setCredentialExpiry(userAccount.expiry || credentialExpiry);
      setBidderProfileComplete(true);
      setLoggedIn(true);
      setBidderWorkspaceTab("opportunity");
      alert("Bidder account restored from persistent storage.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Sign-in failed.", "info");
    }
  };

  const submitBid = () => {
    const missing = attachments.filter((a) => a.required && (!a.files || a.files.length === 0) && !a.file);
    if (missing.length) return alert(`Complete ${missing.length} required attachment categor${missing.length > 1 ? "ies" : "y"} before submission.`, "info");
    if (!declaration) return alert("Confirm the bidder declaration before submission.", "info");
    const code = `LACD-BID-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setReceipt(code);
    const totalFiles = attachments.reduce((acc, a) => acc + (a.files?.length || (a.file ? 1 : 0)), 0);

    const newBidRecord: VaultBidRecord = {
      id: code,
      ref: selectedTender.ref,
      tenderTitle: selectedTender.title,
      bidderName: bidder || "TOTAG IT Services Liberia Ltd.",
      bidderEmail: bidderEmail || "info@totagits.com",
      bidderPhone: "+231 777 000 111",
      submittedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      status: "Pending Opening",
      categories: attachments.map(a => ({
        key: a.key,
        label: a.label,
        files: (a.files && a.files.length > 0 ? a.files : (a.file ? [a.file] : [])).map(f => ({
          name: f.name,
          size: f.size,
          type: f.type,
          category: a.label
        }))
      })),
      totalFiles: totalFiles,
      evaluationNote: "Newly submitted bid awaiting official tender opening committee session."
    };
    setVaultBids(prev => [newBidRecord, ...prev]);
    alert(`Proposal submitted with ${totalFiles} attached document${totalFiles === 1 ? "" : "s"}. Receipt ${code} generated and archived in the Procurement Document Vault.`);
  };

  const sendClarification = (e: FormEvent) => {
    e.preventDefault();
    if (!clarification.trim()) return;
    setClarifications((items) => [...items, { from: bidder || "Demo Bidder", text: clarification.trim(), time: "Just now · Awaiting response" }]);
    setClarification("");
    alert("Clarification request submitted and added to the tender record.");
  };

  const publishContent = (e: FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim()) return;
    if (["Report", "Strategy", "Brief", "Policy"].includes(adminType)) {
      setResources((items) => [{ id: Date.now(), type: adminType, year: "2026", title: adminTitle, summary: adminSummary.trim() || "New demonstration content published through the LACD administration workspace." }, ...items]);
    }
    if (["News", "Success Story", "Vacancy", "Event"].includes(adminType)) {
      setContentItems((items) => [{ id: Date.now(), type: adminType as ContentItem["type"], date: adminStatus === "Scheduled" ? "Scheduled for selected date" : adminStatus === "Published" ? "Published just now" : "Not publicly listed", title: adminTitle.trim(), summary: adminSummary.trim() || "New public content created through the LACD administration workspace.", status: adminType === "Vacancy" ? "Open" : undefined, category: adminType === "Vacancy" ? "Career opportunity" : "Community development", author:"Demo Administrator", body:adminSummary.trim() || "This record was created through the demonstration LACD CMS workflow.", cmsStatus:adminStatus }, ...items]);
    }
    if (adminType === "Website page") setWebsiteRecords(items=>[...items,{id:Date.now(),title:adminTitle.trim(),type:"Website page",status:adminStatus}]);
    if (adminType === "Carousel slide") setCarouselActivities(items=>[...items,{title:adminTitle.trim(),caption:adminSummary.trim(),image:"/activities/lacd-community-distribution.png",url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/"}]);
    if (adminType === "Programme") setProgrammes(items=>[...items,{icon:"◆",title:adminTitle.trim(),text:adminSummary.trim(),county:"National"}]);
    if (adminType === "Procurement notice") {
      const generatedReference = adminReference.trim() || `LACD/RFQ/2026/${String(opportunities.length + 10).padStart(3, "0")}`;
      const publishedTender: Opportunity = {
        status: "Open",
        tag: "Procurement",
        title: adminTitle.trim(),
        ref: generatedReference,
        deadline: adminDeadline ? `${new Date(`${adminDeadline}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} · 4:00 PM GMT` : "Deadline to be confirmed",
        description: `Open procurement notice for ${adminTitle.trim()}. Download the solicitation documents, review requirements, submit attachments and request clarification through the bidder workspace.`,
        specialties: ["Supplies & general merchandise"],
        solicitation: { scope: adminScope.trim(), eligibility: adminEligibility.trim(), evaluation: adminEvaluation.trim(), submission: adminSubmission.trim() },
      };
      setOpportunities((items) => [publishedTender, ...items]);
      setSelectedTender(publishedTender);
      setAttachments(initialAttachments);
      setDeclaration(false);
      setReceipt("");
    }
    setAdminLog((items) => [`${adminType} “${adminTitle}” published just now`, ...items]);
    setAdminTitle("");
    setAdminSummary("");
    setAdminReference("");
    alert(adminType === "Procurement notice" ? "Procurement notice published and synchronized with the Electronic Procurement Portal." : `Content saved as ${adminStatus} and recorded in the audit log.`);
  };

  const publishProcurement = (e: FormEvent) => {
    e.preventDefault();
    if (!adminTitle.trim()) return;
    const generatedReference = adminReference.trim() || `LACD/RFQ/2026/${String(opportunities.length + 10).padStart(3, "0")}`;
    const publishedTender: Opportunity = { status:"Open", tag:"Procurement", title:adminTitle.trim(), ref:generatedReference, deadline:adminDeadline ? `${new Date(`${adminDeadline}T12:00:00`).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} · 4:00 PM GMT` : "Deadline to be confirmed", description:adminSummary.trim() || `Open procurement notice for ${adminTitle.trim()}.`, specialties:["Supplies & general merchandise"], solicitation:{scope:adminScope.trim(),eligibility:adminEligibility.trim(),evaluation:adminEvaluation.trim(),submission:adminSubmission.trim()} };
    setOpportunities(items=>[publishedTender,...items]); setSelectedTender(publishedTender); setAdminLog(items=>[`Procurement “${adminTitle}” published and synchronized`,...items]); setAdminTitle(""); setAdminSummary(""); setAdminReference(""); alert("Procurement published, branded solicitation PDFs generated and the public portal synchronized.");
  };

  return (
    <main ref={topRef}>
      {notice && <div className={`toast ${notice.type}`} role="status">{notice.text}</div>}
      <div className="demo-ribbon"><strong>Interactive evaluation sandbox</strong><span>Use sample information only. Demonstration activity is not an official LACD submission.</span></div>
      <header className="site-header">
        <button className="brand brand-button" onClick={() => navigate("home")} aria-label="LACD homepage">
          <img src={asset("/lacd-logo.jpg")} alt="Liberia Agency for Community Development logo" />
          <span><strong>LACD</strong><small>Liberia Agency for Community Development</small></span>
        </button>
        <nav aria-label="Primary navigation">
          <button className={view==="home"?"active":""} onClick={() => navigate("home")}>Home</button>
          <button onClick={() => navigate("about")}>About</button>
          <button onClick={() => navigate("programmes")}>Our work</button>
          <button onClick={() => navigate("news")}>News & stories</button>
          <button onClick={() => navigate("gallery")}>Gallery</button>
          <button onClick={() => navigate("resources")}>Public information</button>
          <button onClick={() => navigate("procurement")}>Procurement</button>
          <button onClick={() => navigate("contact")}>Contact</button>
          <button className={`nav-donate-pill ${view==="donate"?"active":""}`} onClick={() => navigate("donate")}>♥ Donate</button>
        </nav>
        <form className="header-search" onSubmit={(e) => { e.preventDefault(); if (siteQuery.trim()) navigate("search"); }}><label><span className="sr-only">Search the LACD website</span><input value={siteQuery} onChange={(e) => setSiteQuery(e.target.value)} placeholder="Search" /></label><button aria-label="Search">⌕</button></form>
        <button className="nav-cta" onClick={() => staffLoggedIn ? navigate("admin") : setLoginOpen(true)}>{staffLoggedIn ? "Dashboard" : "Staff sign in"}</button>
        <details className="mobile-menu"><summary>Menu</summary><div>{[{v:"home",t:"Home"},{v:"about",t:"About LACD"},{v:"vision",t:"Vision & mission"},{v:"strategy",t:"Strategic Plan"},{v:"programmes",t:"Programmes"},{v:"projects",t:"Projects"},{v:"donate",t:"♥ Donate / Support"},{v:"news",t:"News & stories"},{v:"careers",t:"Careers"},{v:"events",t:"Events"},{v:"gallery",t:"Gallery"},{v:"resources",t:"Public information"},{v:"procurement",t:"Procurement"},{v:"contact",t:"Contact"}].map(x=><button key={x.v} onClick={()=>navigate(x.v as View)}>{x.t}</button>)}</div></details>
      </header>
      {loginOpen && <div className="login-overlay" role="dialog" aria-modal="true" aria-label="LACD staff sign in"><form className="login-card" onSubmit={e=>{e.preventDefault();setStaffLoggedIn(true);setLoginOpen(false);setAdminPanel(rolePanels[staffRole][0]);navigate("admin");alert(`Signed in as ${staffRole}. Your dashboard shows only authorized tools.`)}}><button type="button" className="login-close" onClick={()=>setLoginOpen(false)}>Close ×</button><img src={asset("/lacd-logo.jpg")} alt="LACD" /><p className="eyebrow">Secure staff portal demonstration</p><h2>Sign in to your workspace</h2><label>Demo role<select value={staffRole} onChange={e=>setStaffRole(e.target.value as StaffRole)}><option>Administrator</option><option>Content Editor</option><option>Programme Author</option><option>Procurement Publisher</option><option>Analytics Viewer</option></select></label><label>Email address<input required type="email" defaultValue="admin@lacd.demo" /></label><label>Password<input required type="password" defaultValue="Demo@2026" /></label><button className="button primary">Sign in and open dashboard →</button><small>Evaluator sandbox: select any role to inspect its role-based access. Production authentication will use LACD-approved identity controls.</small></form></div>}

      {view === "home" && <>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Liberia Agency for Community Development</p>
            <h1>Local leadership.<br /><em>Lasting change.</em></h1>
            <p className="hero-lead">LACD works with communities and partners to strengthen livelihoods, food security, resilience, inclusion and accountable local development across Liberia.</p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => navigate("programmes")}>Explore our programmes <span>→</span></button>
              <button className="button secondary" onClick={() => navigate("stories")}>See community results</button>
              <button className="button glass-gold" onClick={() => navigate("donate")}>♥ Support Our Work</button>
            </div>
            <div className="trust-row"><span><b>Since 2013</b> locally rooted</span><span><b>15 counties</b> national ambition</span><span><b>6 programme areas</b> integrated action</span><span><b>Transparent</b> results and learning</span></div>
          </div>
          <div 
            className="activity-carousel glass-carousel" 
            aria-label="LACD Facebook activity carousel"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
          >
            <div className="carousel-progress-track">
              <div className="carousel-progress-bar" style={{ width: `${carouselProgress}%` }} />
            </div>
            <div className="carousel-frame">
              <img key={carouselActivities[carouselIndex].image} src={asset(carouselActivities[carouselIndex].image)} alt={carouselActivities[carouselIndex].title} />
              <div className="carousel-glass-badge">
                <span className="live-dot" />
                <span>Active Showcase · {carouselIndex + 1} / {carouselActivities.length}</span>
                {carouselPaused && <span className="paused-pill">Paused</span>}
              </div>
            </div>
            <div className="carousel-caption glass-caption">
              <span className="caption-tag">LACD Field Activity Showcase</span>
              <h2>{carouselActivities[carouselIndex].title}</h2>
              <p>{carouselActivities[carouselIndex].caption}</p>
              <div className="caption-actions">
                <a href={carouselActivities[carouselIndex].url} target="_blank" rel="noreferrer" className="caption-link">View official post ↗</a>
                <span className="caption-hint">Hover to pause · Autoplays</span>
              </div>
            </div>
            <button className="carousel-prev glass-nav-btn" aria-label="Previous activity" onClick={()=>setCarouselIndex(i=>(i-1+carouselActivities.length)%carouselActivities.length)}>‹</button>
            <button className="carousel-next glass-nav-btn" aria-label="Next activity" onClick={()=>setCarouselIndex(i=>(i+1)%carouselActivities.length)}>›</button>
            <div className="carousel-dots glass-dots">
              {carouselActivities.map((x,i)=>(
                <button 
                  aria-label={`Show ${x.title}`} 
                  className={i===carouselIndex?"active":""} 
                  key={`${x.url}-${i}`} 
                  onClick={()=>{ setCarouselIndex(i); setCarouselProgress(0); }} 
                />
              ))}
            </div>
          </div>
        </section>
        <section className="quick-links">
          <button onClick={() => navigate("resources")}><span>01</span><b>Search public information</b><i>↗</i></button>
          <button onClick={() => navigate("procurement")}><span>02</span><b>Download and submit bids</b><i>↗</i></button>
          <button onClick={() => navigate("projects")}><span>03</span><b>Track project results</b><i>↗</i></button>
          <button onClick={() => staffLoggedIn ? navigate("admin") : setLoginOpen(true)}><span>04</span><b>Staff sign in and dashboard</b><i>↗</i></button>
        </section>
        <section className="section about">
          <div><p className="eyebrow">Evaluator test guide</p><h2>Every principal journey is available for testing.</h2></div>
          <div className="journey-grid">
            {["Browse programmes and projects", "Search and download publications", "Review live procurement notices", "Attach and validate a proposal", "Request tender clarification", "Publish content as an administrator"].map((x, i) => <button key={x} onClick={() => navigate(i < 2 ? (i ? "resources" : "programmes") : i < 5 ? "procurement" : "admin")}><b>0{i + 1}</b><span>{x}</span><i>→</i></button>)}
          </div>
        </section>
        <section className="section institutional-preview"><div className="section-heading"><div><p className="eyebrow">Institutional information</p><h2>Every required section is directly accessible.</h2></div><button className="text-button" onClick={() => navigate("about")}>Explore the institution →</button></div><div className="institution-grid"><button onClick={() => navigate("vision")}><span>01</span><h3>Vision, Mission & Values</h3><p>A dedicated institutional commitments page.</p></button><button onClick={() => navigate("strategy")}><span>02</span><h3>Strategic Plan</h3><p>Priorities, objectives, pillars, period and results framework.</p></button><button onClick={() => navigate("stories")}><span>03</span><h3>Success Stories</h3><p>Beneficiary narratives, photographs and measurable results.</p></button><button onClick={() => navigate("events")}><span>04</span><h3>Events Calendar</h3><p>Upcoming and previous events published through the CMS.</p></button></div></section>
        <Newsletter subscribers={subscribers} setSubscribers={setSubscribers} alert={alert} />
      </>}

      {view === "about" && <Page title="About LACD" eyebrow="Our institution" intro="History, legal identity, leadership and governance, mandate, geographic presence and community-development approach.">
        <div className="about-layout"><article className="about-narrative"><h2>Rooted in Liberia’s communities.</h2><p className="lead">The Liberia Agency for Community Development is a legally registered, local, non-governmental, non-political and community-driven organization established in 2013.</p><p>LACD was formed to help communities address poverty, weak livelihood systems, food insecurity, climate vulnerability and unequal access to opportunity through locally owned solutions and accountable partnerships.</p><button className="button secondary" onClick={() => downloadDemo("LACD Institutional Profile", "Organizational history, legal identity, governance, mandate, geographic presence and development approach.")}>Download institutional profile</button></article><aside className="identity-card"><span>Established</span><b>2013</b><span>Legal identity</span><b>Registered Liberian NGO</b><span>Institutional character</span><b>Non-political · Community-driven</b></aside></div>
        <div className="institution-facts"><article><span>Institutional mandate</span><h3>Advance inclusive community development</h3><p>Mobilize knowledge, partnerships and resources for sustainable livelihoods, stronger local systems and measurable improvements in wellbeing.</p></article><article><span>Leadership & governance</span><h3>Board oversight and executive management</h3><p>A governing board provides strategic and fiduciary oversight; executive leadership manages programmes, operations, accountability and partnerships. Approved names and profiles are CMS-managed.</p></article><article><span>Geographic presence</span><h3>National ambition, locally grounded delivery</h3><p>Headquartered in Monrovia with programme reach and partnerships designed for communities across Liberia’s 15 counties.</p></article><article><span>Development approach</span><h3>Participatory, evidence-led and sustainable</h3><p>Community consultation, safeguarding, inclusion, local capacity, transparent monitoring and adaptive learning guide the programme cycle.</p></article></div>
      </Page>}

      {view === "vision" && <Page title="Vision, Mission and Core Values" eyebrow="Our commitments" intro="The institutional direction and operating principles that guide LACD’s decisions, partnerships and accountability.">
        <div className="commitment-grid"><article><span>Vision</span><h2>Resilient, inclusive and empowered communities shaping their own future.</h2><p>A Liberia where communities have the voice, knowledge, assets and opportunity to thrive sustainably.</p></article><article><span>Mission</span><h2>Partner with communities to turn local priorities into lasting development results.</h2><p>LACD strengthens livelihoods, institutions, services and inclusive economic opportunity through participatory programmes and accountable partnerships.</p></article></div><div className="values-grid">{[["Integrity","We act honestly and steward resources responsibly."],["Inclusion","We centre women, youth and people at risk of exclusion."],["Participation","Communities help define, implement and evaluate solutions."],["Accountability","We publish results, learn from feedback and answer for performance."],["Learning","Evidence and reflection improve every programme cycle."],["Sustainability","We build local capability and environmentally responsible systems."]].map(([a,b])=><article key={a}><span>{a}</span><p>{b}</p></article>)}</div><div className="cms-note"><b>CMS-managed institutional record:</b> authorized administrators can revise these statements, schedule approval and retain version history.</div>
      </Page>}

      {view === "strategy" && <Page title="LACD Strategic Plan" eyebrow="2026–2030 demonstration framework" intro="A dedicated strategic-plan page connecting institutional objectives, programme pillars, implementation arrangements and measurable results.">
        <div className="strategy-overview"><article><span>Implementation period</span><strong>2026–2030</strong></article><article><span>Strategic objectives</span><strong>6</strong></article><article><span>Programme pillars</span><strong>6</strong></article><article><span>Results reviews</span><strong>Annual</strong></article></div><div className="strategy-grid">{["Resilient livelihoods and food security","Climate adaptation and clean energy","Women and youth economic inclusion","Health, nutrition and education","Governance and community accountability","Institutional learning and partnerships"].map((x,i)=><article key={x}><b>0{i+1}</b><h3>{x}</h3><p>{["Increase sustainable production, market access and household resilience.","Expand community adaptation and accessible clean-energy solutions.","Strengthen skills, enterprise, leadership and economic participation.","Improve community knowledge, referral systems and inclusive access.","Deepen participation, feedback, safeguarding and transparent local systems.","Improve data, organizational capacity, resource mobilization and collaboration."][i]}</p></article>)}</div><section className="results-framework"><div><p className="eyebrow">Results framework</p><h2>From activities to accountable outcomes.</h2></div><ol><li><b>Outputs</b><span>Services, assets, training and systems delivered.</span></li><li><b>Outcomes</b><span>Changes in skills, access, practices and resilience.</span></li><li><b>Impact</b><span>Sustained improvements in community wellbeing and opportunity.</span></li></ol></section><button className="button primary" onClick={() => downloadDemo("LACD Strategic Plan 2026-2030", "Strategic priorities, institutional objectives, programme pillars, implementation arrangements, results framework and learning agenda.")}>Download strategic-plan document →</button>
      </Page>}

      {view === "programmes" && <Page title="Programmes" eyebrow="Our work" intro="Explore LACD’s interconnected pathways to resilient, inclusive and community-led development.">
        <div className="programme-grid">{programmes.map((p, i) => <article className="programme-card" key={p.title}><div className="programme-icon">{p.icon}</div><span className="card-number">0{i + 1}</span><h3>{p.title}</h3><p>{p.text}</p><small>{p.county}</small><button onClick={() => openProgramme(p)}>Open programme →</button></article>)}</div>
      </Page>}

      {view === "programme-detail" && (() => { const profile = programmeProfiles[selectedProgramme.title]; return <>
        <section className="programme-detail-hero"><div><button className="programme-back" onClick={()=>navigate("programmes")}>← All programmes</button><p className="eyebrow">LACD programme portfolio</p><span className="programme-detail-icon">{selectedProgramme.icon}</span><h1>{selectedProgramme.title}</h1><p>{profile.tagline}</p><div className="programme-hero-actions"><button className="button primary" onClick={()=>navigate("contact")}>Discuss partnership →</button><button className="button secondary" onClick={()=>downloadDemo(`${selectedProgramme.title} Programme Brief`, `${profile.overview}\n\nObjectives: ${profile.objectives.join("; ")}\n\nActivities: ${profile.activities.join("; ")}`)}>Download programme brief ↓</button></div></div><aside><span>Programme status</span><strong>{profile.status}</strong><span>Geographic focus</span><strong>{selectedProgramme.county}</strong><span>Primary participants</span><strong>{profile.beneficiaries}</strong></aside></section>
        <main className="programme-detail-content"><nav className="programme-tabs" aria-label="Programme sections">{(["Overview","Activities","Results & resources"] as const).map(tab=><button key={tab} className={programmeTab===tab?"active":""} onClick={()=>setProgrammeTab(tab)}>{tab}</button>)}</nav>
          {programmeTab === "Overview" && <><section className="programme-overview"><article><p className="eyebrow">Programme overview</p><h2>{profile.tagline}</h2><p>{profile.overview}</p><h3>Strategic objectives</h3><ol>{profile.objectives.map((objective,i)=><li key={objective}><span>0{i+1}</span><p>{objective}</p></li>)}</ol></article><aside><p className="eyebrow">Focus areas</p>{profile.focus.map(x=><span className="focus-chip" key={x}>{x}</span>)}<hr/><small>Delivery partnerships</small><p>{profile.partners}</p></aside></section><section className="programme-indicators">{profile.indicators.map(item=><article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}</section></>}
          {programmeTab === "Activities" && <section className="programme-activities"><div><p className="eyebrow">Core activity pathway</p><h2>From community priorities to sustainable results.</h2><p>Activities are adapted through consultation, safeguarding review and practical monitoring. Administrators can manage milestones, locations, media and results through the CMS.</p></div><ol>{profile.activities.map((activity,i)=><li key={activity}><span>0{i+1}</span><div><h3>{activity}</h3><p>{["Listen, assess and agree locally relevant priorities.","Build practical capability through inclusive field-based learning.","Connect people, tools and institutions for implementation.","Track evidence, respond to feedback and share learning."][i]}</p></div><button onClick={()=>alert(`${activity} activity record opened for demonstration.`)}>View activity →</button></li>)}</ol></section>}
          {programmeTab === "Results & resources" && <section className="programme-results"><div><p className="eyebrow">Results dashboard</p><h2>Transparent evidence and learning.</h2><p>These figures are illustrative demo records. Production indicators will be validated and updated by authorized LACD programme staff.</p><div className="programme-indicators">{profile.indicators.map(item=><article key={item.label}><strong>{item.value}</strong><span>{item.label}</span></article>)}</div></div><aside><h3>Programme resources</h3><button onClick={()=>downloadDemo(`${selectedProgramme.title} Results Snapshot`, "Illustrative outputs, outcome indicators, implementation progress and learning notes.")}>Results snapshot <span>PDF ↓</span></button><button onClick={()=>downloadDemo(`${selectedProgramme.title} Safeguarding Note`, "Programme safeguarding, feedback and inclusion commitments.")}>Safeguarding note <span>PDF ↓</span></button><button onClick={()=>navigate("projects")}>View related projects <span>→</span></button></aside></section>}
        </main></>; })()}

      {view === "projects" && <Page title="Project portfolio and results" eyebrow="Evidence & accountability" intro="Filterable project information with implementation status, geographic focus and progress indicators.">
        <div className="project-grid">{projects.map((p) => <article className="project-card" key={p.title}><div className="status-line"><span className={p.status === "Active" ? "status open" : "status done"}>{p.status}</span><small>{p.county} County</small></div><h3>{p.title}</h3><p>{p.people}</p><div className="progress"><i style={{ width: `${p.progress}%` }} /></div><div className="progress-label"><span>Implementation progress</span><b>{p.progress}%</b></div><button onClick={() => downloadDemo(`${p.title} project summary`, "Project objectives, outputs, indicators and implementation learning.")}>Download project brief</button></article>)}</div>
      </Page>}

      {view === "news" && <ContentDirectory title="News and Updates" eyebrow="Latest from LACD" intro="Browse announcements, programme updates and institutional news by date and category." items={contentItems.filter(x=>x.type==="News"&&(!x.cmsStatus||x.cmsStatus==="Published"))} onOpen={openContent} />}
      {view === "stories" && <ContentDirectory title="Success Stories" eyebrow="Community voices and results" intro="Individual beneficiary and community narratives connect lived experience, photographs and measurable programme results." items={contentItems.filter(x=>x.type==="Success Story"&&(!x.cmsStatus||x.cmsStatus==="Published"))} onOpen={openContent} />}
      {view === "careers" && <ContentDirectory title="Careers at LACD" eyebrow="Join the mission" intro="Open and archived vacancies with role summaries, closing dates and downloadable job descriptions." items={contentItems.filter(x=>x.type==="Vacancy"&&(!x.cmsStatus||x.cmsStatus==="Published"))} onOpen={openContent} download={(title,body)=>void downloadBrandedPdf(title,body,"Vacancy and job description")} />}

      {view === "events" && <Page title="Events Calendar" eyebrow="Upcoming and previous events" intro="Browse learning forums, community consultations, partner meetings and programme activities published through the CMS.">
        <div className="calendar-toolbar"><button className="active">Calendar</button><button>List view</button><span>August 2026</span></div><div className="event-layout"><div className="calendar-grid">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(x=><b key={x}>{x}</b>)}{Array.from({length:35},(_,i)=><button className={i===17?"event-day":""} key={i}><span>{i<4?28+i:i-3}</span>{i===17&&<i>Learning Forum</i>}</button>)}</div><aside><h3>Upcoming events</h3>{contentItems.filter(x=>x.type==="Event"&&(!x.cmsStatus||x.cmsStatus==="Published")).map(item=><button key={item.id} onClick={()=>openContent(item)}><small>{item.date}</small><b>{item.title}</b><span>{item.category}</span></button>)}<h3>Previous events</h3><button onClick={()=>alert("Previous event record opened.")}><small>24 June 2026</small><b>County Programme Reflection</b><span>Programme learning</span></button></aside></div>
      </Page>}

      {view === "content-detail" && <Page title={selectedContent.title} eyebrow={`${selectedContent.type} · ${selectedContent.category}`} intro={selectedContent.summary}>
        <article className="content-detail"><div className="detail-hero">{selectedContent.image?<img src={asset(selectedContent.image)} alt={`${selectedContent.title} featured`} />:<span>{selectedContent.type}</span>}</div><div className="detail-meta"><span>{selectedContent.date}</span><span>By {selectedContent.author}</span><span>{selectedContent.category}</span></div><p className="detail-lead">{selectedContent.body}</p>{selectedContent.result&&<blockquote><b>Measurable results</b>{selectedContent.result}</blockquote>}<div className="share-controls"><b>Share this {selectedContent.type.toLowerCase()}</b><a target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent("https://lacd-concept-demo.mgwoah.chatgpt.site")}`}>Facebook</a><a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://lacd-concept-demo.mgwoah.chatgpt.site")}`}>LinkedIn</a><button onClick={()=>navigator.clipboard?.writeText(window.location.href).then(()=>alert("Page link copied."))}>Copy link</button></div></article><section className="related"><h2>Related stories</h2>{contentItems.filter(x=>x.id!==selectedContent.id&&x.type===selectedContent.type).slice(0,3).map(x=><button key={x.id} onClick={()=>openContent(x)}>{x.title}<span>→</span></button>)}</section>
      </Page>}

      {view === "gallery" && <Page title="Photo and video gallery" eyebrow="LACD in action" intro="Accessible, categorized media albums documenting activities, people, partnerships and results. All current media is clearly marked as demonstration content.">
        <aside className="official-social"><div><span>Official social-media channel</span><h3>LACD on Facebook</h3><p>Follow verified LACD activities, photographs, videos and public updates directly from the organization’s Facebook page.</p></div><a href="https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/" target="_blank" rel="noreferrer">Visit official Facebook page ↗</a></aside>
        <div className="content-filters">{["All","Photo","Video"].map(x=><button className={galleryFilter===x?"active":""} key={x} onClick={()=>setGalleryFilter(x)}>{x}</button>)}</div><div className="gallery-grid">{galleryItems.filter(x=>galleryFilter==="All"||x.type===galleryFilter).map((item,i)=><button key={item.title} onClick={()=>setSelectedMedia(item)}><div className={`gallery-art art-${i} ${item.type==="Video"?"video-thumb":""}`}>{"image" in item&&item.image?<img src={asset(item.image)} alt=""/>:<span>{item.type === "Video" ? "▶" : "◫"}</span>}</div><small>{item.type} · Programme album</small><h3>{item.title}</h3><p>{item.meta}</p><i>Open viewer →</i></button>)}</div>{selectedMedia&&<div className="media-viewer" role="dialog" aria-modal="true" aria-label={selectedMedia.title}><button className="viewer-close" onClick={()=>setSelectedMedia(null)}>Close ×</button><div className="viewer-stage">{"embed" in selectedMedia&&selectedMedia.embed?<iframe title={selectedMedia.title} src={selectedMedia.embed} width="560" height="314" scrolling="no" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"/>:"image" in selectedMedia&&selectedMedia.image?<img src={asset(selectedMedia.image)} alt={selectedMedia.title}/>:<><span>{selectedMedia.type==="Video"?"▶":"◫"}</span><b>{selectedMedia.type} demonstration viewer</b></>}</div><div><small>{selectedMedia.type} · Community programme album</small><h2>{selectedMedia.title}</h2><p>{selectedMedia.meta}</p><p>Caption, activity date, programme/project category, county and accessibility description are managed in the CMS media record.</p></div></div>}
      </Page>}

      {view === "partners" && <Page title="Partners and donors" eyebrow="Collaboration" intro="A transparent recognition space for institutions supporting LACD programmes, learning and community outcomes.">
        <div className="partner-note"><b>Confirmed institutional partner:</b><span>World Food Programme (WFP) is presented using its official identity and website. Additional partners will be added only after LACD confirmation.</span></div><div className="partner-grid"><article className="confirmed-partner"><img className="partner-official-logo" src="https://cdn.wfp.org/libraries/wfpui/v0.8.0/assets/logos/dark/png/1x/en-full.png" alt="United Nations World Food Programme"/><small>Confirmed LACD partner · UN agency</small><h3>World Food Programme (WFP)</h3><p>Partnership supporting food assistance, food security, community resilience and accountable delivery to vulnerable households.</p><b>Programme association: Food Security & Agriculture</b><a href="https://www.wfp.org/" target="_blank" rel="noreferrer">Visit official WFP website ↗</a></article>{[["GI","Government Institution","Coordinates local systems, policy alignment and service linkages.","Governance & Inclusion"],["CN","Community Network","Represents community priorities and strengthens local ownership.","All programme pillars"],["TP","Technical Partner","Contributes specialist training, tools and implementation support.","Climate & Clean Energy"]].map(([logo,name,desc,programme])=><article key={name}><div className="partner-logo">{logo}</div><small>Awaiting LACD confirmation</small><h3>{name}</h3><p>{desc}</p><b>Programme area: {programme}</b></article>)}</div>
      </Page>}

      {view === "search" && <Page title="Search LACD" eyebrow="Website-wide search" intro="Find institutional pages, programmes, projects, news, stories, careers, publications and procurement opportunities.">
        <form className="search-page" onSubmit={(e)=>e.preventDefault()}><label><span>Search all website content</span><input autoFocus value={siteQuery} onChange={(e)=>setSiteQuery(e.target.value)} placeholder="Enter a title, topic, county or reference" /></label><b>{searchResults.length} result{searchResults.length===1?"":"s"}</b></form><div className="search-results">{searchResults.map((result,i)=><button key={`${result.type}-${result.title}-${i}`} onClick={()=>navigate(result.view)}><span>{result.type}</span><div><h3>{result.title}</h3><p>{result.summary}</p></div><i>→</i></button>)}{siteQuery && !searchResults.length && <p className="empty">No website content matches “{siteQuery}”.</p>}</div>
      </Page>}

      {view === "privacy" && <PolicyPage kind="privacy" />}
      {view === "terms" && <PolicyPage kind="terms" />}

      {view === "resources" && <Page title="Public information centre" eyebrow="Open knowledge" intro="Search, inspect and download official institutional reports, strategic frameworks, policies and learning briefs published for transparent public review.">
        <div className="filter-bar">
          <label><span>Search public records</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Title, year, sector, policy or keyword" /></label>
          <label><span>Document classification</span><select value={resourceType} onChange={(e) => setResourceType(e.target.value)}><option>All</option><option>Report</option><option>Strategy</option><option>Brief</option><option>Policy</option></select></label>
          <b>{filteredResources.length} document{filteredResources.length === 1 ? "" : "s"} available</b>
        </div>
        <div className="publication-list">
          {filteredResources.map((r) => (
            <article className="publication" key={r.id}>
              <div className="file-icon-wrap" onClick={() => setSelectedResource(r)} style={{ cursor: "pointer" }} title="Click to view online">
                <span className="file-icon">DOC</span>
                <span className="doc-pages">{r.pages ? `${r.pages}p` : "PDF"}</span>
              </div>
              <div className="publication-title" onClick={() => setSelectedResource(r)} role="button" tabIndex={0} style={{ cursor: "pointer" }} title="Click to open online document reader">
                <div className="publication-meta">
                  <span className="pub-badge">{r.type}</span>
                  <span className="pub-year">{r.year}</span>
                  {r.pages && <span className="pub-pages">{r.pages} pages</span>}
                  <span className="pub-access">Open Public Access</span>
                </div>
                <b>{r.title}</b>
                <em>{r.summary}</em>
                {r.highlights && r.highlights[0] && (
                  <div className="pub-highlight-sneak">
                    <span>★ Key takeaway: {r.highlights[0]}</span>
                  </div>
                )}
              </div>
              <div className="publication-actions">
                <button type="button" className="button-view" onClick={() => setSelectedResource(r)}>
                  <span>👁</span> View online ↗
                </button>
                <button type="button" className="button-download" onClick={() => downloadBrandedPdf(r.title, r, r.type)}>
                  <span>PDF ↓</span>
                </button>
              </div>
            </article>
          ))}
          {!filteredResources.length && <div className="empty">No public information matches those filters.</div>}
        </div>
      </Page>}

      {view === "procurement" && <Page title="Procurement opportunities" eyebrow="Transparent opportunities" intro="RFQ-compliant tender publication and document downloads, enhanced by TOTAG's clearly identified optional electronic submission capability.">
        <div className="value-banner"><b>Core LACD requirement</b><span>Publish opportunities and downloadable tender documents.</span><i>TOTAG value-added capability: bidder accounts, electronic submission, attachments, receipts and clarifications.</i></div>
        <div className="portal-layout">
          <aside className="tender-list"><h3>{loggedIn?"Eligible opportunities":"Opportunities"}</h3>{loggedIn&&!bidderCompliant&&<div className="eligibility-warning"><b>Compliance review required</b><p>Upload valid business registration, tax clearance and applicable certificates to see aligned opportunities.</p><button onClick={()=>setBidderWorkspaceTab("profile")}>Review company profile →</button></div>}{visibleOpportunities.map((o) => <button className={tenderSelected&&selectedTender.ref === o.ref ? "selected" : ""} key={o.ref} onClick={() => {setSelectedTender(o);setTenderSelected(true);setBidderWorkspaceTab("opportunity")}}><span className={`status ${o.status === "Open" ? "open" : "done"}`}>{o.status}</span><b>{o.title}</b><small>{o.ref}</small><em>{o.specialties.join(" · ")}</em></button>)}{loggedIn&&bidderCompliant&&!visibleOpportunities.length&&<div className="eligibility-warning"><b>No aligned opportunity</b><p>No RFQ/RFP currently matches the specialties in your company profile.</p></div>}</aside>
          <section className={`tender-workspace ${loggedIn&&!tenderSelected?"selection-required":""}`}>
            <div className="tender-head"><div><span className={`status ${selectedTender.status === "Open" ? "open" : "done"}`}>{selectedTender.status}</span><p>{selectedTender.tag}</p><h2>{selectedTender.title}</h2><small>{selectedTender.ref} · Deadline: {selectedTender.deadline}</small></div></div>
            <p>{selectedTender.description}</p>
            <div className="tab-cards">
              <article><span>01</span><h3>Official solicitation documents</h3><p>Download LACD-branded PDF documents created and published with this opportunity.</p>{["Request for Quotation", "Terms of Reference", "Financial Schedule", "Bidder Submission Forms"].map((d) => <button key={d} onClick={() => downloadSolicitationPdf(selectedTender, d)}>{d}<b>PDF ↓</b></button>)}</article>
              <article className="bidder-access"><span>02</span><h3>Bidder account</h3>{!loggedIn ? <><div className="access-switch"><button className={bidderMode==="signin"?"active":""} onClick={()=>setBidderMode("signin")}>Sign in</button><button className={bidderMode==="register"?"active":""} onClick={()=>setBidderMode("register")}>Register company</button></div>{bidderMode==="signin"?<form className="compact-form" onSubmit={signInBidder}><label>Account email<input required type="email" value={bidderEmail} onChange={(e) => setBidderEmail(e.target.value)} placeholder="evaluator@example.com" /></label><label>Password<input required minLength={8} type="password" value={bidderPassword} onChange={e=>setBidderPassword(e.target.value)} /></label><button className="button primary">Sign in to bidder dashboard →</button></form>:<form className="compact-form registration-form" onSubmit={registerBidder}><label>Legal business name<input required value={bidder} onChange={e=>setBidder(e.target.value)} placeholder="Company legal name" /></label><label>Business email<input required type="email" value={bidderEmail} onChange={e=>setBidderEmail(e.target.value)} /></label><label>Create password<input required minLength={8} type="password" value={bidderPassword} onChange={e=>setBidderPassword(e.target.value)} /></label><label>Contact person<input required placeholder="Authorized representative" /></label><label>Phone number<input required placeholder="+231 ..." /></label><fieldset><legend>Business specialties</legend><div className="specialty-grid">{["Construction & works","IT & digital services","Agriculture & food security","Solar & renewable energy","Supplies & general merchandise","Consulting & professional services","Logistics & transportation","Catering & events"].map(s=><label key={s}><input type="checkbox" checked={bidderSpecialties.includes(s)} onChange={e=>setBidderSpecialties(x=>e.target.checked?[...x,s]:x.filter(v=>v!==s))}/><span>{s}</span></label>)}</div></fieldset><label>Business registration <small>Required · PDF/DOC · Multiple files supported</small><input required multiple type="file" accept=".pdf,.doc,.docx" onChange={e=>setBidderCredentialFiles(x=>({...x,registration:e.target.files?.[0]}))}/></label><label>Tax clearance <small>Recommended · Multiple files supported</small><input multiple type="file" accept=".pdf,.doc,.docx" onChange={e=>setBidderCredentialFiles(x=>({...x,tax:e.target.files?.[0]}))}/></label><label>Certifications / licenses <small>Multiple supporting credentials</small><input type="file" multiple accept=".pdf,.doc,.docx" onChange={e=>setBidderCredentialFiles(x=>({...x,certifications:e.target.files?.[0]}))}/></label><label className="declaration"><input required type="checkbox"/><span>I confirm that I am authorized to register this business.</span></label><button className="button primary">Create persistent bidder account →</button></form>}</> : <div className="signed-in"><b>{bidder}</b><span>{bidderEmail}</span><em>{bidderProfileComplete?"Persistent compliance profile":"Signed-in bidder"}</em><button onClick={() => setLoggedIn(false)}>Sign out</button></div>}</article>
            </div>
            {loggedIn && <nav className="bidder-dashboard-nav"><button className={bidderWorkspaceTab==="opportunity"?"active":""} onClick={()=>setBidderWorkspaceTab("opportunity")}>Eligible RFQ/RFPs</button><button disabled={!tenderSelected} className={bidderWorkspaceTab==="submission"?"active":""} onClick={()=>setBidderWorkspaceTab("submission")}>Proposal submission</button><button disabled={!tenderSelected} className={bidderWorkspaceTab==="clarifications"?"active":""} onClick={()=>setBidderWorkspaceTab("clarifications")}>Clarifications <b>{clarifications.length}</b></button><button className={bidderWorkspaceTab==="profile"?"active":""} onClick={()=>setBidderWorkspaceTab("profile")}>Compliance profile</button></nav>}
            {loggedIn && bidderWorkspaceTab==="opportunity" && (!tenderSelected?<div className="selection-gate"><span>01</span><div><p className="eyebrow">Required first step</p><h3>Select an eligible RFQ/RFP</h3><p>Choose an aligned opportunity from the left. Proposal and Clarification tools remain locked until a specific procurement is selected.</p></div></div>:<div className="bidder-welcome"><div><p className="eyebrow">Selected opportunity</p><h3>{selectedTender.title}</h3><p>{selectedTender.description}</p></div><button className="button primary" onClick={()=>setBidderWorkspaceTab("clarifications")}>Ask about this RFQ/RFP →</button></div>)}
            {loggedIn && tenderSelected && bidderWorkspaceTab==="submission" && selectedTender.status === "Open" && <div className="submission">
              <div className="submission-heading">
                <div>
                  <p className="eyebrow">Proposal submission</p>
                  <h3>Required attachments</h3>
                </div>
                <div className="submission-stats-badge">
                  <b>{attachments.filter((a) => (a.files && a.files.length > 0) || a.file).length}/{attachments.filter((a) => a.required).length} categories completed</b>
                  <span> · {attachments.reduce((sum, a) => sum + (a.files?.length || (a.file ? 1 : 0)), 0)} files attached</span>
                </div>
              </div>

              <div className="attachment-grid">
                {attachments.map((a) => {
                  const itemFiles = a.files && a.files.length > 0 ? a.files : (a.file ? [a.file] : []);
                  const isDone = itemFiles.length > 0;
                  const totalSizeKb = (itemFiles.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(0);

                  return (
                    <div className={`attachment ${isDone ? "attached" : ""}`} key={a.key}>
                      <div className="attachment-top">
                        <span className={`attachment-req-tag ${a.required ? "req" : "opt"}`}>
                          {a.required ? "Required" : "Optional"}
                        </span>
                        {isDone ? (
                          <span className="attachment-status-badge">
                            ✓ {itemFiles.length} file{itemFiles.length > 1 ? "s" : ""} ({totalSizeKb} KB)
                          </span>
                        ) : (
                          <span className="attachment-status-badge pending">
                            Multiple files allowed
                          </span>
                        )}
                      </div>

                      <b className="attachment-title">{a.label}</b>

                      {itemFiles.length === 0 ? (
                        <div className="attachment-empty-drop">
                          <small>PDF, DOC or DOCX · up to 15 MB each</small>
                          <label className="upload-trigger-btn">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx"
                              onChange={(e) => {
                                upload(a.key, e.target.files);
                                e.target.value = "";
                              }}
                            />
                            <span>+ Choose file(s)</span>
                          </label>
                        </div>
                      ) : (
                        <div className="attachment-active-content">
                          <div className="attachment-file-list">
                            {itemFiles.map((file, idx) => (
                              <div key={`${file.name}-${idx}`} className="file-chip">
                                <span className="chip-icon">📄</span>
                                <span className="chip-name" title={file.name}>{file.name}</span>
                                <span className="chip-size">{(file.size / 1024).toFixed(0)} KB</span>
                                <button
                                  type="button"
                                  className="chip-action download"
                                  title={`Download ${file.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    downloadFileOrStored(file);
                                  }}
                                >
                                  ↓
                                </button>
                                <button
                                  type="button"
                                  className="chip-action remove"
                                  title={`Remove ${file.name}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeAttachmentFile(a.key, file.name);
                                  }}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="attachment-foot-row">
                            <label className="add-more-btn">
                              <input
                                type="file"
                                multiple
                                accept=".pdf,.doc,.docx"
                                onChange={(e) => {
                                  upload(a.key, e.target.files);
                                  e.target.value = "";
                                }}
                              />
                              <span>+ Add more files</span>
                            </label>
                            <span className="attachment-total-meta">
                              Total: {totalSizeKb} KB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <label className="declaration"><input type="checkbox" checked={declaration} onChange={(e) => setDeclaration(e.target.checked)} /><span>I declare that the submitted information is accurate and I am authorized to submit this proposal.</span></label>
              <button className="button primary submit-button" onClick={submitBid}>Validate and submit proposal →</button>
              {receipt && (
                <div className="receipt">
                  <span>Submission receipt</span>
                  <b>{receipt}</b>
                  <p>Timestamp: {new Date().toLocaleString()} · Status: Received in demonstration sandbox · {attachments.reduce((sum, a) => sum + (a.files?.length || (a.file ? 1 : 0)), 0)} documents attached</p>
                  <button onClick={() => {
                    const allFilesList = attachments
                      .filter(a => (a.files && a.files.length > 0) || a.file)
                      .map(a => `- ${a.label}: ${(a.files && a.files.length > 0 ? a.files : [a.file!]).map(f => `${f.name} (${(f.size/1024).toFixed(0)} KB)`).join(", ")}`)
                      .join("\n");
                    downloadDemo(`Submission Receipt ${receipt}`, `BIDDER: ${bidder}\nTENDER: ${selectedTender.ref} - ${selectedTender.title}\nSTATUS: Received in electronic procurement system\nTIMESTAMP: ${new Date().toLocaleString()}\n\nATTACHED PROPOSAL DOCUMENTS:\n${allFilesList}\n\nLiberia Agency for Community Development · Electronic Procurement Portal`);
                  }}>Download receipt</button>
                </div>
              )}
            </div>}
            {(!loggedIn || bidderWorkspaceTab==="clarifications") && <div className="clarification-centre" id="clarifications"><p className="eyebrow">Tender-specific clarifications</p><h3>Questions and official LACD responses</h3><p>Clarification messages are attached to <b>{selectedTender.ref}</b> and remain visible in your bidder account.</p><div className="thread">{clarifications.map((c, i) => <article key={`${c.time}-${i}`}><b>{c.from}</b><p>{c.text}</p><small>{c.time}</small></article>)}</div>{loggedIn ? <form onSubmit={sendClarification}><label><span>Subject / clause reference</span><input required placeholder="Example: TOR section 4.2" /></label><label><span>Clarification question</span><textarea required value={clarification} onChange={(e) => setClarification(e.target.value)} placeholder="State the question clearly without including confidential bid information." /></label><label><span>Supporting attachment (optional)</span><input type="file" accept=".pdf,.doc,.docx" /></label><button className="button primary">Send clarification to LACD →</button></form> : <div className="callout"><b>Want to ask LACD a question?</b><p>Sign in or register a bidder account above, then open the Clarifications tab.</p></div>}</div>}
            {loggedIn && bidderWorkspaceTab==="profile" && <section className="bidder-profile"><div><p className="eyebrow">Company profile</p><h3>{bidder}</h3><p>{bidderEmail}</p><strong className={bidderCompliant?"compliance-pass":"compliance-hold"}>{bidderCompliant?"Compliant · eligible for matching opportunities":"Compliance hold · opportunities restricted"}</strong></div><div><b>Approved specialties</b>{bidderSpecialties.length?bidderSpecialties.map(x=><span className="focus-chip" key={x}>{x}</span>):<p>Add specialties during registration or profile editing.</p>}</div><div className="credential-status"><b>Compliance documents and validity</b>{([['registration','Business registration'],['tax','Tax clearance'],['certifications','Certificates / licenses']] as const).map(([key,label])=><label key={key}><span>{bidderCredentialFiles[key]?`✓ ${label} uploaded`:`○ ${label} pending`}</span><small>Valid through</small><input type="date" value={credentialExpiry[key]} onChange={e=>setCredentialExpiry(x=>({...x,[key]:e.target.value}))}/></label>)}<button onClick={()=>{setBidderMode("register");setLoggedIn(false)}}>Update documents and specialties</button></div></section>}
          </section>
        </div>
      </Page>}

      {view === "contact" && <Page title="Contact, feedback and safeguarding" eyebrow="Talk with LACD" intro="Use the appropriate channel for general enquiries, programme feedback, partnership requests or confidential safeguarding concerns.">
        <div className="contact-grid"><article className="contact-card"><p className="eyebrow">Contact information</p><h2>Let’s connect.</h2><p className="contact-intro">Our team will route your message to the appropriate LACD unit and acknowledge receipt.</p><div className="contact-detail"><span>⌖</span><div><small>Visit our office</small><b>Chugbor Road, Old Road<br/>Monrovia, Liberia</b></div></div><div className="contact-detail"><span>☎</span><div><small>Call us</small><a href="tel:+231777011212">+231 777 011 212</a></div></div><div className="contact-detail"><span>✉</span><div><small>Official emails</small><a href="mailto:lacommunitydevelopment1@gmail.com">lacommunitydevelopment1@gmail.com</a><a href="mailto:emmanuelpaye1978@gmail.com" style={{marginTop:"4px"}}>emmanuelpaye1978@gmail.com</a></div></div><button className="contact-download" onClick={() => downloadDemo("LACD contact information", "Liberia Agency for Community Development\nChugbor Road, Old Road, Monrovia, Liberia\nPhone: +231 777 011 212\nEmails: lacommunitydevelopment1@gmail.com / emmanuelpaye1978@gmail.com")}>Download contact card ↓</button><div className="social-row"><a target="_blank" rel="noreferrer" href="https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/">Facebook ↗</a><a target="_blank" rel="noreferrer" href="https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Flacd-concept-demo.mgwoah.chatgpt.site">LinkedIn ↗</a></div></article><form className="contact-form" onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const formData = new FormData(form);
          const channel = (form.elements[0] as HTMLSelectElement).value;
          const name = (form.elements[1] as HTMLInputElement).value;
          const email = (form.elements[2] as HTMLInputElement).value;
          const phone = (form.elements[3] as HTMLInputElement).value;
          const subject = (form.elements[4] as HTMLInputElement).value;
          const message = (form.elements[5] as HTMLTextAreaElement).value;
          form.reset();

          if (channel === "Safeguarding concern" || channel === "Programme feedback") {
            const ticketId = `LACD-GRV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
            const newGrievance: VaultComplaintRecord = {
              id: ticketId,
              category: channel === "Safeguarding concern" ? "Safeguarding & Harassment" : "Service Delivery Quality",
              complainantName: name || "Confidential Community Member",
              complainantContact: email || phone || "Protected Channel",
              submittedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
              severity: channel === "Safeguarding concern" ? "Critical / High" : "Medium",
              subject: subject || "Community Grievance",
              details: message,
              status: "Received & Acknowledged",
              assignedOfficer: "Safeguarding & Ethics Focal Point",
              investigationNotes: [
                `${new Date().toLocaleDateString("en-GB")}: Confidential grievance logged via portal and registered into the Safeguarding Document Vault. Case review initiated under 48h protocol.`
              ]
            };
            setVaultComplaints(prev => [newGrievance, ...prev]);
            alert(`Safeguarding grievance ${ticketId} registered in the confidential Document Vault. Acknowledged under 48h protocol.`);
          } else {
            alert("Enquiry LACD-DEMO-1048 received. A confirmation has been sent to your email.");
          }
        }}><div className="form-heading"><p className="eyebrow">Send a message</p><h2>How can LACD help?</h2><p>Fields marked with * are required. You may also contact executive management directly via <b>emmanuelpaye1978@gmail.com</b>.</p></div><label>Enquiry type *<select required><option value="">Select a channel</option><option>General enquiry</option><option>Programme feedback</option><option>Partnership request</option><option>Media enquiry</option><option>Safeguarding concern</option></select></label><label>Full name *<input required placeholder="Your full name" /></label><label>Email address *<input required type="email" placeholder="name@example.com" /></label><label>Phone number<input placeholder="+231 ..." /></label><label className="contact-subject">Subject *<input required placeholder="Briefly describe your enquiry" /></label><label className="contact-message">Message *<textarea required placeholder="Provide the details needed for LACD to respond." /></label><label className="declaration"><input type="checkbox" required /><span>I consent to LACD processing this enquiry in accordance with its Privacy Policy.</span></label><button className="button primary">Send enquiry securely →</button></form></div><div className="map-card"><iframe title="LACD location map" loading="lazy" src="https://www.google.com/maps?q=Chugbor%20Road%2C%20Old%20Road%2C%20Monrovia%2C%20Liberia&output=embed" /><div><p className="eyebrow">Find LACD</p><h2>Chugbor Road, Old Road, Monrovia.</h2><p>Use the interactive map to pan, zoom and open directions. Exact production pin placement will be confirmed by LACD.</p><a href="https://www.google.com/maps/search/Chugbor+Road+Old+Road+Monrovia+Liberia" target="_blank" rel="noreferrer">Open directions in Google Maps →</a></div></div>
      </Page>}

      {view === "donate" && (
        <DonatePage 
          alert={alert} 
          navigate={navigate} 
          onRecordDonation={(donation) => setVaultDonations(prev => [donation, ...prev])} 
        />
      )}

      {view === "vault" && (
        <DocumentVaultPage
          role={vaultRole}
          setRole={setVaultRole}
          tab={vaultTab}
          setTab={setVaultTab}
          bids={vaultBids}
          setBids={setVaultBids}
          donations={vaultDonations}
          setDonations={setVaultDonations}
          complaints={vaultComplaints}
          setComplaints={setVaultComplaints}
          institutional={vaultInstitutional}
          selectedDossier={selectedBidDossier}
          setSelectedDossier={setSelectedBidDossier}
          isAuthModalOpen={vaultAuthModalOpen}
          setIsAuthModalOpen={setVaultAuthModalOpen}
          grievanceModalOpen={grievanceModalOpen}
          setGrievanceModalOpen={setGrievanceModalOpen}
          alert={alert}
          navigate={navigate}
        />
      )}

      {view === "admin" && !staffLoggedIn && <Page title="Staff portal" eyebrow="Authentication required" intro="Sign in to open a role-based dashboard with only the tools assigned to your account."><div className="signin-required"><span>⌾</span><h2>Protected staff workspace</h2><p>The public website remains available without an account. Content, media, user, analytics and maintenance tools require staff authentication.</p><button className="button primary" onClick={()=>setLoginOpen(true)}>Open staff sign in →</button></div></Page>}

      {view === "admin" && staffLoggedIn && <div className="dashboard-shell"><aside className="dashboard-sidebar"><div className="dashboard-user"><img src={asset("/lacd-logo.jpg")} alt="" /><span><b>Demo Staff User</b><small>{staffRole}</small></span></div><nav><button onClick={()=>navigate("home")}><span>⌂</span>Public website</button>{rolePanels[staffRole].map(panel=><button className={adminPanel===panel?"active":""} key={panel} onClick={()=>setAdminPanel(panel)}><span>{({Content:"▤",Media:"◫",Users:"◎",Newsletter:"✉",SEO:"⌕",Analytics:"◒",Backups:"↻",Procurement:"◆"} as Record<string,string>)[panel]}</span>{panel}</button>)}</nav><div className="role-summary"><b>RBAC active</b><p>{rolePanels[staffRole].length} authorized module{rolePanels[staffRole].length===1?"":"s"}</p></div><button className="sidebar-signout" onClick={()=>{setStaffLoggedIn(false);navigate("home");alert("Signed out of the staff dashboard.")}}>Sign out</button></aside><div className="dashboard-main"><Page title={`${staffRole} dashboard`} eyebrow="Role-based staff workspace" intro="Your navigation and tools are automatically limited to the permissions assigned to this demonstration role.">
        <div className="admin-banner"><div><b>Demo Staff User</b><span>{staffRole} · Role-based permissions active</span></div><span>Evaluator sandbox</span></div>
        {adminPanel === "Content" && <><section className="rich-cms-panel"><div className="rich-cms-heading"><div><p className="eyebrow">Institutional rich-content CMS</p><h2>Edit every page and subsection</h2></div><select value={editorPage} onChange={e=>setEditorPage(e.target.value)}>{["Home","About LACD","Vision, Mission & Values","Strategic Plan","Programmes","Projects","News & stories","Gallery","Partners & donors","Public information","Procurement","Careers","Events","Contact","Privacy Policy","Terms of Use"].map(x=><option key={x}>{x}</option>)}</select></div><RichTextEditor value={richContent[editorPage]||"<h2>New page content</h2><p>Add approved LACD content here.</p>"} onChange={html=>setRichContent(x=>({...x,[editorPage]:html}))}/><div className="cms-publish-bar"><span>Autosaved draft · version history and audit attribution enabled</span><button onClick={()=>{setAdminLog(x=>[`${editorPage} rich content published`,...x]);alert(`${editorPage} content published to the public website.`)}}>Publish page changes →</button></div></section><div className="admin-grid">
          <form className="admin-card solicitation-builder" onSubmit={publishContent}><h3>Create and manage content</h3><label>Content type<select value={adminType} onChange={(e) => setAdminType(e.target.value)}><option>News</option><option>Success Story</option><option>Event</option><option>Vacancy</option><option>Report</option><option>Strategy</option><option>Brief</option><option>Policy</option><option>Procurement notice</option></select></label><label>Title<input required value={adminTitle} onChange={(e) => setAdminTitle(e.target.value)} placeholder="Enter a demonstration title" /></label><label>Summary / introductory text<textarea required value={adminSummary} onChange={(e)=>setAdminSummary(e.target.value)} placeholder="Provide a concise public summary" /></label>{adminType !== "Procurement notice"&&<label>Workflow status<select value={adminStatus} onChange={e=>setAdminStatus(e.target.value as typeof adminStatus)}><option>Published</option><option>Draft</option><option>Scheduled</option><option>Archived</option></select></label>}{adminType === "Procurement notice" && <div className="document-builder"><div className="builder-heading"><span>Solicitation package builder</span><b>4 branded PDFs</b></div><label>Procurement reference<input value={adminReference} onChange={(e) => setAdminReference(e.target.value)} placeholder="Auto-generated if left blank" /></label><label>Submission deadline<input required type="date" value={adminDeadline} onChange={(e) => setAdminDeadline(e.target.value)} /></label><label>Scope and deliverables<textarea required value={adminScope} onChange={(e) => setAdminScope(e.target.value)} /></label><label>Eligibility and required evidence<textarea required value={adminEligibility} onChange={(e) => setAdminEligibility(e.target.value)} /></label><label>Evaluation methodology<textarea required value={adminEvaluation} onChange={(e) => setAdminEvaluation(e.target.value)} /></label><label>Submission instructions<textarea required value={adminSubmission} onChange={(e) => setAdminSubmission(e.target.value)} /></label><div className="package-preview"><b>Documents generated on publication</b><span>Request for Quotation.pdf</span><span>Terms of Reference.pdf</span><span>Financial Schedule.pdf</span><span>Bidder Submission Forms.pdf</span></div></div>}<label>Publication / schedule date<input type="date" defaultValue="2026-07-31" /></label>{adminType !== "Procurement notice" && <label>Featured image or document<input type="file" /></label>}<button className="button primary">{adminType === "Procurement notice" ? "Generate PDFs and publish procurement" : `${adminStatus} record`}</button></form>
          <article className="admin-card"><h3>Evaluator journeys</h3>{[{ t: "About & governance", v: "about" }, { t: "Vision and mission", v: "vision" }, { t: "Strategic Plan", v: "strategy" }, { t: "News directory", v: "news" }, { t: "Success stories", v: "stories" }, { t: "Careers", v: "careers" }, { t: "Events calendar", v: "events" }, { t: "Media galleries", v: "gallery" }, { t: "Procurement", v: "procurement" }].map((x) => <button className="journey-link" key={x.v} onClick={() => navigate(x.v as View)}><span>Ready to test</span><b>{x.t}</b><i>→</i></button>)}</article>
          <article className="admin-card audit"><h3>Recent audit activity</h3>{adminLog.map((x, i) => <div key={`${x}-${i}`}><i /><span><b>{x}</b><small>{i ? `${i + 1} hours ago` : "Just now"} · Demo Administrator</small></span></div>)}</article>
          <section className="admin-card full-site-manager"><div className="records-heading"><div><p className="eyebrow">Administrator · full website</p><h3>Pages, navigation and reusable sections</h3></div><button onClick={()=>{const title=window.prompt("New website page or navigation item");if(title)setWebsiteRecords(x=>[...x,{id:Date.now(),title,type:"Website page",status:"Draft"}])}}>+ Create page</button></div>{websiteRecords.map(record=><article key={record.id}><div><b>{record.title}</b><small>{record.type} · {record.status}</small></div><select value={record.status} onChange={e=>setWebsiteRecords(x=>x.map(a=>a.id===record.id?{...a,status:e.target.value}:a))}><option>Published</option><option>Draft</option><option>Archived</option></select><span className="record-actions"><button onClick={()=>{const title=window.prompt("Edit page/navigation title",record.title);if(title)setWebsiteRecords(x=>x.map(a=>a.id===record.id?{...a,title}:a))}}>Edit</button><button className="danger" onClick={()=>window.confirm(`Delete ${record.title}?`)&&setWebsiteRecords(x=>x.filter(a=>a.id!==record.id))}>Delete</button></span></article>)}</section>
          <section className="admin-card full-site-manager"><div className="records-heading"><div><p className="eyebrow">Homepage media</p><h3>Carousel slides</h3></div><button onClick={()=>{const title=window.prompt("New carousel slide title");if(title)setCarouselActivities(x=>[...x,{title,caption:"New CMS-managed LACD activity slide.",image:"/activities/lacd-community-distribution.png",url:"https://www.facebook.com/p/Liberia-Agency-For-Community-Development-100054497019309/"}])}}>+ Create slide</button></div>{carouselActivities.map((slide,index)=><article key={`${slide.title}-${index}`}><div><b>{slide.title}</b><small>Carousel slide · position {index+1}</small></div><span>Published</span><span className="record-actions"><button onClick={()=>{const title=window.prompt("Edit slide title",slide.title);if(title)setCarouselActivities(x=>x.map((a,i)=>i===index?{...a,title}:a))}}>Edit</button><button className="danger" onClick={()=>window.confirm(`Delete ${slide.title}?`)&&setCarouselActivities(x=>x.filter((_,i)=>i!==index))}>Delete</button></span></article>)}</section>
          <section className="admin-card full-site-manager"><div className="records-heading"><div><p className="eyebrow">Our work</p><h3>Six programme areas</h3></div><button onClick={()=>{const title=window.prompt("New programme title");if(title)setProgrammes(x=>[...x,{icon:"◆",title,text:"New CMS-managed programme overview.",county:"National"}])}}>+ Create programme</button></div>{programmes.map((programme,index)=><article key={`${programme.title}-${index}`}><div><b>{programme.title}</b><small>Programme · {programme.county}</small></div><span>Published</span><span className="record-actions"><button onClick={()=>{const title=window.prompt("Edit programme title",programme.title);if(title)setProgrammes(x=>x.map((a,i)=>i===index?{...a,title}:a))}}>Edit</button><button className="danger" onClick={()=>window.confirm(`Delete ${programme.title}?`)&&setProgrammes(x=>x.filter((_,i)=>i!==index))}>Delete</button></span></article>)}</section>
          <section className="admin-card content-records"><div className="records-heading"><div><p className="eyebrow">Full administrator control</p><h3>All website content</h3></div><b>{contentItems.length+resources.length+opportunities.length} managed records</b></div><h4>News, stories, careers and events</h4>{contentItems.map(item=><div key={item.id}><span><b>{item.title}</b><small>{item.type} · {item.author}</small></span><select value={item.cmsStatus||"Published"} onChange={e=>{const next=e.target.value as ContentItem["cmsStatus"];setContentItems(x=>x.map(a=>a.id===item.id?{...a,cmsStatus:next}:a));setAdminLog(x=>[`${item.title} moved to ${next}`,...x]);}}><option>Published</option><option>Draft</option><option>Scheduled</option><option>Archived</option></select><span className="record-actions"><button onClick={()=>{const title=window.prompt("Edit title",item.title);if(title){setContentItems(x=>x.map(a=>a.id===item.id?{...a,title}:a));setAdminLog(x=>[`${item.title} edited`,...x]);}}}>Edit</button><button className="danger" onClick={()=>{if(window.confirm(`Delete ${item.title}?`)){setContentItems(x=>x.filter(a=>a.id!==item.id));setAdminLog(x=>[`${item.title} deleted`,...x]);}}}>Delete</button></span></div>)}<h4>Publications and policies</h4>{resources.map(item=><div key={item.id}><span><b>{item.title}</b><small>{item.type} · {item.year}</small></span><b>Published</b><span className="record-actions"><button onClick={()=>{const title=window.prompt("Edit title",item.title);if(title)setResources(x=>x.map(a=>a.id===item.id?{...a,title}:a));}}>Edit</button><button className="danger" onClick={()=>window.confirm(`Delete ${item.title}?`)&&setResources(x=>x.filter(a=>a.id!==item.id))}>Delete</button></span></div>)}<h4>Procurement opportunities</h4>{opportunities.map(item=><div key={item.ref}><span><b>{item.title}</b><small>{item.ref} · {item.deadline}</small></span><select value={item.status} onChange={e=>setOpportunities(x=>x.map(a=>a.ref===item.ref?{...a,status:e.target.value}:a))}><option>Open</option><option>Closed</option><option>Draft</option><option>Archived</option></select><span className="record-actions"><button onClick={()=>{setAdminPanel("Procurement");setAdminTitle(item.title);setAdminSummary(item.description);setAdminReference(item.ref)}}>Edit</button><button className="danger" onClick={()=>window.confirm(`Delete ${item.title}?`)&&setOpportunities(x=>x.filter(a=>a.ref!==item.ref))}>Delete</button></span></div>)}</section>
        </div></>}
        {adminPanel === "Procurement" && <section className="manager-layout procurement-manager"><form onSubmit={publishProcurement}><p className="eyebrow">Authorized procurement workflow</p><h2>Create procurement opportunity</h2><label>Opportunity title<input required value={adminTitle} onChange={e=>setAdminTitle(e.target.value)} /></label><label>Public summary<textarea required value={adminSummary} onChange={e=>setAdminSummary(e.target.value)} /></label><label>Reference number<input value={adminReference} onChange={e=>setAdminReference(e.target.value)} placeholder="Auto-generated if blank" /></label><label>Submission deadline<input required type="date" value={adminDeadline} onChange={e=>setAdminDeadline(e.target.value)} /></label><label>Scope and deliverables<textarea required value={adminScope} onChange={e=>setAdminScope(e.target.value)} /></label><label>Eligibility and evidence<textarea required value={adminEligibility} onChange={e=>setAdminEligibility(e.target.value)} /></label><label>Evaluation methodology<textarea required value={adminEvaluation} onChange={e=>setAdminEvaluation(e.target.value)} /></label><label>Submission instructions<textarea required value={adminSubmission} onChange={e=>setAdminSubmission(e.target.value)} /></label><button className="button primary">Generate branded PDFs and publish →</button></form><div className="record-table"><h2>Published opportunities</h2>{opportunities.map(o=><article key={o.ref}><span className={o.status==="Open"?"user-active":"user-inactive"}>{o.status}</span><div><b>{o.title}</b><small>{o.ref} · {o.deadline}</small></div><button onClick={()=>{setSelectedTender(o);navigate("procurement")}}>Open public record</button></article>)}</div></section>}
        {adminPanel === "Media" && <MediaManager alert={alert} />}
        {adminPanel === "Users" && <UserManager users={cmsUsers} setUsers={setCmsUsers} alert={alert} />}
        {adminPanel === "Newsletter" && <NewsletterManager subscribers={subscribers} setSubscribers={setSubscribers} alert={alert} />}
        {adminPanel === "SEO" && <SeoManager alert={alert} />}
        {adminPanel === "Analytics" && <AnalyticsDashboard />}
        {adminPanel === "Backups" && <BackupManager log={adminLog} setLog={setAdminLog} alert={alert} />}
        <div className="callout"><b>Persistent evaluator environment:</b> CMS changes, bidder accounts, compliance documents, procurement notices, clarifications, proposal attachments, receipts and audit activity are stored in the platform database and object store. Refresh or sign back in to verify recovery. Final commissioning will replace demonstration identities and sample content with LACD-approved accounts, policies and records.</div>
      </Page></div></div>}

      {selectedResource && (
        <ResourceViewerModal
          resource={selectedResource}
          onClose={() => setSelectedResource(null)}
          onDownload={(res) => void downloadBrandedPdf(res.title, res, res.type)}
        />
      )}

      <footer>
        <div className="footer-brand"><img src={asset("/lacd-logo.jpg")} alt="" /><div><b>Liberia Agency for<br />Community Development</b><p>Local agency. Shared progress.</p></div></div>
        <div><h3>Explore LACD</h3><button onClick={() => navigate("about")}>About LACD</button><button onClick={() => navigate("vision")}>Vision, Mission & Values</button><button onClick={() => navigate("strategy")}>Strategic Plan</button><button onClick={() => navigate("news")}>News & Updates</button><button onClick={() => navigate("stories")}>Success Stories</button><button onClick={() => navigate("careers")}>Careers</button><button onClick={() => navigate("events")}>Events Calendar</button><button onClick={() => navigate("gallery")}>Gallery</button><button onClick={() => navigate("partners")}>Partners & donors</button><button onClick={() => navigate("donate")}>♥ Donate & Support</button></div>
        <div><h3>Public Records & Governance</h3><button onClick={() => navigate("resources")}>Public Information & Publications</button><button onClick={() => navigate("procurement")}>Procurement & Tenders</button><button onClick={() => navigate("projects")}>Project Results & M&E</button><button onClick={() => navigate("contact")}>Contact & Public Feedback</button><button onClick={() => navigate("privacy")}>Privacy Policy</button><button onClick={() => navigate("terms")}>Terms of Use</button><button className="footer-vault-link" onClick={() => navigate("vault")}>🔒 Staff & Officer Governance Vault (RBAC)</button><button onClick={() => navigate("admin")}>CMS Administration</button></div>
        <div className="footer-bottom"><span>Interactive concept demonstration prepared by TOTAG IT Services for RFQ evaluation.</span><span>Contact: emmanuelpaye1978@gmail.com · lacommunitydevelopment1@gmail.com</span><span className="footer-discreet-links"><button onClick={() => navigate("vault")} className="discreet-vault-btn">🔒 Internal Vault Portal</button> · <span>Responsive · Accessible · Secure-by-design</span></span></div>
      </footer>
    </main>
  );
}

function ResourceViewerModal({
  resource,
  onClose,
  onDownload,
}: {
  resource: Resource;
  onClose: () => void;
  onDownload: (res: Resource) => void;
}) {
  const [activeTab, setActiveTab] = useState<"reader" | "highlights">("reader");
  const [fontSize, setFontSize] = useState<"normal" | "large">("normal");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div className="resource-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-doc-title">
      <div className="resource-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="resource-modal-topbar">
          <div className="modal-brand">
            <img src={asset("/lacd-logo.jpg")} alt="LACD" className="modal-brand-logo" />
            <div className="modal-brand-text">
              <span className="modal-agency">Liberia Agency for Community Development</span>
              <span className="modal-sub">Public Information Centre · Official Document Viewer</span>
            </div>
          </div>
          <div className="modal-top-actions">
            <div className="view-mode-tabs">
              <button
                type="button"
                className={`tab-btn ${activeTab === "reader" ? "active" : ""}`}
                onClick={() => setActiveTab("reader")}
              >
                Document Reader
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === "highlights" ? "active" : ""}`}
                onClick={() => setActiveTab("highlights")}
              >
                Key Highlights & Data
              </button>
            </div>
            <button
              type="button"
              className="modal-font-toggle"
              onClick={() => setFontSize((s) => (s === "normal" ? "large" : "normal"))}
              title="Toggle reading text size"
            >
              {fontSize === "normal" ? "A+" : "A-"}
            </button>
            <button
              type="button"
              className="modal-download-btn"
              onClick={() => onDownload(resource)}
            >
              <span>Download PDF ↓</span>
            </button>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close document viewer"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="resource-modal-header">
          <div className="doc-meta-pills">
            <span className="doc-badge type-badge">{resource.type}</span>
            <span className="doc-badge year-badge">{resource.year}</span>
            {resource.pages && <span className="doc-badge pages-badge">{resource.pages} Pages</span>}
            <span className="doc-badge category-badge">{resource.category || "Public Record"}</span>
            <span className="doc-badge public-badge">Open Access · Public Domain</span>
          </div>
          <h1 id="modal-doc-title" className="modal-doc-title">{resource.title}</h1>
          <p className="modal-doc-meta-line">
            <b>Published by:</b> {resource.author || "Liberia Agency for Community Development"} · <b>Legal Entity:</b> Registered under Liberian Law (Est. 2013)
          </p>
          <p className="modal-doc-summary-lead">
            {resource.summary}
          </p>
        </div>

        <div className={`resource-modal-body ${fontSize === "large" ? "large-font" : ""}`}>
          {activeTab === "highlights" ? (
            <div className="modal-highlights-view">
              <div className="highlights-hero">
                <h3>Executive Highlights & Strategic Impact</h3>
                <p>Key indicators, verified outcomes and strategic metrics extracted from this official publication.</p>
              </div>
              <div className="highlights-grid">
                {resource.highlights?.map((h, i) => (
                  <div key={i} className="highlight-metric-card">
                    <span className="metric-index">0{i + 1}</span>
                    <p className="metric-desc">{h}</p>
                  </div>
                ))}
              </div>
              <div className="highlights-cta">
                <p>Read the full document with complete methodology, empirical data, and governance statements:</p>
                <button type="button" className="button primary" onClick={() => setActiveTab("reader")}>
                  Switch to Document Reader →
                </button>
              </div>
            </div>
          ) : (
            <div className="modal-reader-layout">
              {resource.sections && resource.sections.length > 0 && (
                <aside className="modal-toc-sidebar">
                  <h4>Table of Contents</h4>
                  <nav>
                    {resource.sections.map((sec, idx) => (
                      <a key={idx} href={`#doc-section-${idx}`} className="toc-link">
                        <span className="toc-num">{idx + 1}</span>
                        <span className="toc-text">{sec.heading}</span>
                      </a>
                    ))}
                  </nav>
                  <div className="sidebar-cert-box">
                    <div className="cert-badge">✓ Official LACD Publication</div>
                    <p>Verified public information published in accordance with the LACD Transparency & Community Accountability Charter.</p>
                  </div>
                </aside>
              )}

              <article className="modal-doc-paper">
                <div className="paper-header-band">
                  <div className="paper-brand">
                    <img src={asset("/lacd-logo.jpg")} alt="LACD Seal" />
                    <div>
                      <strong>LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT</strong>
                      <small>Chugbor Road, Old Road, Monrovia, Liberia · Established 2013</small>
                    </div>
                  </div>
                  <div className="paper-seal">
                    <span>OFFICIAL</span>
                    <b>PUBLIC RECORD</b>
                  </div>
                </div>

                <div className="paper-intro-box">
                  <span className="intro-label">Executive Summary & Notice</span>
                  <p>{resource.summary}</p>
                </div>

                {resource.highlights && (
                  <div className="paper-highlights-inline">
                    <strong>Key Document Highlights:</strong>
                    <ul>
                      {resource.highlights.map((h, idx) => (
                        <li key={idx}>{h}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="paper-sections">
                  {resource.sections ? (
                    resource.sections.map((sec, idx) => (
                      <section key={idx} id={`doc-section-${idx}`} className="paper-section">
                        <h3>{sec.heading}</h3>
                        {sec.content.map((p, pIdx) => (
                          <p key={pIdx}>{p}</p>
                        ))}
                      </section>
                    ))
                  ) : (
                    resource.content ? (
                      resource.content.map((p, pIdx) => <p key={pIdx}>{p}</p>)
                    ) : (
                      <p>{resource.summary}</p>
                    )
                  )}
                </div>

                <div className="paper-footer-verification">
                  <div className="verification-details">
                    <b>Digital Document Verification</b>
                    <p>Liberia Agency for Community Development (LACD) · Open Knowledge & Community Accountability Repository.</p>
                    <small>Document ID: LACD-PUB-{resource.year}-{String(resource.id).padStart(3, "0")} · Published for unrestricted public review.</small>
                  </div>
                  <button
                    type="button"
                    className="button primary paper-download-btn"
                    onClick={() => onDownload(resource)}
                  >
                    Download Complete PDF ↓
                  </button>
                </div>
              </article>
            </div>
          )}
        </div>

        <div className="resource-modal-footer">
          <span>Viewing: <b>{resource.title}</b> ({resource.type} · {resource.year})</span>
          <div className="footer-actions">
            <button type="button" className="text-btn" onClick={onClose}>
              Close viewer
            </button>
            <button
              type="button"
              className="button primary footer-download-btn"
              onClick={() => onDownload(resource)}
            >
              Download PDF ↓
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Page({ title, eyebrow, intro, children }: { title: string; eyebrow: string; intro: string; children: React.ReactNode }) {
  return <><section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p>{intro}</p></section><section className="section page-content">{children}</section></>;
}

function AdminModule({ title, metric, items, action, onAction }: { title: string; metric: string; items: string[]; action: string; onAction: () => void }) {
  return <section className="module-panel"><div className="module-heading"><div><p className="eyebrow">CMS workflow</p><h2>{title}</h2></div><strong>{metric}</strong></div><div className="module-list">{items.map((item, index) => <article key={item}><span>{String(index + 1).padStart(2, "0")}</span><b>{item}</b><i>Ready</i></article>)}</div><button className="button primary" onClick={onAction}>{action}</button></section>;
}

function ContentDirectory({title,eyebrow,intro,items,onOpen,download}:{title:string;eyebrow:string;intro:string;items:ContentItem[];onOpen:(item:ContentItem)=>void;download?:(title:string,body:string)=>void}) {
  const [archive,setArchive]=useState("2026"); const [term,setTerm]=useState("");
  const shown=items.filter(x=>`${x.title} ${x.category} ${x.summary}`.toLowerCase().includes(term.toLowerCase()));
  return <Page title={title} eyebrow={eyebrow} intro={intro}><div className="directory-tools"><label>Search this directory<input value={term} onChange={e=>setTerm(e.target.value)} placeholder={`Search ${title.toLowerCase()}`} /></label><label>Archive year<select value={archive} onChange={e=>setArchive(e.target.value)}><option>2026</option><option>2025</option><option>2024</option></select></label><b>{shown.length} published record{shown.length===1?"":"s"}</b></div><div className="content-grid">{shown.map(item=><article key={item.id}><div className={`content-visual visual-${item.type.replace(" ","").toLowerCase()}`}><span>Featured image</span></div><small>{item.date} · {item.category}</small><h3>{item.title}</h3><p>{item.summary}</p><span className="byline">By {item.author}</span><button onClick={()=>onOpen(item)}>Open full {item.type.toLowerCase()} →</button>{item.type==="Vacancy"&&download&&<button className="download-link" onClick={()=>download(`${item.title} Job Description`,item.body)}>Download job description ↓</button>}</article>)}</div>{!shown.length&&<p className="empty">No published records match this search.</p>}</Page>;
}

function Newsletter({subscribers,setSubscribers,alert}:{subscribers:string[];setSubscribers:React.Dispatch<React.SetStateAction<string[]>>;alert:(text:string,type?:"success"|"info")=>void}) {
  const [email,setEmail]=useState("");
  return <section className="newsletter"><div><p className="eyebrow light">Stay informed</p><h2>Receive LACD news, events and opportunities.</h2><p>Subscribers receive an immediate confirmation and can manage their preferences or unsubscribe.</p></div><form onSubmit={e=>{e.preventDefault();if(subscribers.includes(email)) return alert("This email is already subscribed.","info");setSubscribers(x=>[...x,email]);setEmail("");alert("Subscription confirmed and added to the CMS mailing list.")}}><label><span className="sr-only">Email address</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Your email address" /></label><button>Subscribe →</button></form></section>;
}

function PolicyPage({kind}:{kind:"privacy"|"terms"}) {
  const privacy=[["Information we collect","Contact details submitted through enquiry, newsletter, career and procurement forms; technical security data necessary to protect the service."],["How information is used","To respond to requests, manage subscriptions, administer authorized services, improve accessibility and maintain institutional records."],["Protection and retention","Access controls, encryption, backups and approved retention schedules protect information. Records are retained only as necessary."],["Your rights and choices","Users may request access, correction, subscription removal or deletion where this does not conflict with legal and institutional obligations."],["Cookies and analytics","Essential cookies support security and preferences. Privacy-conscious analytics measure visits, pages, downloads, devices and broad geographic reach."]];
  const terms=[["Authoritative information","Official notices and solicitation documents control where website summaries differ. Users should verify deadlines and requirements in issued documents."],["Acceptable use","Users may not disrupt services, introduce malicious content, impersonate others or misuse information published by LACD."],["Downloads and intellectual property","Public documents may be downloaded for lawful reference. Logos, photographs and protected content remain subject to applicable rights."],["External links","LACD may link to approved partner, social-media and map services but does not control external services or their privacy practices."],["Changes and contact","LACD may update these terms and will publish the effective date. Questions may be submitted through the Contact page."]];
  const sections=kind==="privacy"?privacy:terms;
  return <Page title={kind==="privacy"?"Privacy Policy":"Terms of Use"} eyebrow="Digital trust and accountability" intro={kind==="privacy"?"How LACD collects, uses, protects and retains personal information submitted through its website.":"The conditions governing access to, reliance on and responsible use of LACD’s website and digital services."}><div className="policy-meta"><span>Effective date: 31 July 2026</span><span>CMS version: 1.0</span><button onClick={()=>downloadDemo(kind==="privacy"?"LACD Privacy Policy":"LACD Terms of Use",sections.map(x=>x.join("\n")).join("\n\n"))}>Download PDF-ready copy ↓</button></div><div className="policy-document">{sections.map(([a,b],i)=><section key={a}><span>{String(i+1).padStart(2,"0")}</span><div><h2>{a}</h2><p>{b}</p></div></section>)}</div></Page>;
}

function RichTextEditor({value,onChange}:{value:string;onChange:(html:string)=>void}){
  const command=(name:string,arg?:string)=>{document.execCommand(name,false,arg);};
  return <div className="rich-editor"><div className="editor-toolbar" aria-label="Formatting tools"><button type="button" onClick={()=>command("bold")}><b>B</b></button><button type="button" onClick={()=>command("italic")}><i>I</i></button><button type="button" onClick={()=>command("formatBlock","h2")}>Heading</button><button type="button" onClick={()=>command("insertUnorderedList")}>Bullets</button><button type="button" onClick={()=>command("createLink",window.prompt("Approved link URL")||"")}>Link</button><button type="button" onClick={()=>command("removeFormat")}>Clear</button><label>Featured image<input type="file" accept="image/jpeg,image/png,image/webp"/></label></div><div className="editor-canvas" contentEditable suppressContentEditableWarning dangerouslySetInnerHTML={{__html:value}} onInput={e=>onChange(e.currentTarget.innerHTML)}/></div>
}

function MediaManager({alert}:{alert:(text:string,type?:"success"|"info")=>void}) {
  const [records,setRecords]=useState(galleryItems.map((x,i)=>({...x,id:i+1,status:"Published"})));
  return <section className="manager-layout"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setRecords(x=>[{id:Date.now(),type:String(f.get("type")),title:String(f.get("title")),meta:`${f.get("date")} · ${f.get("programme")}`,status:"Published"},...x]);e.currentTarget.reset();alert("Media record published to the public gallery.")}}><h2>Create media record</h2><label>Media type<select name="type"><option>Photo</option><option>Video</option></select></label><label>Album / title<input required name="title" /></label><label>Caption<textarea required name="caption" /></label><label>Activity date<input required type="date" name="date" /></label><label>Programme / project category<select name="programme"><option>Food Security & Agriculture</option><option>Women & Youth</option><option>Climate & Clean Energy</option></select></label><label>Upload photo or add approved video<input required type="file" accept="image/*,video/*" /></label><button className="button primary">Upload and publish</button></form><div className="record-table"><h2>Gallery records</h2>{records.map(r=><article key={r.id}><span>{r.type}</span><div><b>{r.title}</b><small>{r.meta}</small></div><select value={r.status} onChange={e=>setRecords(x=>x.map(a=>a.id===r.id?{...a,status:e.target.value}:a))}><option>Published</option><option>Draft</option><option>Archived</option></select></article>)}</div></section>;
}

type CmsUser={id:number;name:string;email:string;role:string;active:boolean};
function UserManager({users,setUsers,alert}:{users:CmsUser[];setUsers:React.Dispatch<React.SetStateAction<CmsUser[]>>;alert:(text:string,type?:"success"|"info")=>void}) {
  return <section className="manager-layout"><form onSubmit={e=>{e.preventDefault();const f=new FormData(e.currentTarget);setUsers(x=>[...x,{id:Date.now(),name:String(f.get("name")),email:String(f.get("email")),role:String(f.get("role")),active:true}]);e.currentTarget.reset();alert("CMS user created and role assigned.")}}><h2>Create CMS user</h2><label>Full name<input required name="name" /></label><label>Email<input required type="email" name="email" /></label><label>Role<select name="role"><option>Administrator</option><option>Editor</option><option>Author</option><option>Procurement Publisher</option><option>Analytics Viewer</option></select></label><label>Temporary password<input required type="password" name="password" minLength={8} /></label><button className="button primary">Create account</button></form><div className="record-table"><h2>Users, roles and activity</h2>{users.map(u=><article key={u.id}><span className={u.active?"user-active":"user-inactive"}>{u.active?"Active":"Inactive"}</span><div><b>{u.name}</b><small>{u.email} · {u.role} · Last activity: today</small></div><button onClick={()=>{setUsers(x=>x.map(a=>a.id===u.id?{...a,active:!a.active}:a));alert(`${u.name} account ${u.active?"deactivated":"reactivated"}.`)}}>{u.active?"Deactivate":"Reactivate"}</button></article>)}</div></section>;
}

function NewsletterManager({subscribers,setSubscribers,alert}:{subscribers:string[];setSubscribers:React.Dispatch<React.SetStateAction<string[]>>;alert:(text:string,type?:"success"|"info")=>void}) {
  return <section className="module-panel"><div className="module-heading"><div><p className="eyebrow">Engagement workflow</p><h2>Newsletter subscribers</h2></div><strong>{subscribers.length} active</strong></div><div className="record-table">{subscribers.map(email=><article key={email}><span className="user-active">Confirmed</span><div><b>{email}</b><small>Interests: News, events and opportunities</small></div><button onClick={()=>{setSubscribers(x=>x.filter(a=>a!==email));alert(`${email} unsubscribed.`)}}>Unsubscribe</button></article>)}</div><button className="button secondary" onClick={()=>downloadDemo("LACD newsletter subscribers",subscribers.join("\n"))}>Export subscriber list</button></section>;
}

function SeoManager({alert}:{alert:(text:string,type?:"success"|"info")=>void}) {
  return <section className="manager-layout"><form onSubmit={e=>{e.preventDefault();alert("SEO settings saved and sitemap refreshed.")}}><h2>Edit page SEO</h2><label>Page<select><option>Homepage</option><option>About LACD</option><option>Strategic Plan</option><option>News</option></select></label><label>Page title<input defaultValue="Liberia Agency for Community Development | LACD" /></label><label>Meta description<textarea defaultValue="Community-led programmes, results, public information and opportunities from LACD." /></label><label>Search-friendly URL<input defaultValue="/about-lacd" /></label><label>Social-sharing image<input type="file" accept="image/*" /></label><label className="declaration"><input type="checkbox" defaultChecked /><span>Allow search engines to index this page</span></label><button className="button primary">Save SEO settings</button></form><div className="record-table"><h2>Technical SEO status</h2>{[["XML sitemap","Generated · 18 public pages"],["Robots and indexing","Enabled"],["Canonical URLs","Valid"],["Social preview metadata","Configured"],["Broken-link scan","0 critical issues"]].map(([a,b])=><article key={a}><span className="user-active">Ready</span><div><b>{a}</b><small>{b}</small></div></article>)}<button className="button secondary" onClick={()=>alert("SEO and accessibility audit complete: 96% readiness.")}>Run SEO audit</button></div></section>;
}

function AnalyticsDashboard() {return <div className="analytics-grid">{[["12,480","Unique visitors"],["31,206","Page views"],["1,842","Document downloads"],["68%","Mobile devices"],["15","Countries reached"],["4m 12s","Average engagement"]].map(([a,b])=><article key={b}><strong>{a}</strong><span>{b}</span><i /></article>)}<section><h3>Traffic sources</h3>{[["Direct / bookmarked",38],["Search engines",29],["Social media",21],["Partner referrals",12]].map(([x,n])=><div key={String(x)}><span>{x}</span><b>{n}%</b></div>)}</section><section><h3>Most viewed content</h3>{[["Programmes",34],["Procurement opportunities",27],["Success stories",22],["Publications",17]].map(([x,n])=><div key={String(x)}><span>{x}</span><b>{n}%</b></div>)}</section></div>}

function BackupManager({log,setLog,alert}:{log:string[];setLog:React.Dispatch<React.SetStateAction<string[]>>;alert:(text:string,type?:"success"|"info")=>void}) {const [backups,setBackups]=useState([{id:1,date:"Today · 02:00 GMT",type:"Scheduled",status:"Verified"},{id:2,date:"30 Jul 2026 · 02:00 GMT",type:"Scheduled",status:"Verified"},{id:3,date:"28 Jul 2026 · 16:42 GMT",type:"Pre-update",status:"Verified"}]);return <section className="manager-layout"><div className="module-panel"><p className="eyebrow">Security status</p><h2>Protected and maintained</h2>{["SSL certificate active","Daily encrypted backups","Malware and file-integrity monitoring","CMS security updates current","Monthly restore test scheduled"].map(x=><p className="security-line" key={x}><span>✓</span>{x}</p>)}<button className="button primary" onClick={()=>{setBackups(x=>[{id:Date.now(),date:"Just now",type:"Manual",status:"Verified"},...x]);setLog(x=>["Manual backup created and verified",...x]);alert("Backup created and integrity verified.")}}>Create backup now</button></div><div className="record-table"><h2>Restore points & maintenance</h2>{backups.map(b=><article key={b.id}><span className="user-active">{b.status}</span><div><b>{b.date}</b><small>{b.type} backup · encrypted off-site copy</small></div><button onClick={()=>alert(`Restore simulation completed for ${b.date}. No live data was changed.`)}>Test restore</button></article>)}<h3>Maintenance history</h3>{log.slice(0,4).map(x=><p key={x}>{x}</p>)}</div></section>}

function DonatePage({
  alert, 
  navigate,
  onRecordDonation
}:{
  alert:(text:string,type?:"success"|"info")=>void; 
  navigate:(view:View)=>void;
  onRecordDonation?: (donation: VaultDonationRecord) => void;
}) {
  const [frequency, setFrequency] = useState<"one-time"|"monthly">("one-time");
  const [amount, setAmount] = useState<number|string>(50);
  const [customAmount, setCustomAmount] = useState("");
  const [cause, setCause] = useState("Where Most Needed");
  const [paymentMethod, setPaymentMethod] = useState<"momo"|"bank"|"card">("momo");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const tiers = [
    { value: 25, impact: "Provides climate-resilient vegetable seeds & hand tools for 1 smallholder farmer" },
    { value: 50, impact: "Funds training and solar-dryer maintenance coaching for a women producer group" },
    { value: 100, impact: "Supplies emergency food assistance packaging and field logistics for 5 households" },
    { value: 250, impact: "Supports a community clean-energy or digital-literacy learning site for 1 month" },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const finalAmount = amount === "custom" ? customAmount : amount;
    if (!finalAmount || Number(finalAmount) <= 0) {
      return alert("Please specify a valid donation amount.", "info");
    }
    setSubmitted(true);
    const code = `LACD-DON-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    if (onRecordDonation) {
      onRecordDonation({
        id: code,
        donorName: donorName.trim() || "Anonymous Diaspora Contributor",
        donorEmail: donorEmail.trim() || "donor@community.org",
        channel: paymentMethod === "momo" ? "MTN MoMo" : paymentMethod === "bank" ? "Bank Wire Transfer" : "Card / Gateway",
        referenceCode: paymentMethod === "momo" ? `MOMO-${Date.now().toString().slice(-6)}` : `WIRE-${Date.now().toString().slice(-6)}`,
        amountUsd: Number(finalAmount),
        frequency: frequency,
        allocatedPillar: cause,
        date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        status: "Pledged",
        phone: donorPhone.trim() || undefined
      });
    }
    alert(`Thank you, ${donorName || "Supporter"}! Your pledge of $${finalAmount} (${frequency}) has been recorded in the Donation Vault.`);
  };

  return (
    <Page 
      title="Support Community-Led Progress in Liberia" 
      eyebrow="Donate & Partner" 
      intro="Your contribution directly powers sustainable agriculture, food security, women and youth livelihoods, clean energy and local community leadership across Liberia’s 15 counties."
    >
      <div className="donate-layout">
        <div className="donate-form-card glass-panel">
          <div className="donate-header">
            <div className="donate-badge">Direct Community Impact</div>
            <h2>Make a Donation</h2>
            <p>Select an amount or enter a custom gift. 100% of community-designated contributions support direct field implementation.</p>
          </div>

          <div className="frequency-selector">
            <button 
              type="button" 
              className={frequency === "one-time" ? "active" : ""} 
              onClick={() => setFrequency("one-time")}
            >
              One-time Gift
            </button>
            <button 
              type="button" 
              className={frequency === "monthly" ? "active" : ""} 
              onClick={() => setFrequency("monthly")}
            >
              Monthly Supporter ✦
            </button>
          </div>

          <div className="amount-grid">
            {tiers.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`amount-tier ${amount === t.value ? "selected" : ""}`}
                onClick={() => { setAmount(t.value); setCustomAmount(""); }}
              >
                <b>${t.value}</b>
                <small>{frequency === "monthly" ? "/month" : "USD"}</small>
              </button>
            ))}
            <button
              type="button"
              className={`amount-tier custom-tier ${amount === "custom" ? "selected" : ""}`}
              onClick={() => setAmount("custom")}
            >
              <b>Custom</b>
              <small>Any amount</small>
            </button>
          </div>

          {amount === "custom" && (
            <div className="custom-input-wrap">
              <span>$</span>
              <input 
                type="number" 
                min="5" 
                placeholder="Enter custom amount (USD)" 
                value={customAmount} 
                onChange={(e) => setCustomAmount(e.target.value)} 
                required 
              />
            </div>
          )}

          <div className="impact-callout">
            <span className="impact-icon">🌾</span>
            <div>
              <strong>Impact of your gift:</strong>
              <p>
                {amount === "custom" 
                  ? `Every dollar enables LACD's field missions, training and community-owned infrastructure across Liberia.` 
                  : (tiers.find(t => t.value === amount)?.impact || "Strengthens sustainable local development across Liberia.")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="donate-form">
            <label>
              <span>Direct your gift to a programme</span>
              <select value={cause} onChange={(e) => setCause(e.target.value)}>
                <option>Where Most Needed (Greatest Flexibility)</option>
                <option>Food Security & Agriculture</option>
                <option>Climate Adaptation & Clean Energy</option>
                <option>Women & Youth Enterprise</option>
                <option>Health, Nutrition & Community Wellbeing</option>
                <option>Education & Digital Inclusion</option>
              </select>
            </label>

            <div className="form-row-2">
              <label>
                <span>Full Name *</span>
                <input required placeholder="Your full name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
              </label>
              <label>
                <span>Email Address *</span>
                <input required type="email" placeholder="name@example.com" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
              </label>
            </div>

            <div className="payment-tabs">
              <span className="payment-label">Choose payment method:</span>
              <div className="payment-method-switch">
                <button type="button" className={paymentMethod === "momo" ? "active" : ""} onClick={() => setPaymentMethod("momo")}>
                  📱 Mobile Money (Liberia)
                </button>
                <button type="button" className={paymentMethod === "bank" ? "active" : ""} onClick={() => setPaymentMethod("bank")}>
                  🏦 Bank Wire Transfer
                </button>
                <button type="button" className={paymentMethod === "card" ? "active" : ""} onClick={() => setPaymentMethod("card")}>
                  💳 Card / International
                </button>
              </div>
            </div>

            {paymentMethod === "momo" && (
              <div className="payment-instructions momo-box">
                <h4>Liberia Mobile Money Channels</h4>
                <div className="momo-channels">
                  <div className="channel mtn">
                    <span className="carrier-badge mtn-badge">MTN MoMo</span>
                    <p><b>Merchant / Mobile:</b> +231 777 011 212</p>
                    <small>Name: Liberia Agency for Community Development</small>
                  </div>
                  <div className="channel orange">
                    <span className="carrier-badge orange-badge">Orange Money</span>
                    <p><b>Mobile Number:</b> +231 777 011 212</p>
                    <small>Reference: LACD - {donorName ? donorName.replace(/\s+/g, '') : "DONATION"}</small>
                  </div>
                </div>
                <p className="momo-help">After sending via your phone's USSD menu, click below to confirm your pledge reference for official LACD receipting.</p>
              </div>
            )}

            {paymentMethod === "bank" && (
              <div className="payment-instructions bank-box">
                <h4>Official Banking Details</h4>
                <div className="bank-details-grid">
                  <div><span>Account Name</span><b>Liberia Agency for Community Development</b></div>
                  <div><span>Bank Name</span><b>United Bank for Africa (UBA) / EcoBank Liberia</b></div>
                  <div><span>USD Account</span><b>012-345-6789-01 (Demonstration)</b></div>
                  <div><span>SWIFT / BIC</span><b>UBALLRMXXX (Monrovia Head Office)</b></div>
                  <div><span>Address</span><b>Chugbor Road, Old Road, Monrovia, Liberia</b></div>
                  <div><span>Reference</span><b>LACD-PLEDGE-{Date.now().toString().slice(-4)}</b></div>
                </div>
              </div>
            )}

            {paymentMethod === "card" && (
              <div className="payment-instructions card-box">
                <h4>Card Payment Simulation (Stripe / International Gateway)</h4>
                <p>In the production release, secure card processing will be integrated via LACD's accredited payment gateway.</p>
                <div className="card-mock-row">
                  <input placeholder="Card Number · 4000 1234 5678 9010" readOnly value="•••• •••• •••• 4242" />
                  <input placeholder="MM/YY" readOnly value="12/28" style={{ width: "90px" }} />
                  <input placeholder="CVC" readOnly value="•••" style={{ width: "70px" }} />
                </div>
              </div>
            )}

            <button className="button primary donate-submit-btn">
              {frequency === "monthly" ? "Commit Monthly Gift" : "Complete Donation Pledge"} →
            </button>
          </form>

          {submitted && (
            <div className="pledge-confirmed">
              <span>✓ Pledge Recorded</span>
              <h3>Thank you for standing with Liberia's communities!</h3>
              <p>An official acknowledgment email has been routed to <b>{donorEmail}</b> and our executive secretariat (<b>lacommunitydevelopment1@gmail.com</b> / <b>emmanuelpaye1978@gmail.com</b>).</p>
            </div>
          )}
        </div>

        <aside className="donate-sidebar">
          <div className="sidebar-card glass-panel">
            <span className="sidebar-tag">Why Donate</span>
            <h3>Accountable stewardship</h3>
            <p>LACD operates with community oversight, rigorous results tracking, and transparent reporting. Every dollar mobilized creates verified, local change.</p>
            <ul className="accountability-list">
              <li>✓ Legally registered Liberian NGO (Est. 2013)</li>
              <li>✓ Independent governing board oversight</li>
              <li>✓ Annual audited results published publicly</li>
              <li>✓ Direct community-level accountability committees</li>
            </ul>
          </div>

          <div className="sidebar-card glass-panel quote-card">
            <blockquote>
              "When you empower local producers, clean energy technicians, and women leaders, the entire nation moves forward sustainably."
            </blockquote>
            <span className="quote-author">— LACD Executive Leadership</span>
          </div>

          <div className="sidebar-card glass-panel">
            <h3>Questions about donating?</h3>
            <p>Contact our finance and partnerships team directly:</p>
            <p><b>Phone:</b> <a href="tel:+231777011212">+231 777 011 212</a></p>
            <p><b>Email:</b> <a href="mailto:lacommunitydevelopment1@gmail.com">lacommunitydevelopment1@gmail.com</a></p>
            <p><b>Executive:</b> <a href="mailto:emmanuelpaye1978@gmail.com">emmanuelpaye1978@gmail.com</a></p>
            <button className="button secondary" style={{ marginTop: "12px", width: "100%" }} onClick={() => navigate("contact")}>
              Visit Contact Page →
            </button>
          </div>
        </aside>
      </div>
    </Page>
  );
}

// ============================================================================
// ENTERPRISE DOCUMENT VAULT & RBAC GOVERNANCE MODULES
// ============================================================================

function exportToCsv(filename: string, rows: string[][]) {
  const processRow = (row: string[]) => row.map(val => {
    let text = (val || "").toString().replace(/"/g, '""');
    if (text.search(/("|,|\n)/g) >= 0) text = `"${text}"`;
    return text;
  }).join(",");

  const csvContent = "data:text/csv;charset=utf-8," + rows.map(processRow).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadVaultFile(fileName: string, category: string, bidderName: string) {
  const doc = new jsPDF();
  doc.setFillColor(18, 63, 42);
  doc.rect(0, 0, 210, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT", 18, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("DOCUMENT VAULT · VERIFIED PROCUREMENT ATTACHMENT ARCHIVE", 18, 20);

  doc.setTextColor(18, 63, 42);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(fileName, 18, 42);

  doc.setTextColor(70, 80, 75);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Category: ${category}`, 18, 52);
  doc.text(`Submitted By: ${bidderName}`, 18, 60);
  doc.text(`Verification Timestamp: ${new Date().toUTCString()}`, 18, 68);
  doc.text(`Checksum SHA-256: 8f4a39b2e04d7c18a901ff28c... [VERIFIED INTEGRITY]`, 18, 76);

  doc.setDrawColor(210, 220, 215);
  doc.line(18, 84, 192, 84);

  doc.setFontSize(9.5);
  doc.text("This official procurement document was archived electronically upon bidder submission.", 18, 96);
  doc.text("It has been scanned for malware, validated for format compliance, and sealed in the LACD Document Vault.", 18, 104);
  doc.text("Access is restricted to authorized Procurement Officers and Evaluation Committee members under PPCC rules.", 18, 112);

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}

function downloadDonationReceipt(donation: VaultDonationRecord) {
  const doc = new jsPDF();
  doc.setFillColor(18, 63, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT (LACD)", 18, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text("OFFICIAL CHARITABLE CONTRIBUTION & DONATION RECEIPT", 18, 22);

  doc.setTextColor(18, 63, 42);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(`RECEIPT: ${donation.id}`, 18, 44);

  doc.setTextColor(60, 70, 65);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Date of Contribution: ${donation.date}`, 18, 56);
  doc.text(`Donor Name: ${donation.donorName}`, 18, 64);
  doc.text(`Donor Email: ${donation.donorEmail}`, 18, 72);
  doc.text(`Payment Channel: ${donation.channel}`, 18, 80);
  doc.text(`Transaction Reference: ${donation.referenceCode}`, 18, 88);
  doc.text(`Programme Allocation: ${donation.allocatedPillar}`, 18, 96);
  doc.text(`Contribution Amount: $${donation.amountUsd.toFixed(2)} USD (${donation.frequency})`, 18, 104);
  doc.text(`Status: ${donation.status}`, 18, 112);

  doc.setDrawColor(210, 220, 215);
  doc.line(18, 122, 192, 122);
  doc.setFontSize(9);
  doc.text("Thank you for partnering with the Liberia Agency for Community Development.", 18, 132);
  doc.text("LACD is a registered Liberian NGO (Est. 2013). This receipt serves as official proof of charitable support.", 18, 140);
  doc.text("Chugbor Road, Old Road, Monrovia, Liberia · Tel: +231 777 011 212 · emmanuelpaye1978@gmail.com", 18, 148);

  doc.save(`${donation.id}-Official-Receipt.pdf`);
}

function downloadInstitutionalDoc(docItem: VaultInstitutionalRecord) {
  const doc = new jsPDF();
  doc.setFillColor(18, 63, 42);
  doc.rect(0, 0, 210, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT", 18, 14);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.text(`INSTITUTIONAL GOVERNANCE ARCHIVE · ${docItem.category.toUpperCase()}`, 18, 22);

  doc.setTextColor(18, 63, 42);
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  doc.text(docItem.title, 18, 44);

  doc.setTextColor(60, 70, 65);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference No: ${docItem.referenceNo}`, 18, 56);
  doc.text(`Reporting Year: ${docItem.year}`, 18, 64);
  doc.text(`Classification: ${docItem.classification}`, 18, 72);
  doc.text(`Authorized Signatory: ${docItem.signatory}`, 18, 80);

  doc.setDrawColor(210, 220, 215);
  doc.line(18, 90, 192, 90);
  doc.setFontSize(9.5);
  const lines = doc.splitTextToSize(docItem.summary, 174);
  doc.text(lines, 18, 102);

  doc.save(`${docItem.referenceNo.replace(/[^a-z0-9]+/gi, "-")}.pdf`);
}

function DocumentVaultPage({
  role,
  setRole,
  tab,
  setTab,
  bids,
  setBids,
  donations,
  setDonations,
  complaints,
  setComplaints,
  institutional,
  selectedDossier,
  setSelectedDossier,
  isAuthModalOpen,
  setIsAuthModalOpen,
  grievanceModalOpen,
  setGrievanceModalOpen,
  alert,
  navigate,
}: {
  role: VaultRole;
  setRole: (role: VaultRole) => void;
  tab: VaultModuleId;
  setTab: (tab: VaultModuleId) => void;
  bids: VaultBidRecord[];
  setBids: React.Dispatch<React.SetStateAction<VaultBidRecord[]>>;
  donations: VaultDonationRecord[];
  setDonations: React.Dispatch<React.SetStateAction<VaultDonationRecord[]>>;
  complaints: VaultComplaintRecord[];
  setComplaints: React.Dispatch<React.SetStateAction<VaultComplaintRecord[]>>;
  institutional: VaultInstitutionalRecord[];
  selectedDossier: VaultBidRecord | null;
  setSelectedDossier: (bid: VaultBidRecord | null) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  grievanceModalOpen: boolean;
  setGrievanceModalOpen: (open: boolean) => void;
  alert: (text: string, type?: "success" | "info") => void;
  navigate: (view: View) => void;
}) {
  const perm = ROLE_PERMISSIONS[role];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const isTabAuthorized = (targetTab: VaultModuleId) => {
    if (role === "executive_admin") return true;
    return perm.allowedModules.includes(targetTab);
  };

  const handleExportProcurement = () => {
    const headers = ["Bid ID", "Tender Ref", "Tender Title", "Bidder Name", "Email", "Phone", "Submitted At", "Status", "Total Files", "Evaluation Note"];
    const rows = bids.map(b => [
      b.id,
      b.ref,
      b.tenderTitle,
      b.bidderName,
      b.bidderEmail,
      b.bidderPhone,
      b.submittedAt,
      b.status,
      String(b.totalFiles),
      b.evaluationNote || ""
    ]);
    exportToCsv("lacd_procurement_bids_manifest.csv", [headers, ...rows]);
    alert("Procurement bids manifest exported to CSV.");
  };

  const handleExportDonations = () => {
    const headers = ["Donation ID", "Donor Name", "Email", "Phone", "Channel", "Reference Code", "Amount USD", "Frequency", "Pillar", "Date", "Status"];
    const rows = donations.map(d => [
      d.id,
      d.donorName,
      d.donorEmail,
      d.phone || "N/A",
      d.channel,
      d.referenceCode,
      String(d.amountUsd),
      d.frequency,
      d.allocatedPillar,
      d.date,
      d.status
    ]);
    exportToCsv("lacd_donations_ledger.csv", [headers, ...rows]);
    alert("Donations ledger exported to CSV.");
  };

  const handleExportComplaints = () => {
    const headers = ["Grievance ID", "Category", "Severity", "Subject", "Status", "Submitted At", "Assigned Officer", "Notes Count"];
    const rows = complaints.map(c => [
      c.id,
      c.category,
      c.severity,
      c.subject,
      c.status,
      c.submittedAt,
      c.assignedOfficer,
      String(c.investigationNotes.length)
    ]);
    exportToCsv("lacd_safeguarding_grievance_log.csv", [headers, ...rows]);
    alert("Safeguarding grievance log exported to CSV (Complainant identities protected).");
  };

  return (
    <Page
      title="Institutional Document & Governance Vault"
      eyebrow="Fiduciary Transparency & Compliance"
      intro="Centralized digital repository for procurement proposals, charitable donor contributions, confidential safeguarding grievances, and executive management records."
    >
      <div className="vault-shell">
        {/* RBAC Security Header Bar */}
        <div className="vault-rbac-bar glass-panel">
          <div className="rbac-status">
            <div className="rbac-badge-wrapper">
              <span className={`rbac-badge ${perm.badgeClass}`}>{perm.badge}</span>
              <span className="rbac-active-indicator" title="Role-Based Access Control Active" />
            </div>
            <div className="rbac-info">
              <h3>{perm.label}</h3>
              <p>{perm.description}</p>
            </div>
          </div>
          <div className="rbac-actions">
            <button 
              className="button glass-btn rbac-switch-btn"
              onClick={() => setIsAuthModalOpen(true)}
            >
              🔑 Switch Role / Passkey Gate
            </button>
            {role !== "public" && (
              <button 
                className="button text-btn rbac-signout-btn"
                onClick={() => { setRole("public"); alert("Switched to Public Transparency View."); }}
              >
                Exit to Public View
              </button>
            )}
          </div>
        </div>

        {/* Vault Navigation Tabs with Access Control Badges */}
        <div className="vault-tabs-header">
          <div className="vault-tab-pills">
            <button
              className={`vault-tab-pill ${tab === "procurement" ? "active" : ""} ${!isTabAuthorized("procurement") && role !== "public" ? "restricted-tab" : ""}`}
              onClick={() => setTab("procurement")}
            >
              <span className="tab-icon">📁</span>
              <span>Procurement Bids & Proposals</span>
              {!isTabAuthorized("procurement") && role !== "public" && <span className="tab-lock-badge">🔒 Restricted</span>}
            </button>

            <button
              className={`vault-tab-pill ${tab === "donations" ? "active" : ""} ${!isTabAuthorized("donations") && role !== "public" ? "restricted-tab" : ""}`}
              onClick={() => setTab("donations")}
            >
              <span className="tab-icon">💝</span>
              <span>Donations & Contributions</span>
              {!isTabAuthorized("donations") && role !== "public" && <span className="tab-lock-badge">🔒 Restricted</span>}
            </button>

            <button
              className={`vault-tab-pill ${tab === "complaints" ? "active" : ""} ${!isTabAuthorized("complaints") && role !== "public" ? "restricted-tab" : ""}`}
              onClick={() => setTab("complaints")}
            >
              <span className="tab-icon">🛡</span>
              <span>Safeguarding & Grievances</span>
              {!isTabAuthorized("complaints") && role !== "public" && <span className="tab-lock-badge">🔒 Restricted</span>}
            </button>

            <button
              className={`vault-tab-pill ${tab === "institutional" ? "active" : ""} ${!isTabAuthorized("institutional") && role !== "public" ? "restricted-tab" : ""}`}
              onClick={() => setTab("institutional")}
            >
              <span className="tab-icon">🏛</span>
              <span>Board & Management Archives</span>
              {!isTabAuthorized("institutional") && role !== "public" && <span className="tab-lock-badge">🔒 Restricted</span>}
            </button>
          </div>
        </div>

        {/* Access Enforcement Guard */}
        {role === "public" ? (
          <PublicTransparencyTab
            tab={tab}
            bids={bids}
            donations={donations}
            complaints={complaints}
            onOpenAuth={() => setIsAuthModalOpen(true)}
            onLodgeGrievance={() => setGrievanceModalOpen(true)}
            navigate={navigate}
          />
        ) : !isTabAuthorized(tab) ? (
          <AccessDeniedPanel
            currentRole={role}
            currentRoleLabel={perm.label}
            attemptedModule={tab}
            onSwitchRole={() => setIsAuthModalOpen(true)}
            onReturnToAllowed={() => setTab(perm.allowedModules[0] || "procurement")}
          />
        ) : (
          /* Authorized Module Views */
          <div className="vault-module-content">
            {tab === "procurement" && (
              <ProcurementVaultTab
                bids={bids}
                onSelectDossier={setSelectedDossier}
                onExportCsv={handleExportProcurement}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}

            {tab === "donations" && (
              <DonationsVaultTab
                donations={donations}
                onExportCsv={handleExportDonations}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}

            {tab === "complaints" && (
              <ComplaintsVaultTab
                complaints={complaints}
                setComplaints={setComplaints}
                onLodgeGrievance={() => setGrievanceModalOpen(true)}
                onExportCsv={handleExportComplaints}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                alert={alert}
              />
            )}

            {tab === "institutional" && (
              <InstitutionalVaultTab
                records={institutional}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
              />
            )}
          </div>
        )}
      </div>

      {/* Role Switcher / Passkey Gate Modal */}
      {isAuthModalOpen && (
        <VaultRoleSwitcherModal
          currentRole={role}
          onSelectRole={(r) => {
            setRole(r);
            setIsAuthModalOpen(false);
            if (r !== "public") {
              const p = ROLE_PERMISSIONS[r];
              if (p.allowedModules.length > 0 && !p.allowedModules.includes(tab) && r !== "executive_admin") {
                setTab(p.allowedModules[0]);
              }
            }
            alert(`Authenticated as ${ROLE_PERMISSIONS[r].label}.`);
          }}
          onClose={() => setIsAuthModalOpen(false)}
        />
      )}

      {/* Bid Dossier Inspection Modal */}
      {selectedDossier && (
        <BidDossierModal
          bid={selectedDossier}
          onClose={() => setSelectedDossier(null)}
          onUpdateStatus={(newStatus) => {
            setBids(prev => prev.map(b => b.id === selectedDossier.id ? { ...b, status: newStatus } : b));
            setSelectedDossier({ ...selectedDossier, status: newStatus });
            alert(`Bid status updated to "${newStatus}".`);
          }}
          onUpdateNote={(note) => {
            setBids(prev => prev.map(b => b.id === selectedDossier.id ? { ...b, evaluationNote: note } : b));
            setSelectedDossier({ ...selectedDossier, evaluationNote: note });
            alert("Evaluation note saved to bid dossier.");
          }}
        />
      )}

      {/* Grievance Intake Modal */}
      {grievanceModalOpen && (
        <GrievanceIntakeModal
          onClose={() => setGrievanceModalOpen(false)}
          onSubmitGrievance={(newComplaint) => {
            setComplaints(prev => [newComplaint, ...prev]);
            setGrievanceModalOpen(false);
            alert(`Grievance ${newComplaint.id} submitted securely into the confidential Safeguarding Vault.`);
          }}
        />
      )}
    </Page>
  );
}

// ----------------------------------------------------------------------------
// ACCESS DENIED PANEL (Strict RBAC Isolation)
// ----------------------------------------------------------------------------
function AccessDeniedPanel({
  currentRole,
  currentRoleLabel,
  attemptedModule,
  onSwitchRole,
  onReturnToAllowed,
}: {
  currentRole: VaultRole;
  currentRoleLabel: string;
  attemptedModule: VaultModuleId;
  onSwitchRole: () => void;
  onReturnToAllowed: () => void;
}) {
  const moduleNames: Record<VaultModuleId, string> = {
    procurement: "Procurement Bids & Proposals",
    donations: "Donations & Charitable Contributions",
    complaints: "Safeguarding & Whistleblower Grievances",
    institutional: "Executive Board & Management Archives",
  };

  const explanations: Record<string, string> = {
    "procurement_officer:donations": "Procurement Officers are legally quarantined from donor financial contributions and pledge ledgers under PPCC and DAC compliance rules to maintain commercial neutrality and prevent conflicts of interest.",
    "procurement_officer:complaints": "Safeguarding complaints and whistleblower disclosures are strictly restricted to the Safeguarding & Ethics Officer to safeguard victim identities and preserve confidential investigation integrity.",
    "procurement_officer:institutional": "Executive Board resolutions and statutory internal governance archives require Executive Director or Internal Auditor clearance.",
    "finance_officer:procurement": "Finance & Donor Relations Officers are quarantined from sealed tender proposals prior to official contract award to preserve procurement fairness.",
    "finance_officer:complaints": "Confidential community complaints and safeguarding disclosures are restricted to the designated Safeguarding & Ethics Officer.",
    "finance_officer:institutional": "Executive Board resolutions and statutory management records require Executive Director clearance.",
    "safeguarding_officer:procurement": "Ethics & Safeguarding Officers are independent of commercial tender evaluations to preserve grievance oversight objectivity.",
    "safeguarding_officer:donations": "Donor contribution ledgers are managed exclusively by Finance & Donor Relations Officers.",
    "safeguarding_officer:institutional": "Statutory board archives are managed under Executive Director clearance.",
  };

  const reason = explanations[`${currentRole}:${attemptedModule}`] || "You do not have the required Role-Based Access Control (RBAC) credentials to inspect this module.";

  return (
    <div className="access-denied-shell glass-panel">
      <div className="access-denied-icon">🔒</div>
      <div className="access-denied-badge">403 Forbidden · Fiduciary RBAC Isolation</div>
      <h2>Access Restricted to {moduleNames[attemptedModule]}</h2>
      <div className="current-clearance-pill">
        <span>Current Active Clearance:</span>
        <b>{currentRoleLabel}</b>
      </div>
      <p className="access-denied-reason">{reason}</p>
      <div className="access-denied-guideline">
        <strong>LACD Data Governance Directive (Section 4.3):</strong>
        <p>"Cross-departmental access between commercial procurement bids, donor contributions, and confidential safeguarding disclosures is strictly prohibited to preserve donor privacy, tender integrity, and whistleblower anonymity."</p>
      </div>
      <div className="access-denied-buttons">
        <button className="button primary" onClick={onSwitchRole}>
          🔑 Switch to an Authorized Role (Passkey Gate)
        </button>
        <button className="button secondary" onClick={onReturnToAllowed}>
          ← Return to My Authorized Module
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PUBLIC TRANSPARENCY TAB (Citizen View)
// ----------------------------------------------------------------------------
function PublicTransparencyTab({
  tab,
  bids,
  donations,
  complaints,
  onOpenAuth,
  onLodgeGrievance,
  navigate,
}: {
  tab: VaultModuleId;
  bids: VaultBidRecord[];
  donations: VaultDonationRecord[];
  complaints: VaultComplaintRecord[];
  onOpenAuth: () => void;
  onLodgeGrievance: () => void;
  navigate: (view: View) => void;
}) {
  const totalMobilized = donations.reduce((sum, d) => sum + d.amountUsd, 0);

  return (
    <div className="public-transparency-layout">
      <div className="public-banner glass-panel">
        <div className="public-banner-copy">
          <span className="public-badge">Citizen Transparency & Open Governance</span>
          <h2>Public Accountability Register</h2>
          <p>LACD operates under open disclosure standards. Citizens and donors can inspect high-level statistics, tender notices, and grievance resolution metrics. To access raw vendor proposals, donor transaction records, or confidential safeguarding dossiers, sign in with authorized officer credentials.</p>
        </div>
        <div className="public-banner-cta">
          <button className="button primary" onClick={onOpenAuth}>
            🔑 Officer Sign In / Switch Role
          </button>
          <button className="button secondary" onClick={onLodgeGrievance}>
            🛡 Lodge Confidential Grievance
          </button>
        </div>
      </div>

      <div className="public-stats-grid">
        <div className="stat-card glass-panel">
          <span className="stat-label">Electronic Procurement</span>
          <strong>{bids.length} Proposals</strong>
          <small>Logged in electronic tender registry</small>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">Community Mobilization</span>
          <strong>${totalMobilized.toLocaleString()} USD</strong>
          <small>Tracked across MoMo, Orange & Wire</small>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">Safeguarding Response</span>
          <strong>100%</strong>
          <small>Cases acknowledged within 48 hours</small>
        </div>
        <div className="stat-card glass-panel">
          <span className="stat-label">Audited Delivery</span>
          <strong>Clean</strong>
          <small>Unqualified external audit opinion</small>
        </div>
      </div>

      <div className="public-register-card glass-panel">
        <div className="register-header">
          <div>
            <h3>Public Tender Notice Register</h3>
            <p>Active and archived solicitations conducted under PPCC guidelines.</p>
          </div>
          <button className="button secondary" onClick={() => navigate("procurement")}>
            View Opportunities Portal →
          </button>
        </div>
        <div className="vault-table-wrapper">
          <table className="vault-table">
            <thead>
              <tr>
                <th>Tender Reference</th>
                <th>Solicitation Title</th>
                <th>Closing Date</th>
                <th>Bids Received</th>
                <th>Status</th>
                <th>Public Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>LACD/RFQ/2026/007</b></td>
                <td>Development of the LACD Website</td>
                <td>14 Aug 2026 · 4:00 PM GMT</td>
                <td><span className="badge-pill">{bids.filter(b=>b.ref==="LACD/RFQ/2026/007").length} Bids Logged</span></td>
                <td><span className="status-pill status-active">Under Evaluation</span></td>
                <td><button className="mini-btn" onClick={() => navigate("procurement")}>Open Notice</button></td>
              </tr>
              <tr>
                <td><b>LACD/RFQ/2026/006</b></td>
                <td>Supply and Installation of Community Solar Dryers</td>
                <td>28 Jul 2026 · 4:00 PM GMT</td>
                <td><span className="badge-pill">1 Bid Awarded</span></td>
                <td><span className="status-pill status-cleared">Awarded</span></td>
                <td><button className="mini-btn" onClick={() => navigate("procurement")}>View Award</button></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="public-notice-footer">
          <p>ℹ️ Raw proposal attachments, bidder financial schedules, and evaluation scorecards are sealed under <b>Procurement Officer RBAC clearance</b> until contract award is published.</p>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 1. PROCUREMENT MODULE (Procurement Officer & Executive Admin)
// ----------------------------------------------------------------------------
function ProcurementVaultTab({
  bids,
  onSelectDossier,
  onExportCsv,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: {
  bids: VaultBidRecord[];
  onSelectDossier: (bid: VaultBidRecord) => void;
  onExportCsv: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}) {
  const filteredBids = bids.filter(b => {
    const matchSearch = b.bidderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.tenderTitle.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || b.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalFilesArchived = bids.reduce((sum, b) => sum + b.totalFiles, 0);

  return (
    <div className="module-view-wrapper">
      <div className="module-top-bar glass-panel">
        <div className="module-metrics-row">
          <div className="metric-chip">
            <span>Total Proposals:</span>
            <b>{bids.length}</b>
          </div>
          <div className="metric-chip">
            <span>Archived Documents:</span>
            <b>{totalFilesArchived} files</b>
          </div>
          <div className="metric-chip">
            <span>Compliance Cleared:</span>
            <b>{bids.filter(b => b.status === "Compliance Cleared" || b.status === "Awarded").length}</b>
          </div>
        </div>
        <div className="module-controls">
          <input
            className="vault-search-input"
            placeholder="Search by bidder, ID or tender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="vault-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending Opening">Pending Opening</option>
            <option value="Under Evaluation">Under Evaluation</option>
            <option value="Compliance Cleared">Compliance Cleared</option>
            <option value="Awarded">Awarded</option>
            <option value="Disqualified">Disqualified</option>
          </select>
          <button className="button glass-btn export-btn" onClick={onExportCsv}>
            📥 Export CSV Manifest
          </button>
        </div>
      </div>

      <div className="vault-table-wrapper glass-panel">
        <table className="vault-table">
          <thead>
            <tr>
              <th>Bid Reference</th>
              <th>Tender Solicitation</th>
              <th>Bidder Organization</th>
              <th>Submission Date</th>
              <th>Attachments</th>
              <th>Evaluation Status</th>
              <th>Officer Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBids.map(bid => (
              <tr key={bid.id}>
                <td>
                  <strong className="reference-code">{bid.id}</strong>
                </td>
                <td>
                  <b>{bid.ref}</b>
                  <small className="cell-subtext">{bid.tenderTitle}</small>
                </td>
                <td>
                  <b>{bid.bidderName}</b>
                  <small className="cell-subtext">{bid.bidderEmail}</small>
                </td>
                <td>
                  <span>{bid.submittedAt}</span>
                </td>
                <td>
                  <span className="files-count-badge">📎 {bid.totalFiles} documents</span>
                </td>
                <td>
                  <span className={`status-pill ${
                    bid.status === "Compliance Cleared" || bid.status === "Awarded" ? "status-cleared" :
                    bid.status === "Under Evaluation" ? "status-review" : "status-pending"
                  }`}>
                    {bid.status}
                  </span>
                </td>
                <td>
                  <button 
                    className="button primary mini-btn"
                    onClick={() => onSelectDossier(bid)}
                  >
                    Inspect Dossier ↗
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBids.length === 0 && (
          <div className="empty-vault-state">
            <p>No procurement submissions match your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 2. DONATIONS MODULE (Finance Officer & Executive Admin)
// ----------------------------------------------------------------------------
function DonationsVaultTab({
  donations,
  onExportCsv,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: {
  donations: VaultDonationRecord[];
  onExportCsv: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}) {
  const filtered = donations.filter(d => {
    const matchSearch = d.donorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.referenceCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || d.channel === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalFunds = donations.reduce((sum, d) => sum + d.amountUsd, 0);

  return (
    <div className="module-view-wrapper">
      <div className="module-top-bar glass-panel">
        <div className="module-metrics-row">
          <div className="metric-chip">
            <span>Total Mobilized:</span>
            <b>${totalFunds.toLocaleString()} USD</b>
          </div>
          <div className="metric-chip">
            <span>MoMo Contributions:</span>
            <b>{donations.filter(d => d.channel === "MTN MoMo" || d.channel === "Orange Money").length}</b>
          </div>
          <div className="metric-chip">
            <span>Bank Wire Transfers:</span>
            <b>{donations.filter(d => d.channel === "Bank Wire Transfer").length}</b>
          </div>
        </div>
        <div className="module-controls">
          <input
            className="vault-search-input"
            placeholder="Search by donor, receipt ID or reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="vault-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Channels</option>
            <option value="MTN MoMo">MTN MoMo</option>
            <option value="Orange Money">Orange Money</option>
            <option value="Bank Wire Transfer">Bank Wire Transfer</option>
          </select>
          <button className="button glass-btn export-btn" onClick={onExportCsv}>
            📥 Export Donations CSV
          </button>
        </div>
      </div>

      <div className="vault-table-wrapper glass-panel">
        <table className="vault-table">
          <thead>
            <tr>
              <th>Receipt Code</th>
              <th>Donor Identity</th>
              <th>Payment Channel</th>
              <th>Tx Reference</th>
              <th>Amount (USD)</th>
              <th>Programme Allocation</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(donation => (
              <tr key={donation.id}>
                <td><strong className="reference-code">{donation.id}</strong></td>
                <td>
                  <b>{donation.donorName}</b>
                  <small className="cell-subtext">{donation.donorEmail}</small>
                </td>
                <td>
                  <span className={`carrier-pill ${donation.channel.includes("MTN") ? "carrier-mtn" : donation.channel.includes("Orange") ? "carrier-orange" : "carrier-bank"}`}>
                    {donation.channel}
                  </span>
                </td>
                <td><code>{donation.referenceCode}</code></td>
                <td>
                  <strong className="amount-highlight">${donation.amountUsd.toFixed(2)}</strong>
                  <small className="cell-subtext">{donation.frequency}</small>
                </td>
                <td><span>{donation.allocatedPillar}</span></td>
                <td><span>{donation.date}</span></td>
                <td><span className="status-pill status-cleared">{donation.status}</span></td>
                <td>
                  <button
                    className="button secondary mini-btn"
                    onClick={() => downloadDonationReceipt(donation)}
                    title="Download Official Tax-Deductible Donation Receipt"
                  >
                    Receipt PDF ↓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="empty-vault-state">
            <p>No donation records match your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// 3. SAFEGUARDING & COMPLAINTS MODULE (Safeguarding Officer & Executive Admin)
// ----------------------------------------------------------------------------
function ComplaintsVaultTab({
  complaints,
  setComplaints,
  onLodgeGrievance,
  onExportCsv,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  alert,
}: {
  complaints: VaultComplaintRecord[];
  setComplaints: React.Dispatch<React.SetStateAction<VaultComplaintRecord[]>>;
  onLodgeGrievance: () => void;
  onExportCsv: () => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  alert: (text: string, type?: "success" | "info") => void;
}) {
  const [selectedCase, setSelectedCase] = useState<VaultComplaintRecord | null>(null);
  const [newNote, setNewNote] = useState("");

  const filtered = complaints.filter(c => {
    const matchSearch = c.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleAddNote = () => {
    if (!selectedCase || !newNote.trim()) return;
    const updatedNotes = [
      ...selectedCase.investigationNotes,
      `${new Date().toLocaleDateString("en-GB")}: ${newNote.trim()}`
    ];
    setComplaints(prev => prev.map(c => c.id === selectedCase.id ? { ...c, investigationNotes: updatedNotes } : c));
    setSelectedCase({ ...selectedCase, investigationNotes: updatedNotes });
    setNewNote("");
    alert("Confidential investigation note added.");
  };

  const handleStatusChange = (newStatus: VaultComplaintRecord["status"]) => {
    if (!selectedCase) return;
    setComplaints(prev => prev.map(c => c.id === selectedCase.id ? { ...c, status: newStatus } : c));
    setSelectedCase({ ...selectedCase, status: newStatus });
    alert(`Grievance status updated to "${newStatus}".`);
  };

  return (
    <div className="module-view-wrapper">
      <div className="module-top-bar glass-panel">
        <div className="module-metrics-row">
          <div className="metric-chip">
            <span>Logged Cases:</span>
            <b>{complaints.length}</b>
          </div>
          <div className="metric-chip">
            <span>48h Acknowledgment:</span>
            <b className="text-emerald">100%</b>
          </div>
          <div className="metric-chip">
            <span>Resolved / Closed:</span>
            <b>{complaints.filter(c => c.status === "Case Closed").length}</b>
          </div>
        </div>
        <div className="module-controls">
          <input
            className="vault-search-input"
            placeholder="Search by ticket ID, subject or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="vault-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Received & Acknowledged">Received & Acknowledged</option>
            <option value="Independent Panel Review">Independent Panel Review</option>
            <option value="Corrective Action">Corrective Action</option>
            <option value="Case Closed">Case Closed</option>
          </select>
          <button className="button primary mini-btn" onClick={onLodgeGrievance}>
            + Lodge Grievance / Alert
          </button>
          <button className="button glass-btn export-btn" onClick={onExportCsv}>
            📥 Export CSV Log
          </button>
        </div>
      </div>

      <div className="grievance-cards-grid">
        {filtered.map(caseItem => (
          <article key={caseItem.id} className="grievance-card glass-panel">
            <div className="grievance-card-header">
              <div>
                <span className="reference-code">{caseItem.id}</span>
                <span className={`severity-pill severity-${caseItem.severity.toLowerCase().replace(/[^a-z]+/g, '-')}`}>
                  {caseItem.severity}
                </span>
              </div>
              <span className={`status-pill ${caseItem.status === "Case Closed" ? "status-cleared" : "status-review"}`}>
                {caseItem.status}
              </span>
            </div>

            <h4 className="grievance-title">{caseItem.subject}</h4>
            <p className="grievance-category"><b>Category:</b> {caseItem.category}</p>

            <div className="complainant-identity-tag">
              <span className="icon">🛡</span>
              <span>Complainant: <b>{caseItem.complainantName}</b></span>
            </div>

            <p className="grievance-snippet">{caseItem.details}</p>

            <div className="grievance-card-footer">
              <small>Logged: {caseItem.submittedAt}</small>
              <button
                className="button secondary mini-btn"
                onClick={() => setSelectedCase(caseItem)}
              >
                Open Case Dossier ↗
              </button>
            </div>
          </article>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-vault-state glass-panel">
          <p>No safeguarding or grievance records match your filter criteria.</p>
        </div>
      )}

      {/* Case Details Drawer / Modal */}
      {selectedCase && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card glass-panel dossier-modal">
            <div className="modal-header">
              <div>
                <span className="modal-eyebrow">Confidential Safeguarding Dossier</span>
                <h2>Case {selectedCase.id}</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedCase(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="dossier-meta-grid">
                <div><span>Subject</span><b>{selectedCase.subject}</b></div>
                <div><span>Category</span><b>{selectedCase.category}</b></div>
                <div><span>Severity</span><b className="text-red">{selectedCase.severity}</b></div>
                <div><span>Assigned Focal Point</span><b>{selectedCase.assignedOfficer}</b></div>
                <div><span>Complainant</span><b>{selectedCase.complainantName}</b></div>
                <div><span>Contact Channel</span><b>{selectedCase.complainantContact || "Protected Hotline"}</b></div>
              </div>

              <div className="dossier-section">
                <h4>Case Narrative & Allegation Details</h4>
                <p className="case-details-box">{selectedCase.details}</p>
              </div>

              <div className="dossier-section">
                <h4>Investigation Log & Remedial Actions</h4>
                <div className="investigation-timeline">
                  {selectedCase.investigationNotes.map((note, idx) => (
                    <div key={idx} className="timeline-item">
                      <span className="timeline-dot" />
                      <p>{note}</p>
                    </div>
                  ))}
                </div>

                <div className="add-note-box">
                  <input
                    placeholder="Append new investigation note or remedial action..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                  <button className="button secondary mini-btn" onClick={handleAddNote}>
                    Append Note
                  </button>
                </div>
              </div>

              <div className="dossier-section">
                <h4>Update Case Status</h4>
                <div className="status-action-row">
                  {(["Received & Acknowledged", "Independent Panel Review", "Corrective Action", "Case Closed"] as const).map(st => (
                    <button
                      key={st}
                      className={`status-btn ${selectedCase.status === st ? "active" : ""}`}
                      onClick={() => handleStatusChange(st)}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="button secondary" onClick={() => setSelectedCase(null)}>
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// 4. INSTITUTIONAL MODULE (Executive Director & Auditor)
// ----------------------------------------------------------------------------
function InstitutionalVaultTab({
  records,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}: {
  records: VaultInstitutionalRecord[];
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
}) {
  const filtered = records.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "All" || r.category === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="module-view-wrapper">
      <div className="module-top-bar glass-panel">
        <div className="module-metrics-row">
          <div className="metric-chip">
            <span>Governance Records:</span>
            <b>{records.length} Documents</b>
          </div>
          <div className="metric-chip">
            <span>Classification:</span>
            <b>Board & Statutory Audit</b>
          </div>
          <div className="metric-chip">
            <span>External Audit Opinion:</span>
            <b className="text-emerald">Unqualified (Clean)</b>
          </div>
        </div>
        <div className="module-controls">
          <input
            className="vault-search-input"
            placeholder="Search by title, reference number or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="vault-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="All">All Categories</option>
            <option value="Board Resolution">Board Resolution</option>
            <option value="Statutory Audit">Statutory Audit</option>
            <option value="PPCC Clearance">PPCC Clearance</option>
            <option value="MOU & Partnership">MOU & Partnership</option>
          </select>
        </div>
      </div>

      <div className="institutional-cards-grid">
        {filtered.map(docItem => (
          <article key={docItem.id} className="institutional-card glass-panel">
            <div className="inst-header">
              <span className="inst-category-pill">{docItem.category}</span>
              <span className="inst-classification-badge">{docItem.classification}</span>
            </div>
            <h3>{docItem.title}</h3>
            <p className="inst-summary">{docItem.summary}</p>
            <div className="inst-meta-grid">
              <div><span>Ref:</span> <b>{docItem.referenceNo}</b></div>
              <div><span>Year:</span> <b>{docItem.year}</b></div>
              <div><span>Signatory:</span> <b>{docItem.signatory}</b></div>
              <div><span>Size:</span> <b>{docItem.fileSize}</b></div>
            </div>
            <div className="inst-footer">
              <button
                className="button primary mini-btn"
                onClick={() => downloadInstitutionalDoc(docItem)}
              >
                Download Verified PDF ↓
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MODAL: ROLE SWITCHER / PASSKEY GATE
// ----------------------------------------------------------------------------
function VaultRoleSwitcherModal({
  currentRole,
  onSelectRole,
  onClose,
}: {
  currentRole: VaultRole;
  onSelectRole: (role: VaultRole) => void;
  onClose: () => void;
}) {
  const [enteredPasskey, setEnteredPasskey] = useState("");
  const [passkeyError, setPasskeyError] = useState("");

  const handlePasskeySubmit = (e: FormEvent) => {
    e.preventDefault();
    const key = enteredPasskey.trim().toUpperCase();
    if (key === "LACD-PROC-2026") return onSelectRole("procurement_officer");
    if (key === "LACD-DONOR-2026") return onSelectRole("finance_officer");
    if (key === "LACD-ETHICS-2026") return onSelectRole("safeguarding_officer");
    if (key === "LACD-ADMIN-2026") return onSelectRole("executive_admin");
    setPasskeyError("Invalid passkey. Try one of the demonstration roles below.");
  };

  const rolesList: { role: VaultRole; title: string; passkey: string; description: string; scope: string }[] = [
    {
      role: "public",
      title: "Public Citizen / Auditor",
      passkey: "None (Open)",
      description: "Public transparency register with sanitized metrics and tender notices. Sensitive files restricted.",
      scope: "Public Ledger Only",
    },
    {
      role: "procurement_officer",
      title: "Procurement & Contracts Officer",
      passkey: "LACD-PROC-2026",
      description: "Full access to procurement bids, bidder proposals, and multi-file attachments. Quarantined from donations & complaints.",
      scope: "Procurement Solicitations & Bids Only",
    },
    {
      role: "finance_officer",
      title: "Finance & Donor Relations Officer",
      passkey: "LACD-DONOR-2026",
      description: "Full access to MoMo, Orange Money, and Bank wire contribution ledgers and tax receipts. Quarantined from bids & complaints.",
      scope: "Donations & Financial Ledgers Only",
    },
    {
      role: "safeguarding_officer",
      title: "Safeguarding, Ethics & Legal Officer",
      passkey: "LACD-ETHICS-2026",
      description: "Full access to confidential community grievances, whistleblower cases, and investigation notes. Quarantined from bids & donations.",
      scope: "Safeguarding & Grievances Only",
    },
    {
      role: "executive_admin",
      title: "Executive Director / Internal Auditor",
      passkey: "LACD-ADMIN-2026",
      description: "Comprehensive cross-module oversight across Procurement, Donor Contributions, Safeguarding, and Board Archives.",
      scope: "Full Fiduciary & Board Clearance (All Modules)",
    },
  ];

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card glass-panel auth-modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Role-Based Access Control (RBAC)</span>
            <h2>Officer Authentication Gate</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <form className="passkey-manual-form" onSubmit={handlePasskeySubmit}>
            <label>
              <span>Enter Officer Passkey:</span>
              <div className="passkey-input-row">
                <input
                  placeholder="e.g. LACD-PROC-2026, LACD-ADMIN-2026"
                  value={enteredPasskey}
                  onChange={(e) => { setEnteredPasskey(e.target.value); setPasskeyError(""); }}
                />
                <button className="button primary">Authenticate →</button>
              </div>
            </label>
            {passkeyError && <p className="auth-error-text">{passkeyError}</p>}
          </form>

          <div className="auth-divider">
            <span>OR SELECT A ROLE FOR DEMONSTRATION TESTING</span>
          </div>

          <div className="role-cards-selection">
            {rolesList.map(item => (
              <div
                key={item.role}
                className={`role-select-card ${currentRole === item.role ? "active-role" : ""}`}
                onClick={() => onSelectRole(item.role)}
              >
                <div className="role-card-top">
                  <h4>{item.title}</h4>
                  {currentRole === item.role ? (
                    <span className="current-active-tag">Active Role ✓</span>
                  ) : (
                    <span className="passkey-tag">Key: {item.passkey}</span>
                  )}
                </div>
                <p className="role-card-desc">{item.description}</p>
                <div className="role-card-scope">
                  <span>Scope: <b>{item.scope}</b></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="button secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MODAL: BID DOSSIER INSPECTOR
// ----------------------------------------------------------------------------
function BidDossierModal({
  bid,
  onClose,
  onUpdateStatus,
  onUpdateNote,
}: {
  bid: VaultBidRecord;
  onClose: () => void;
  onUpdateStatus: (s: VaultBidRecord["status"]) => void;
  onUpdateNote: (n: string) => void;
}) {
  const [note, setNote] = useState(bid.evaluationNote || "");

  const handleDownloadAllSummary = () => {
    const doc = new jsPDF();
    doc.setFillColor(18, 63, 42);
    doc.rect(0, 0, 210, 26, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("LIBERIA AGENCY FOR COMMUNITY DEVELOPMENT (LACD)", 18, 14);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.text("OFFICIAL PROPOSAL SUBMISSION & EVALUATION DOSSIER", 18, 20);

    doc.setTextColor(18, 63, 42);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(`BID DOSSIER: ${bid.id}`, 18, 42);

    doc.setTextColor(60, 70, 65);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Tender: ${bid.ref} - ${bid.tenderTitle}`, 18, 52);
    doc.text(`Bidder: ${bid.bidderName}`, 18, 60);
    doc.text(`Email: ${bid.bidderEmail} | Phone: ${bid.bidderPhone}`, 18, 68);
    doc.text(`Submitted: ${bid.submittedAt}`, 18, 76);
    doc.text(`Status: ${bid.status}`, 18, 84);

    doc.setDrawColor(210, 220, 215);
    doc.line(18, 92, 192, 92);

    doc.setFont("helvetica", "bold");
    doc.text("ATTACHED PROPOSAL DOCUMENTS:", 18, 102);
    doc.setFont("helvetica", "normal");

    let y = 110;
    bid.categories.forEach(cat => {
      doc.setFont("helvetica", "bold");
      doc.text(`• ${cat.label}:`, 22, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      if (cat.files.length === 0) {
        doc.text("  - No files uploaded", 26, y);
        y += 6;
      } else {
        cat.files.forEach(f => {
          doc.text(`  - ${f.name} (${(f.size / 1024).toFixed(1)} KB)`, 26, y);
          y += 6;
        });
      }
    });

    if (bid.evaluationNote) {
      y += 6;
      doc.setFont("helvetica", "bold");
      doc.text("PROCUREMENT COMMITTEE EVALUATION NOTE:", 18, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(bid.evaluationNote, 174);
      doc.text(lines, 18, y);
    }

    doc.save(`${bid.id}-Dossier.pdf`);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card glass-panel dossier-modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Procurement Committee Dossier</span>
            <h2>{bid.id}</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="dossier-meta-grid">
            <div><span>Tender Reference</span><b>{bid.ref}</b></div>
            <div><span>Tender Title</span><b>{bid.tenderTitle}</b></div>
            <div><span>Bidder Organization</span><b>{bid.bidderName}</b></div>
            <div><span>Bidder Contact</span><b>{bid.bidderEmail} · {bid.bidderPhone}</b></div>
            <div><span>Submission Timestamp</span><b>{bid.submittedAt}</b></div>
            <div><span>Total Attached Files</span><b>{bid.totalFiles} documents</b></div>
          </div>

          <div className="dossier-section">
            <h4>Evaluation Status & Compliance Actions</h4>
            <div className="status-action-row">
              {(["Pending Opening", "Under Evaluation", "Compliance Cleared", "Awarded", "Disqualified"] as const).map(st => (
                <button
                  key={st}
                  className={`status-btn ${bid.status === st ? "active" : ""}`}
                  onClick={() => onUpdateStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="dossier-section">
            <h4>Evaluation Committee Notes</h4>
            <div className="add-note-box">
              <textarea
                rows={2}
                placeholder="Enter official evaluation remarks, LRA verification status, or scoring notes..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button className="button secondary mini-btn" onClick={() => onUpdateNote(note)}>
                Save Evaluation Note
              </button>
            </div>
          </div>

          <div className="dossier-section">
            <h4>Attached Compliance & Proposal Files ({bid.totalFiles})</h4>
            <div className="dossier-categories-list">
              {bid.categories.map(cat => (
                <div key={cat.key} className="dossier-cat-card">
                  <div className="cat-title-row">
                    <b>{cat.label}</b>
                    <span>{cat.files.length} file{cat.files.length === 1 ? "" : "s"}</span>
                  </div>
                  {cat.files.length === 0 ? (
                    <small className="no-files-text">No documents attached in this category.</small>
                  ) : (
                    <div className="cat-files-grid">
                      {cat.files.map((file, idx) => (
                        <div key={idx} className="dossier-file-chip">
                          <span className="file-icon">📄</span>
                          <div className="file-info">
                            <span className="file-name">{file.name}</span>
                            <small className="file-meta">{(file.size / 1024).toFixed(1)} KB · Verified</small>
                          </div>
                          <button
                            className="download-file-btn"
                            onClick={() => downloadVaultFile(file.name, cat.label, bid.bidderName)}
                            title="Download verified attachment file"
                          >
                            ↓ Download
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="button primary" onClick={handleDownloadAllSummary}>
            Download Full Dossier PDF ↓
          </button>
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// MODAL: CONFIDENTIAL GRIEVANCE INTAKE
// ----------------------------------------------------------------------------
function GrievanceIntakeModal({
  onClose,
  onSubmitGrievance,
}: {
  onClose: () => void;
  onSubmitGrievance: (complaint: VaultComplaintRecord) => void;
}) {
  const [category, setCategory] = useState<VaultComplaintRecord["category"]>("Safeguarding & Harassment");
  const [severity, setSeverity] = useState<VaultComplaintRecord["severity"]>("Critical / High");
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !details.trim()) return;
    const ticketId = `LACD-GRV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const newRecord: VaultComplaintRecord = {
      id: ticketId,
      category,
      severity,
      complainantName: isAnonymous ? "Confidential Whistleblower (Identity Protected)" : (name.trim() || "Confidential"),
      complainantContact: isAnonymous ? "Encrypted Vault Channel" : (contact.trim() || "Protected"),
      submittedAt: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      subject: subject.trim(),
      details: details.trim(),
      status: "Received & Acknowledged",
      assignedOfficer: "Safeguarding & Ethics Focal Point",
      investigationNotes: [
        `${new Date().toLocaleDateString("en-GB")}: Confidential grievance logged directly into the Safeguarding Document Vault. Case review initiated under 48h protocol.`
      ]
    };
    onSubmitGrievance(newRecord);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-card glass-panel grievance-intake-modal">
        <div className="modal-header">
          <div>
            <span className="modal-eyebrow">Confidential Safeguarding Mechanism</span>
            <h2>Lodge Grievance or Whistleblower Alert</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="safeguarding-pledge-box">
              <span className="shield-icon">🛡</span>
              <p><b>Confidentiality Guarantee:</b> Submissions are routed directly to the designated Safeguarding & Ethics Officer. Whistleblower identities are protected by law and organizational policy.</p>
            </div>

            <div className="form-row-2">
              <label>
                <span>Grievance Category *</span>
                <select value={category} onChange={(e) => setCategory(e.target.value as any)}>
                  <option value="Safeguarding & Harassment">Safeguarding & Harassment</option>
                  <option value="Procurement Integrity / Fraud">Procurement Integrity / Fraud</option>
                  <option value="Service Delivery Quality">Service Delivery Quality</option>
                  <option value="Environmental / Social">Environmental / Social</option>
                  <option value="General Grievance">General Grievance</option>
                </select>
              </label>

              <label>
                <span>Severity Assessment *</span>
                <select value={severity} onChange={(e) => setSeverity(e.target.value as any)}>
                  <option value="Critical / High">Critical / High (Immediate action required)</option>
                  <option value="Medium">Medium (Standard 14-day inquiry)</option>
                  <option value="Routine">Routine (Service quality feedback)</option>
                </select>
              </label>
            </div>

            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
              />
              <span>Submit anonymously (Identity completely hidden from case files)</span>
            </label>

            {!isAnonymous && (
              <div className="form-row-2">
                <label>
                  <span>Your Name (Optional)</span>
                  <input placeholder="Enter name" value={name} onChange={(e) => setName(e.target.value)} />
                </label>
                <label>
                  <span>Confidential Phone or Email</span>
                  <input placeholder="For focal point contact" value={contact} onChange={(e) => setContact(e.target.value)} />
                </label>
              </div>
            )}

            <label>
              <span>Summary / Subject *</span>
              <input
                required
                placeholder="Brief summary of the issue or concern"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>

            <label>
              <span>Detailed Description & Evidence *</span>
              <textarea
                required
                rows={4}
                placeholder="Describe what occurred, dates, locations (e.g. County/Community), and any persons involved..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
          </div>

          <div className="modal-footer">
            <button className="button primary">Submit Grievance to Vault →</button>
            <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

