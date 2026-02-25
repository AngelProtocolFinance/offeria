import type { TReferralMethod, TRole } from "@/reg/schema";

export const UN_SDGS = [
  "GOAL 1: No Poverty",
  "GOAL 2: Zero Hunger",
  "GOAL 3: Good Health and Well-being",
  "GOAL 4: Quality Education",
  "GOAL 5: Gender Equality",
  "GOAL 6: Clean Water and Sanitation",
  "GOAL 7: Affordable and Clean Energy",
  "GOAL 8: Decent Work and Economic Growth",
  "GOAL 9: Industry, Innovation and Infrastructure",
  "GOAL 10: Reduced Inequality",
  "GOAL 11: Sustainable Cities and Communities",
  "GOAL 12: Responsible Consumption and Production",
  "GOAL 13: Climate Action",
  "GOAL 14: Life Below Water",
  "GOAL 15: Life on Land",
  "GOAL 16: Peace and Justice Strong Institutions",
  "GOAL 17: Partnerships to achieve the Goal",
];

export const ROLES: { [role in TRole]: string } = {
  president: "Chairperson/President",
  "vice-president": "Vice-Chair/President",
  secretary: "Secretary",
  treasurer: "Treasurer",
  ceo: "CEO",
  cfo: "CFO",
  "board-member": "Board Member",
  "leadership-team": "Leadership Team",
  "fundraising-finance": "Fundraising",
  legal: "Legal",
  communications: "Communications",
  "executive-director": "Executive Director",
  other: "Other",
};

export const REFERRALS: { [method in TReferralMethod]: string } = {
  referral: "Others", //not used: formerly: "Referral Code"
  "better-giving-alliance": "Offeria website",
  discord: "Discord",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  press: "Press",
  "search-engines": "Search Engine",
  twitter: "Twitter",
  medium: "Others", //not used formerly: "Medium"
  other: "Others",
};
