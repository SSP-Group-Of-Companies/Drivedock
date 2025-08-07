import { CanadianCompanyId, ECompanyId } from "./companies";

export const CANADIAN_PDFS = [
    { label: "Company Driver Policy", path: "/docs/policies-consent-forms/ca/company-driver-policy.pdf" },
    { label: "ISB Consent Form", path: "/docs/policies-consent-forms/ca/isb-consent-form-1.pdf" },
    { label: "Personal Consent (CROF-I)", path: "/docs/policies-consent-forms/ca/personal-consent-form-cfroi-1.pdf" },
    { label: "PSP Authorization Form", path: "/docs/policies-consent-forms/ca/psp-authorization-form-1.pdf" },
    { label: "Road Test Certificate", path: "/docs/policies-consent-forms/ca/road-test-certificate-1.pdf" },
];

export const US_PDFS = [
    { label: "Company Driver Policy", path: "/docs/policies-consent-forms/us/company-driver-policy-1.pdf" },
    { label: "Personal Consent (CROF-I)", path: "/docs/policies-consent-forms/us/personal-consent-form-cfroi-us-drivers-1.pdf" },
    { label: "PSP Authorization Form", path: "/docs/policies-consent-forms/us/psp-authorization-form-us-drivers-1.pdf" },
    { label: "Road Test Certificate", path: "/docs/policies-consent-forms/us/road-test-certificate-us-drivers-1.pdf" },
];

export const CANADIAN_HIRING_PDFS: Record<CanadianCompanyId, { label: string; path: string }> = {
    [ECompanyId.SSP_CA]: {
        label: "SSP Hiring Application",
        path: "/docs/policies-consent-forms/ca/hiring/ssp-hiring-application.pdf",
    },
    [ECompanyId.FELLOW_TRANS]: {
        label: "Fellows Hiring Application",
        path: "/docs/policies-consent-forms/ca/hiring/fellows-hiring-application.pdf",
    },
    [ECompanyId.NESH]: {
        label: "New England Hiring Application",
        path: "/docs/policies-consent-forms/ca/hiring/new-england-hiring-application.pdf",
    },
    [ECompanyId.WEB_FREIGHT]: {
        label: "Web Freight Hiring Application",
        path: "/docs/policies-consent-forms/ca/hiring/web-freight-hiring-application.pdf",
    },
};