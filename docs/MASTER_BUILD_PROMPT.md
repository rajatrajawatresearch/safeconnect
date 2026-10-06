# MASTER BUILD PROMPT — INDIA PUBLIC SAFETY & EMERGENCY RESPONSE PLATFORM

> Saved verbatim from the original brief. This is the source of truth for scope.

You are the lead product architect, senior UX designer, and senior full-stack engineer.

Build a polished, production-style **Public Safety, Emergency Response & Police Operations Platform** for an Indian state/government deployment.

This is NOT a simple SOS application.

It is an integrated platform consisting of:

1. Citizen Safety App
2. Emergency SOS System
3. Police Field Officer App
4. Emergency Control Room / Dispatch Console
5. Supervisor & Station Dashboard
6. District/State Command Center
7. Complaint & Incident Management
8. Secure Voice/Video Assistance UI
9. Digital Evidence Management
10. Live Response & Location Tracking
11. Emergency Resource Management
12. Analytics & Response Monitoring
13. Role-Based Administration
14. Inter-agency Integration Layer

The initial demo may use **Gujarat Public Safety / Gujarat Police-style neutral government branding**, but architecture and UI must support deployment for ANY Indian state or central public-safety organization.

Do not use copyrighted government logos. Create a neutral placeholder government/public-safety emblem.

---

# 1. PRODUCT VISION

Create a unified digital public-safety system where a citizen facing danger, witnessing an incident, requiring police assistance, or wanting to report something can contact the appropriate response system quickly.

Example:

Citizen sees danger
→ opens app
→ presses SOS
→ location attached
→ control room receives incident
→ operator evaluates
→ responder assigned
→ citizen receives live status
→ secure voice/video communication may start
→ responder reaches location
→ evidence and actions become part of incident timeline
→ incident is resolved/escalated
→ complaint/case workflow may continue.

The UX must reduce panic, confusion, typing, and unnecessary navigation during emergencies.

---

# 2. IMPORTANT PRODUCT PRINCIPLES

Design around:

- safety
- speed
- simplicity
- accessibility
- privacy
- accountability
- minimum required data access
- human oversight
- auditability
- resilience on weak networks
- multilingual use
- mobile-first emergency interaction

This should NOT behave like a mass-surveillance application.

Citizen location sharing should occur only through clearly defined safety/emergency features, explicit user action, or applicable authorized workflows.

Police/staff access must be role-based and auditable.

AI must assist humans rather than autonomously make high-impact policing decisions.

---

# 3. USERS & ROLES

Implement role-aware demo experiences.

## Citizen

Can:

- trigger emergency SOS
- use silent SOS
- request police assistance
- report incidents
- send confidential tips
- submit complaints
- share location
- upload photos/videos/audio
- communicate with control room
- participate in secure video/voice assistance UI
- track responding unit
- track complaint
- manage emergency contacts
- use journey safety
- view safety information
- manage privacy/permissions

## Emergency Operator

Can:

- receive SOS
- view incoming incidents
- see citizen location when shared/authorized
- communicate with citizen
- review incident details
- classify incident
- assign/escalate
- request dispatcher action
- create incident notes
- access relevant evidence

## Dispatcher

Can:

- see available response units
- see live incident map
- assign appropriate unit
- reassign units
- request backup
- coordinate multiple units
- monitor response progress

## Field Police Officer

Can:

- receive assignment
- accept/reject with reason
- navigate to incident
- update response status
- contact control room
- communicate with citizen when authorized
- request backup
- record field notes
- capture/upload evidence
- complete incident response

## Supervisor / Station Level

Can:

- monitor station incidents
- monitor units
- see unresolved cases
- review escalations
- manage assignments
- monitor SLA/response time
- supervise personnel
- view operational analytics

## District / Commissionerate Command

Can:

- view aggregate operational map
- monitor critical incidents
- view district metrics
- see resource availability
- monitor hotspots
- review escalations
- view cross-station operations

## State Command

Can:

- statewide command overview
- major incident monitoring
- resource utilization
- district comparisons
- response trends
- escalation monitoring
- system health
- policy/configuration overview

## System Administrator

Can manage:

- organizations
- districts
- stations
- users
- roles
- permissions
- emergency categories
- escalation rules
- response SLAs
- integrations
- notification templates
- localization
- audit settings
- demo configuration

---

# 4. CORE INCIDENT TYPES

Support UI/flows for:

### Immediate Safety

- personal danger
- assault
- harassment
- stalking
- woman safety
- child safety
- senior citizen emergency
- domestic violence
- threat/intimidation
- kidnapping/missing person
- suspicious activity

### Public Safety

- fighting
- public nuisance
- vandalism
- dangerous crowd
- suspicious object/activity
- illegal activity
- unauthorized weapons report
- public disturbance

### Traffic

- accident
- reckless driving
- suspected drunk driving
- road rage
- dangerous vehicle
- blocked road
- traffic hazard

### Drugs / Crime Intelligence

- suspected drug dealing
- suspicious distribution
- confidential tip
- organized criminal activity report

Do not encourage citizens to confront suspects.

### Cyber / Financial

- online fraud
- cyber harassment
- identity misuse
- threatening messages
- impersonation
- financial scam
- account compromise

### Emergency Assistance

- police
- ambulance
- fire
- disaster response
- other emergency support

---

# 5. CITIZEN APP

Citizen interface must be extremely easy.

## Citizen Home

Top:

Good morning, Aarav

Ahmedabad
Safety Status: Normal

Prominent emergency card:

EMERGENCY?

[ HOLD FOR SOS ]

Secondary quick actions:

Police Help
Medical
Fire
Women Safety
Child Safety
Report Incident

Then:

Journey Safety
Report Something
My Complaints
Nearby Help
Emergency Contacts
Safety Center

Bottom navigation:

Home
Report
Safety
Activity
Profile

---

# 6. SOS EXPERIENCE

SOS button must NOT activate accidentally in the demo.

Use:

PRESS & HOLD 3 SECONDS

Visual countdown:

3
2
1

Then:

SOS ACTIVATED

Show:

Incident ID
current approximate location
time
connection status

Status timeline:

SOS Sent
↓
Control Room Connected
↓
Operator Assigned
↓
Police Unit Assigned
↓
Responder En Route
↓
Responder Arrived

Actions:

Start Voice Call
Start Video
Chat
Share Media
Silent Mode
Cancel / False Alarm

Cancellation requires confirmation/reason.

---

# 7. SILENT SOS

Create discreet emergency mode.

Features:

- minimal visual feedback
- silent activation
- live location sharing indicator
- optional trusted contact notification
- chat-based communication
- discreet screen mode

This is UI/demo behavior only.

Do not implement hidden surveillance or deceptive recording mechanisms.

---

# 8. VIDEO / VOICE ASSISTANCE

Build beautiful mock WebRTC-style UI.

Show:

Officer/Operator
Citizen
connection quality
mute
speaker
camera
switch camera
end
emergency escalation
share location

Example:

SECURE SAFETY SESSION

Officer:
"Stay in a safe location. A response unit has been dispatched."

Show:

Unit GJ-17
ETA 04:32

This demo does NOT need actual WebRTC infrastructure unless easy to scaffold.

Create service interfaces so real WebRTC can later replace mocks.

---

# 9. INCIDENT REPORTING

Build guided reporting.

STEP 1
What happened?

STEP 2
Is anyone currently in danger?

STEP 3
Where did it happen?

STEP 4
When?

STEP 5
Who/what was involved?

STEP 6
Evidence

Photo
Video
Audio
Document

STEP 7
Contact preference

STEP 8
Review & Submit

Allow:

Emergency Report
Normal Report
Confidential Tip

Clearly distinguish anonymous/confidential information from formal complaints.

---

# 10. COMPLAINT TRACKING

Citizen sees:

Complaint ID
category
station/department
submitted date
current status
assigned authority if appropriate
timeline
updates
documents

Statuses:

Submitted
Received
Under Review
Assigned
Action in Progress
Additional Information Required
Resolved
Closed

Do not claim demo complaints are equivalent to FIRs or official statutory filings.

---

# 11. JOURNEY SAFETY

Create:

Start Safe Journey

Destination
Expected arrival
Trusted contacts
Safety check interval

During journey:

timer
map
current journey status
share status
I'm Safe
Need Help
Emergency SOS

Use clear consent and allow journey tracking to stop.

---

# 12. TRUSTED CONTACTS

Citizen can add:

Mother
Father
Partner
Friend
Guardian

Configuration:

Notify on SOS
Notify during journey emergency
Share location during active emergency

---

# 13. FIELD POLICE APP

Mobile-first officer interface.

Home:

ON DUTY

Officer:
PSI Arjun Patel

Unit:
GJ-AHD-17

Status:
AVAILABLE

Cards:

New Assignment
Active Incident
Patrol
Messages
Nearby Incidents
Reports

Assignment card:

PRIORITY: CRITICAL

Woman Safety / Harassment

Distance: 1.8 km
ETA: 5 min

[ACCEPT]

After accept:

EN ROUTE

Actions:

Navigate
Contact Citizen
Control Room
Request Backup
Arrived
Update Incident

Statuses:

Assigned
Accepted
En Route
On Scene
Assistance Requested
Situation Controlled
Report Pending
Completed

---

# 14. CONTROL ROOM

Desktop-first professional interface.

Create a modern operations console.

Layout:

LEFT SIDEBAR

Overview
Live Incidents
Dispatch
Map
Units
Calls
Complaints
Evidence
Stations
Analytics
Escalations
Messages
Audit
Settings

TOP BAR

Search
Current shift
Critical alerts
Notifications
Operator profile

MAIN OVERVIEW

Cards:

Active Emergencies
Critical Incidents
Units Available
Units En Route
Average Response Time
Unassigned Incidents

Large live map.

Right side:

LIVE INCIDENT FEED

Example:

CRITICAL
Woman Safety
Navrangpura
00:42 ago

HIGH
Road Accident
SG Highway
02:13 ago

MEDIUM
Public Disturbance
Maninagar
04:51 ago

---

# 15. INCIDENT DETAIL PANEL

Incident:

GJ-AHD-2026-28491

Severity:
CRITICAL

Category:
Woman Safety / Harassment

Citizen:
Demo Citizen

Location:
Navrangpura

Coordinates:
demo coordinates

Created:
00:42 ago

Tabs:

Overview
Timeline
Communication
Evidence
Responders
Notes
Audit

Actions:

Call Citizen
Video Connect
Assign Unit
Dispatch
Request Backup
Escalate
Transfer
Resolve

---

# 16. DISPATCH BOARD

Create drag/drop-style interface.

Columns:

UNASSIGNED

ASSIGNED

EN ROUTE

ON SCENE

RESOLVED

Cards show:

incident
priority
location
elapsed time
assigned unit

Allow demo transitions.

---

# 17. LIVE OPERATIONS MAP

Create realistic map-like UI.

Use Leaflet + OpenStreetMap if convenient and compatible.

Markers:

Critical incident
High priority
Normal incident
Available unit
Busy unit
Station
Hospital
Fire station

Click marker → detail drawer.

Filters:

Incident Type
Severity
Status
Station
Unit
Time

Do not require paid map APIs.

---

# 18. UNIT MANAGEMENT

Units:

GJ-AHD-01
GJ-AHD-04
GJ-AHD-17

Show:

officer
vehicle
station
status
current assignment
last authorized operational location
availability

Statuses:

Available
Assigned
En Route
On Scene
Unavailable
Off Duty

---

# 19. DIGITAL EVIDENCE CENTER

Evidence must look serious and professional.

Evidence types:

photo
video
audio
document
citizen upload
officer upload

Show:

Evidence ID
Incident ID
Type
Uploaded by
Captured/submitted time
Integrity status
Access classification

Evidence detail:

Preview
Metadata
Associated Incident
Integrity Hash
Access History
Retention Classification

Timeline:

Uploaded
Integrity recorded
Linked to incident
Viewed by authorized user
Export requested

Use fake hashes.

Never modify original evidence in the demo.

---

# 20. AUDIT LOG

Create immutable-looking audit UI.

Example:

00:42:03
SOS received

00:42:08
Operator Meera opened incident

00:42:19
Unit GJ-AHD-17 assigned

00:42:41
Officer accepted

00:43:05
Secure communication initiated

00:47:12
Unit arrived

Filter:

User
Role
Incident
Action
Date

---

# 21. COMMAND CENTER

Executive operational dashboard.

Cards:

Active Incidents
Critical Incidents
Average Response
Resolved Today
Available Units
Escalations

Charts:

Incidents by hour
Response time trend
Incidents by category
District activity
Resolution trend
Resource availability

Map:

State/District operations.

Do not use flashy finance-dashboard styling.

It must feel like a real public-safety operations environment.

---

# 22. INCIDENT PRIORITY

Demo levels:

P1 CRITICAL
Immediate threat to life/safety.

P2 HIGH
Serious active situation.

P3 MEDIUM
Requires timely police attention.

P4 NORMAL
Non-emergency report.

AI can display:

AI ASSISTED TRIAGE
Suggested: P2 High
Reason: reported active harassment

But require:

OPERATOR CONFIRMATION

Never let demo AI autonomously determine enforcement action.

---

# 23. AI ASSISTANT

Add a small operator assistant.

Capabilities demonstrated through mock data:

- incident summarization
- transcript summarization
- translation
- suggested category
- suggested priority
- duplicate report detection
- missing information detection
- report drafting

Example:

AI Incident Summary

"Citizen reports being followed by two individuals near Navrangpura. Citizen states she is currently inside a shop. No weapon reported."

Suggested actions should remain advisory.

---

# 24. MULTILINGUAL UX

Language selector:

English
ગુજરાતી
हिन्दी

Architecture should allow more languages later.

Implement enough sample translated UI to demonstrate language switching.

---

# 25. LOW CONNECTIVITY

Create connectivity indicator.

ONLINE

WEAK NETWORK

OFFLINE

For demo:

If offline:

Emergency request queued
Attempting emergency fallback

Architecture should support eventual synchronization.

Do NOT fake an actual SMS/telecom emergency connection.

---

# 26. PRIVACY CENTER

Citizen:

Location Access
Camera
Microphone
Notifications
Emergency Contacts
Emergency Location Sharing
Journey Sharing

Explain:

"When Emergency Location Sharing is enabled, your location may be shared with authorized responders during an active emergency."

Provide:

Download My Data
Privacy Information
Consent History
Permissions

Actual implementation can be mock.

---

# 27. STAFF ACCESS SECURITY

Design for:

RBAC
least privilege
session security
MFA-ready authentication
device/session tracking
auditing
sensitive data masking
evidence access logging
permission scopes

Example permissions:

incident.read.assigned
incident.dispatch
incident.escalate
evidence.view
evidence.export
unit.assign
analytics.district
analytics.state
admin.roles

---

# 28. ORGANIZATIONAL HIERARCHY

Architecture:

Platform
→ State
→ Commissionerate / District
→ Division / Subdivision
→ Police Station
→ Unit
→ Officer

Do not hard-code one police organization.

---

# 29. INTER-AGENCY DESIGN

Create integration placeholders for:

Police
Emergency response
Ambulance
Fire
Disaster management
Cybercrime systems
Government identity/verification systems where legally authorized
Existing police systems

Use adapters/interfaces.

No real government integration required.

---

# 30. DEMO PERSONAS

Create mock users.

Citizen:

Aarav Shah

Citizen:

Kavya Patel

Operator:

Meera Joshi

Field Officer:

PSI Arjun Patel

Supervisor:

Inspector Neha Desai

Command:

DCP Vikram Rao

Admin:

System Administrator

Role switcher must be available in DEMO MODE.

---

# 31. DEMO INCIDENTS

Seed 20–30 incidents.

Include:

Woman safety
Road accident
Public disturbance
Missing child
Cyber fraud
Domestic violence
Suspicious activity
Drug-related confidential tip
Traffic hazard
Senior citizen assistance

Use fictional people and data.

---

# 32. UI DESIGN DIRECTION

CRITICAL REQUIREMENT.

The UI must NOT look like:

- generic Bootstrap
- old government portal
- hackathon project
- basic admin template
- childish emergency app

Target:

**modern civic technology + premium emergency operations software + subtle Gen-Z polish.**

Think conceptually:

Linear
Vercel
Apple
modern command centers
premium fintech
modern emergency applications

Do NOT clone them.

Design language:

Minimal
Calm
High trust
Fast
Premium
Professional
Information dense where required
Spacious citizen UI
Operational command UI

Use:

large typography
clean cards
subtle borders
soft shadows
excellent spacing
rounded corners
clear hierarchy
micro animations
skeleton loading
drawers
command palette
tooltips
status chips
beautiful empty states
smooth page transitions

Avoid excessive gradients.

Avoid excessive glassmorphism.

Emergency red should be used primarily for critical states, not across the entire application.

---

# 33. DARK + LIGHT MODE

Implement:

Light
Dark
System

Citizen UI should look excellent in both.

Control room dark mode should be especially polished.

Persist preference.

---

# 34. RESPONSIVENESS

ABSOLUTELY REQUIRED.

Design:

320px
375px
430px
768px
1024px
1280px
1440px
1920px+

Citizen app:

mobile-first.

Police field app:

mobile/tablet-first.

Control room:

desktop-first but responsive.

Command center:

desktop/large display optimized.

No horizontal overflow.

Tables become:

cards
drawers
or horizontally managed components

on small devices.

Navigation:

Mobile → bottom navigation / sheets

Tablet → compact navigation

Desktop → sidebar

Large monitor → expanded operations layout

---

# 35. ACCESSIBILITY

Target WCAG-friendly design.

Implement:

keyboard navigation
focus states
ARIA labels
screen-reader-friendly buttons
sufficient contrast
large emergency controls
reduced motion support
accessible dialogs
semantic HTML

SOS must be extremely obvious and accessible.

---

# 36. RECOMMENDED FAST STACK

Build as a frontend-heavy functional prototype first.

Use:

Next.js latest stable
TypeScript
App Router

UI:

Tailwind CSS
shadcn/ui
Radix primitives
Lucide icons

State:

Zustand

Server/cache where useful:

TanStack Query

Forms:

React Hook Form
Zod

Charts:

Recharts

Maps:

Leaflet
OpenStreetMap

Animation:

Framer Motion / Motion

Tables:

TanStack Table

Dates:

date-fns

Use npm unless environment already uses pnpm.

Avoid unnecessary dependencies.

---

# 37. PROJECT ARCHITECTURE

Use clean feature-oriented structure.

Example:

src/
app/
components/
ui/
shared/
layout/
features/
auth/
citizen/
sos/
incidents/
dispatch/
units/
communications/
evidence/
complaints/
journey/
command/
analytics/
audit/
admin/
services/
hooks/
stores/
types/
data/
lib/
config/

Keep domain logic separate from visual components.

---

# 38. DEMO MODE

This build MUST run without backend credentials.

Create:

src/data/demo/

Seed realistic data.

Implement simulated actions.

Example:

Press SOS
→ incident created locally
→ status changes after delay
→ operator assigned
→ responder assigned
→ ETA displayed.

Dispatch officer
→ unit status changes.

Resolve incident
→ incident timeline updates.

Upload evidence
→ mock evidence record generated.

Everything should feel functional.

---

# 39. ROLE SWITCHER

Development/demo mode:

[Citizen]
[Officer]
[Operator]
[Supervisor]
[Command]
[Admin]

Switching role should open corresponding interface.

This is critical for presenting the entire platform from one deployment.

---

# 40. BACKEND-READY INTERFACES

Even if prototype uses mock data, create typed service boundaries:

IncidentService

SOSService

DispatchService

UnitService

EvidenceService

CommunicationService

ComplaintService

JourneyService

NotificationService

AuditService

AuthService

AnalyticsService

Later real APIs should be replaceable without rewriting UI.

---

# 41. FUTURE PRODUCTION BACKEND

Do NOT spend prototype time building all of this.

Document future architecture for:

ASP.NET Core / NestJS-style service layer

PostgreSQL

Redis

object storage

WebSocket/SSE realtime

WebRTC communications

message/event infrastructure

notification providers

observability

audit infrastructure

GIS

secure evidence storage

Production government deployment would require security architecture, legal review, procurement/integration requirements and infrastructure decisions.

---

# 42. IMPORTANT DATA ENTITIES

Define TypeScript types/interfaces for:

User
Citizen
StaffUser
Role
Permission
Organization
District
Station
Unit
Officer
Incident
IncidentCategory
IncidentPriority
IncidentStatus
Location
Assignment
CommunicationSession
Message
Evidence
EvidenceAccess
Complaint
Journey
EmergencyContact
Notification
Escalation
AuditEvent
ResponseMetric

---

# 43. PRIMARY ROUTES

Create routes similar to:

/

/citizen
/citizen/sos
/citizen/report
/citizen/activity
/citizen/complaints
/citizen/journey
/citizen/safety
/citizen/profile

/officer
/officer/assignment
/officer/incidents
/officer/reports

/control
/control/incidents
/control/dispatch
/control/map
/control/units
/control/communications
/control/complaints
/control/evidence
/control/escalations

/command
/command/operations
/command/analytics
/command/districts
/command/resources

/admin
/admin/users
/admin/roles
/admin/organization
/admin/categories
/admin/slas
/admin/integrations
/admin/audit
/admin/settings

---

# 44. COMMAND PALETTE

Desktop:

CMD/CTRL + K

Commands:

Open Incidents
Search Incident
Dispatch Unit
Open Map
Critical Incidents
Units Available
Evidence Center
Command Center

---

# 45. GLOBAL SEARCH

Search:

Incident ID
Complaint ID
Unit
Officer
Station
authorized citizen/complainant information

Display grouped results.

Respect role permissions conceptually.

---

# 46. NOTIFICATIONS

Examples:

CRITICAL INCIDENT RECEIVED

Unit GJ-AHD-17 assigned

Backup requested

Incident escalated

New evidence received

Complaint updated

Create toast + notification center.

---

# 47. RESPONSE TIMER

Critical incidents should prominently show:

00:04:32

Since incident creation.

Use visual urgency without obnoxious flashing.

---

# 48. INCIDENT TIMELINE

Every incident gets chronological timeline:

00:42:03
SOS CREATED

00:42:08
CONTROL ROOM ACKNOWLEDGED

00:42:19
UNIT ASSIGNED

00:42:41
OFFICER ACCEPTED

00:43:01
UNIT EN ROUTE

00:47:12
OFFICER ARRIVED

---

# 49. ANALYTICS

Demo metrics:

Response Time

Incident Volume

Resolution Time

Active vs Resolved

Category Distribution

District Distribution

Unit Utilization

SLA Compliance

Escalation Rate

Use visually excellent charts.

Never use demographic profiling or predictive-policing scoring.

---

# 50. HOTSPOT VIEW

Map may display historical incident density using aggregated demo data.

Label clearly:

Historical Incident Density

NOT:

"Crime Prediction"

Do not predict individuals or communities as criminals/high risk.

---

# 51. LOADING / EMPTY / ERROR STATES

Every major page needs polished states.

Examples:

No active incidents.

"All clear. No active emergency incidents in this view."

Offline:

"Connection interrupted. Reconnecting…"

Error:

"Unable to load incidents."

Retry button.

---

# 52. DEMO SAFETY DISCLAIMER

Small demo banner:

"Prototype / Demonstration Environment — Not connected to real emergency services."

Do not display it so aggressively that it ruins the UI.

---

# 53. LANDING / ROLE ENTRY

Create impressive landing page.

Headline:

PUBLIC SAFETY
CONNECTED.

Subtitle:

One platform connecting citizens, emergency operators, field responders and command teams.

Show:

Citizen Safety

Emergency Response

Live Dispatch

Digital Evidence

Operational Intelligence

CTA:

Explore Demo

Open Command Center

---

# 54. DESIGN DETAILS

Use consistent design tokens.

Typography:

Inter / Geist or similarly clean open font.

Rounded:

medium radius.

Icons:

Lucide.

Spacing:

8px-derived system.

Cards:

minimal borders.

Status colors:

Critical
High
Medium
Normal
Resolved

Do not overwhelm screen with colors.

Citizen experience = warm and reassuring.

Officer experience = fast and action-oriented.

Control room = dense but organized.

Command center = analytical.

---

# 55. MOBILE INTERACTIONS

Use:

bottom sheets
swipe-friendly cards
large touch targets
sticky actions
bottom navigation
full-screen emergency states

Do NOT simply shrink desktop screens.

Build genuinely responsive variants.

---

# 56. CITIZEN EMERGENCY SCREEN

This screen deserves exceptional design.

After SOS:

EMERGENCY ACTIVE

HELP IS BEING COORDINATED

Operator:
Meera

Responder:
Unit GJ-AHD-17

ETA:
4 min

Map

LIVE STATUS

Control Room Connected ✓
Responder Assigned ✓
Responder En Route ●

Buttons:

Voice
Video
Chat

Secondary:

Share Media
Trusted Contact

Large:

I AM SAFE / CANCEL SOS

with confirmation.

---

# 57. OFFICER RESPONSE SCREEN

Large:

CRITICAL

Woman Safety

1.8 km away

Navigation preview.

Citizen communication status.

Buttons:

NAVIGATE

CONTACT

ARRIVED

REQUEST BACKUP

Incident intelligence:

Description
Location
Timeline
Relevant evidence
Control room notes

Keep personally sensitive data minimal.

---

# 58. CONTROL ROOM MULTI-PANEL UX

On >=1440px:

Sidebar | Incident Queue | Map | Incident Inspector

Allow collapsible panels.

At 1024–1439:

Sidebar | Main | Drawer

Mobile:

Cards + bottom navigation.

---

# 59. REALTIME SIMULATION

Build a simple demo event simulator.

Randomly:

new incident appears
unit changes status
incident gets acknowledged
responder ETA changes
notification appears

Provide:

Pause Simulation

Reset Demo

Do not make demo chaotic.

---

# 60. PERFORMANCE

Target:

fast first load
route-level lazy loading where useful
optimized icons
minimal heavy libraries
no giant images
skeletons
memoize expensive map/list operations

---

# 61. SECURITY UX

Create UI for:

session timeout
MFA placeholder
permission denied
restricted evidence
sensitive data badge

Example:

RESTRICTED EVIDENCE

Your role does not permit access.

---

# 62. ADMIN ROLE BUILDER

Create polished permission editor.

Role:

Emergency Operator

Permissions grouped:

Incidents
Dispatch
Communication
Evidence
Complaints
Analytics
Administration

Checkbox permissions.

Show users assigned to role.

---

# 63. ESCALATION ENGINE UI

Admin config example:

P1 incident

No acknowledgement within 30 sec
→ alert supervisor

No assignment within 60 sec
→ escalate dispatcher

No response progress within configured threshold
→ notify command

These are DEMO policies, not official police rules.

Make configurable.

---

# 64. RESPONSE SLA UI

Show:

Acknowledgement
Dispatch
Arrival
Resolution

with configured demo targets.

Do not claim these are official government SLAs.

---

# 65. STATION DASHBOARD

Station:

Navrangpura Police Station — DEMO

Cards:

On-duty officers
Available units
Active incidents
Pending reports
Escalations

Officer list

Unit availability

Recent incidents

---

# 66. INCIDENT COMMUNICATION CENTER

Tabs:

Voice
Video
Chat
Internal Notes

Chat example:

Citizen:
"Two people are following me."

Operator:
"Stay inside the shop. A response unit has been assigned."

Officer:
"Unit 17 en route."

Clearly separate citizen-visible communication from INTERNAL NOTES.

---

# 67. DIGITAL CASE HANDOFF

After emergency resolution:

Incident

→ Preliminary Response Report

→ Complaint / further official process when applicable

→ Evidence package reference

→ Supervisor review

Do not build fake legal workflows pretending to be official FIR processes.

Keep adapters/placeholders for future integration with authorized systems.

---

# 68. DESIGN QUALITY BAR

Before considering a page complete, ask:

Would this look credible in front of:

State police leadership?

Government technology officials?

Emergency control-room operators?

A citizen?

A professional product designer?

If it looks like a hackathon template, redesign it.

---

# 69. PRIORITY OF IMPLEMENTATION

Do NOT spend hours overengineering backend.

Priority:

1. Foundation/design system
2. Demo data
3. Citizen application
4. SOS experience
5. Officer application
6. Control room
7. Dispatch
8. Map
9. Incident detail
10. Evidence
11. Command dashboard
12. Admin
13. Responsive polish
14. Interactions
15. Accessibility
16. Final QA

---

# 70. BUILD STRATEGY

Work autonomously.

Do NOT repeatedly ask me questions.

Make sensible assumptions.

First inspect environment.

Then:

Initialize app if required.

Install dependencies.

Create architecture.

Build design system.

Build demo data.

Implement routes.

Implement interactions.

Run lint/typecheck/build.

Fix errors.

Run application.

Perform visual consistency pass.

Fix responsive issues.

Do not stop after creating skeleton files.

I want a WORKING application.

---

# 71. ACCEPTANCE CRITERIA

The project is complete only when:

- app runs successfully
- no TypeScript build errors
- citizen experience works
- SOS simulation works
- officer assignment works
- control room works
- dispatch board works
- map works
- incident detail works
- evidence center exists
- command center exists
- admin interface exists
- role switching works
- seeded demo data exists
- light/dark mode works
- mobile works
- tablet works
- desktop works
- large monitor works
- navigation works
- major buttons have functional demo behavior
- empty/loading/error states exist
- accessibility basics implemented
- prototype disclaimer exists
- README contains run instructions

---

# 72. FINAL QUALITY PASS

After implementation:

Run:

npm install
npm run lint
npm run build

Fix ALL errors you introduced.

Check:

375px
430px
768px
1024px
1440px
1920px

Look specifically for:

overflow
broken grids
bad typography
clipped dialogs
unusable maps
tiny touch targets
broken dark mode
misaligned cards
inconsistent spacing
fake/non-working actions

Polish them.

---

# 73. README

Create comprehensive README containing:

Product overview
Architecture
Roles
Features
Tech stack
Directory structure
Demo accounts/role switcher
How to run
How demo simulation works
How to replace mock services with APIs
Future backend architecture
Security considerations
Privacy considerations
Production limitations

---

# 74. FINAL INSTRUCTION

Start implementation NOW.

Do not give me a long explanation before coding.

Do not merely create a plan.

Do not stop at a landing page.

Build the complete frontend prototype across all major roles.

Prioritize exceptional UI/UX and functional demo flows over unnecessary backend complexity.

The finished experience should feel like:

**"If a modern Indian public-safety platform were designed in 2026 by a world-class product team."**

It should be minimal, calm, extremely polished, responsive, trustworthy, modern and genuinely useful — not visually overloaded.

Proceed autonomously, test it, fix it, and leave the repository in a runnable state.
