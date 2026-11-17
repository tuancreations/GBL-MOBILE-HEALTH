# GBL Mobile Health Services

GBL Mobile Health Services is a mobile-first health-services platform for patient registration, consultations, home visits, follow-up care, reporting, corporate accounts, and billing.

This repository currently contains the browser prototype. The production system should be developed as a **modular monolith**: one deployable backend with clear domain modules and one installable React PWA for web, mobile, and tablet clients.

## Recommended technology stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Web and mobile client | React + TypeScript + Vite | Responsive, installable PWA for phones, tablets, and desktops |
| Offline storage | IndexedDB with Dexie | Encrypted local cache and sync queue for field work |
| Backend API | Django + Django REST Framework | Authentication, permissions, admin, migrations, and REST APIs |
| Database | PostgreSQL | Relational integrity, reporting, audit data, and point-in-time recovery |
| Background jobs | Celery + Redis | SMS reminders, report generation, synchronization, and scheduled tasks |
| File storage | S3-compatible encrypted object storage | Lab reports and clinical attachments |
| Authentication | Django auth, Argon2, TOTP | Staff accounts, strong password hashing, and two-factor authentication |
| Reporting | PostgreSQL views + WeasyPrint | In-app charts and PDF exports |
| Integrations | Africa's Talking, payment aggregator, FHIR API layer | SMS, payments, and future interoperability |
| Infrastructure | Docker Compose, Nginx or Caddy, GitHub Actions | Reproducible deployment, TLS, and CI/CD |
| Monitoring | Sentry + Grafana | Error tracking, metrics, and operational visibility |

Confirm provider pricing, coverage, API limits, and current terms before selecting an integration vendor.

## Architecture

Use a modular monolith rather than microservices until scale or team boundaries justify a split. Every module should expose a stable API and own its business rules:

- **Identity and access**: users, staff roles, TOTP, sessions, and device registration.
- **Patient registry**: patient identity, assigned site/device, contacts, and identifiers.
- **Encounters**: consultations, vitals, diagnoses, clinical notes, and visit records.
- **Home visits**: scheduling, assignment, visit completion, and follow-up actions.
- **Appointments**: booking, status changes, reminders, and attendance.
- **Files and reports**: clinical attachments, generated reports, and access controls.
- **Billing and corporate accounts**: invoices, payments, packages, and account statements.
- **Notifications**: SMS and in-app notifications.
- **Audit and reporting**: immutable audit events, SQL reporting views, and exports.

Keep the internal model compatible with **ICD-10** and map it cleanly to **HL7 FHIR** resources. This allows future integrations without coupling core workflows to an external vendor.

## Offline-first rules

Offline capability must be deliberately limited to:

- Patient registration
- Vitals
- Consultation notes
- Home-visit records
- A cached copy of patients assigned to the device

Implement offline encounters as append-only records. Use a synchronization queue with idempotency keys, clear conflict handling, retry visibility, and server acknowledgements. Pre-allocate patient ID ranges per device or site so offline registration cannot produce duplicate `UG-XXX-YYY` identifiers.

Local data must be encrypted, protected by a device PIN, expire from unassigned devices, and support remote wipe. Do not cache the complete patient registry or unrestricted clinical history on a field device.

## Security and compliance requirements

- Enforce role-based and object-level permissions on every API endpoint.
- Use Argon2 for password hashing and TOTP two-factor authentication for staff.
- Encrypt sensitive fields at rest and use TLS for all network traffic.
- Record a complete, tamper-evident audit history for access and changes to clinical data.
- Apply least privilege to staff, service accounts, storage, and integrations.
- Validate uploads, restrict file types and sizes, and scan attachments before storage.
- Keep backups automated, encrypted, access-controlled, and regularly restore-tested.
- Obtain legal advice on Uganda's Data Protection and Privacy Act 2019, data residency, and cross-border transfers before choosing hosting regions.

## Hosting and operations

Start with Docker Compose on a managed VM in an appropriate African cloud region, such as AWS Cape Town, Azure South Africa, or Google Johannesburg. Use a second in-country backup copy where required by the legal review. Kubernetes is not needed at the initial scale.

Production should include:

1. Nginx or Caddy terminating TLS.
2. Django API, Celery workers, and Celery beat as separate containers.
3. PostgreSQL with point-in-time recovery.
4. Redis restricted to the private network.
5. S3-compatible storage with encryption and lifecycle policies.
6. GitHub Actions for tests, security checks, image builds, and deployment.
7. Sentry for exceptions and Grafana for service and job metrics.
8. Documented restore procedures tested on a schedule.

Never commit credentials. Store secrets in the deployment secret manager or protected CI/CD variables.

## Suggested repository structure

```text
gbl-mobile-health/
├── frontend/                 # React + TypeScript PWA
│   ├── src/modules/
│   ├── src/offline/
│   └── src/shared/
├── backend/                  # Django project
│   ├── config/
│   └── apps/
│       ├── identity/
│       ├── patients/
│       ├── encounters/
│       ├── visits/
│       ├── appointments/
│       ├── files/
│       ├── billing/
│       ├── notifications/
│       └── audit/
├── infrastructure/           # Docker, reverse proxy, and deployment config
├── docs/                     # ADRs, API contract, threat model, and runbooks
└── docker-compose.yml
```

Keep the current HTML/CSS/JavaScript prototype as a design reference while migrating screens into typed React components. Do not connect the prototype directly to production data.

## Full-system development plan

### Phase 0: discovery and validation

1. Confirm workflows with clinicians, field staff, administrators, and finance users.
2. Compare OpenMRS, Bahmni, and Frappe Health against the required home-visit, corporate-account, billing, and offline workflows.
3. Document the decision to build or adapt, including cost, customization, migration, and support implications.
4. Complete a data-protection review and define retention, consent, residency, and breach-response policies.

### Phase 1: foundation

1. Create the React/TypeScript PWA and Django/DRF projects.
2. Add PostgreSQL, Redis, Celery, Docker, environment configuration, and CI checks.
3. Implement staff identity, roles, TOTP, device registration, and audit events.
4. Define API versioning, error responses, pagination, identifiers, and permission conventions.

### Phase 2: clinical minimum viable product

1. Build patient registration and patient search.
2. Implement appointments, consultations, vitals, diagnoses, and follow-up plans.
3. Add home-visit assignment and completion.
4. Add the bounded offline cache, append-only encounters, sync queue, retries, and conflict reporting.
5. Add automated tests for permission boundaries, sync idempotency, and duplicate prevention.

### Phase 3: operations and reporting

1. Add SMS reminders through the selected provider.
2. Add encrypted clinical attachments and access-controlled downloads.
3. Add SQL reporting views, dashboards, and WeasyPrint PDF exports.
4. Add backup monitoring, restore drills, Sentry alerts, and Grafana dashboards.

### Phase 4: finance and interoperability

1. Add corporate accounts, invoices, packages, receipts, and payment reconciliation.
2. Integrate the selected mobile-money aggregator behind an internal payment interface.
3. Add a FHIR API layer after the internal clinical model is stable.
4. Add migration tools and operational runbooks for production rollout.

## Frontend implementation

The `frontend/` directory contains the React + TypeScript PWA foundation:

- Typed dashboard modules for overview, patients, appointments, home visits, investigations, referrals, billing, and reports.
- Responsive layouts for desktop, tablet, and mobile.
- Patient registration modal with accessible form controls.
- Online/offline status indicator and a Dexie-backed sync queue foundation.
- Installable PWA manifest.
- Mock data that can be replaced by Django REST API hooks without changing the page structure.

### Frontend user roles

The frontend includes a complete role-aware login experience for prototyping and API integration. Each role receives only the workspaces assigned to it:

| Role | Demo email | Access focus |
| --- | --- | --- |
| Administrator | `admin@gbl.health` | All workspaces and administration |
| Clinician | `clinician@gbl.health` | Patients, appointments, investigations, referrals, and reports |
| Nurse | `nurse@gbl.health` | Patients, appointments, home visits, and investigations |
| Field officer | `field@gbl.health` | Assigned patients, home visits, and appointments |
| Receptionist | `reception@gbl.health` | Patient registration and appointments |
| Finance officer | `finance@gbl.health` | Billing and reports |
| Patient | `patient@gbl.health` | Personal appointments and reports |

For the browser prototype, all demo accounts use `demo1234`. This is demonstration-only authentication; it must be replaced by Django authentication, Argon2 password hashing, TOTP, server-side sessions, object-level permissions, and audit logging before production.

Each role also receives a distinct landing dashboard:

- Patients see available services, booking actions, care-plan status, upcoming care, and support.
- Clinicians see consultation, investigation, referral, and follow-up work queues.
- Nurses see assigned patients, visits, appointments, and observations due.
- Field officers see route visits, assigned patients, check-ins, and offline follow-ups.
- Receptionists see registration, appointment, waiting-room, and referral activity.
- Finance officers see invoices, collections, pending payments, and revenue reporting.
- Administrators see organisation-wide care delivery and service performance.

The **Services** workspace is available from the hamburger navigation for every role. It is the shared service catalogue for consultations, home visits, investigations, and follow-up care; each role sees only the service actions allowed by its permissions.

The hamburger menu also includes an explicit **Log out** action. Logging out clears the active browser session and returns the user to the login screen.

### Account creation

The prototype login screen supports **Create an account**. New users provide a name, email, password, and account type, then are signed in immediately with the permissions for that role. Prototype accounts are stored locally so the flow can be demonstrated without a backend.

This local account flow is not production authentication. Before launch, move account creation to Django, hash passwords with Argon2, require email/phone verification and TOTP where applicable, restrict staff-role creation to administrators, and record account/audit events server-side. Never store raw passwords in browser storage in production.

### Dashboard plans and feature scope

The dashboard is the role-specific starting point, not a generic summary page. Each plan below defines the first set of production API resources, actions, and permissions for that user.

#### Administrator dashboard

- **Purpose:** organisation-wide operational control.
- **Primary resources:** patients, appointments, home visits, staff, audit events, reports, billing summaries, system health.
- **Priority actions:** review service KPIs, inspect safety and audit alerts, manage role permissions, review team activity, export reports, and monitor backup/sync health.
- **Frontend status:** KPI cards, permissions feedback, activity chart, appointments, patient activity, task queue, and links to every workspace.

#### Clinician dashboard

- **Purpose:** safe and efficient clinical decision-making.
- **Primary resources:** consultations, vitals, diagnoses, investigation results, referrals, follow-up plans, clinical attachments.
- **Priority actions:** open today's consultation queue, review results, respond to referrals, update care plans, and record follow-up decisions.
- **Frontend status:** clinical worklist cards, dashboard plan, appointments, patient activity, task queue, and clinical workspace navigation.

#### Nurse dashboard

- **Purpose:** coordinate observations and continuity of care.
- **Primary resources:** assigned patients, vitals, appointments, home visits, care plans, observations.
- **Priority actions:** prepare visits, capture vitals, triage appointment readiness, update care plans, and flag deterioration.
- **Frontend status:** nursing desk cards, dashboard plan, appointments, patient activity, task queue, and home-visit navigation.

#### Field officer dashboard

- **Purpose:** deliver reliable care during field work and poor connectivity.
- **Primary resources:** assigned patients, visit routes, offline registrations, vitals, visit records, sync queue, conflicts.
- **Priority actions:** view route, open assigned patient cache, record a visit offline, complete check-ins, resolve sync conflicts, and submit follow-ups.
- **Frontend status:** field-work cards, dashboard plan, offline status indicator, appointments, patient activity, and home-visit navigation.

#### Receptionist dashboard

- **Purpose:** keep registration and patient flow moving.
- **Primary resources:** patient registry, duplicate checks, appointments, check-in queue, referrals, SMS reminders.
- **Priority actions:** register a patient, verify identity, book or reschedule appointments, check patients in, and route referrals.
- **Frontend status:** front-desk cards, dashboard plan, registration action, appointment list, patient search, and referral navigation.

#### Finance officer dashboard

- **Purpose:** maintain accurate billing and collection workflows.
- **Primary resources:** corporate accounts, invoices, payment transactions, receipts, packages, reconciliation, finance reports.
- **Priority actions:** review outstanding invoices, reconcile payments, issue receipts, track balances, and export revenue reports.
- **Frontend status:** finance KPI cards, dashboard plan, billing/report navigation, task feedback, and role-restricted workspace access.

#### Patient dashboard

- **Purpose:** give patients clear, safe access to their own care.
- **Primary resources:** services, appointments, home visits, care plans, investigation results, notifications, support requests.
- **Priority actions:** book a consultation or home visit, view care plan, review results, see upcoming care, contact support, and access emergency guidance.
- **Frontend status:** patient portal, service cards, care status, dashboard plan, upcoming appointment, support actions, and patient-only navigation.

For each dashboard, production implementation must enforce server-side object permissions, return only the resources listed for that role, record audit events for clinical and financial changes, and expose explicit loading, empty, offline, sync-conflict, and error states.

Run the frontend during development:

```powershell
cd frontend
npm install
npm run dev
```

Create a production build:

```powershell
cd frontend
npm run build
```

The build output is generated in `frontend/dist/`. The current root-level HTML prototype remains available as a design reference; production frontend work should continue in `frontend/`.

## Local development

The current prototype is a static browser app. From this directory, run:

```powershell
python -m http.server 8000
```

Then open `http://127.0.0.1:8000/index.html`.

When the backend is introduced, document its commands here alongside the frontend commands, including:

- dependency installation
- environment variable setup
- PostgreSQL and Redis startup
- database migrations
- seed data
- test and lint commands
- local HTTPS/PWA testing
- background worker startup

## Quality gates

Before each release, require:

- TypeScript checks, linting, and unit/component tests.
- Django tests for authorization, audit logging, migrations, and API contracts.
- Offline synchronization tests covering retries, duplicates, conflicts, and partial connectivity.
- Dependency, container, upload, and secret scanning.
- Database backup and restore verification.
- Review of audit logs and monitoring alerts.
- Manual testing on low-end Android devices and poor network conditions.
