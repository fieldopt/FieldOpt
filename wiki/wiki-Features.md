# Features

FieldOpt provides a complete toolkit for modern dispatch management.

---

## Technician Management

### Technician List
View all technicians in a real-time grid showing:
- **Status** — Available, On Break, Assigned, Off Duty
- **Shift** — Start and end times
- **Skills** — Certifications and capabilities
- **Capacity** — Max jobs they can handle
- **Workload** — Current assignments
- **Contact** — Phone number

### Skills & Qualifications

Each technician is assigned skills that determine what jobs they can do:

- **install** — New line installations
- **repair** — Troubleshooting and fixes
- **maintenance** — Preventive maintenance visits
- **disconnect** — Service disconnections
- **service_change** — Plan or tier changes
- **inspection** — Site surveys and audits

### Status Management

- **Available** — Ready for assignment
- **On Break** — Temporarily unavailable
- **Assigned** — Has active jobs
- **Off Duty** — Not working today

Bulk update technician statuses across the team in seconds.

---

## Job Assignment

### Job Registry

View all jobs in a comprehensive grid showing:
- **Type** — Install, Repair, Maintenance, Disconnect, Service Change, Inspection
- **Customer** — Company or contact name
- **Address** — Job location
- **Skills Required** — What the tech needs to know
- **Status** — Pending, Assigned, In Progress, Completed, Failed
- **Time Slot** — Scheduled window (e.g., 8:00 AM - 12:00 PM)
- **Assigned Tech** — Who's doing the job (if assigned)

### Drag & Drop Assignment

The fastest way to assign jobs:

1. Click and hold a job
2. Drag to a technician
3. Drop to assign instantly

No modal dialogs, no multiple clicks. Just drag and drop.

### Bulk Assignment

Select multiple jobs and assign all to one technician in a single action:

1. Click-select 5 jobs (Cmd+Click for multi-select)
2. Right-click → "Assign to Tech"
3. Pick a technician
4. Done — all 5 jobs assigned

Also works for bulk unassign, bulk reassign, and bulk status changes.

---

## Skill-Based Routing

### Can Do Validation

Before assigning a job, FieldOpt checks: **Does this tech have the required skills?**

Visual indicator on assignment:
- ✓ **Can Do** — Tech has all required skills
- ✗ **Can't Do** — Tech missing at least one skill

Prevents assigning repair jobs to install-only techs.

### Auto-Route Recommendation

For any job, ask: **What's the best available technician?**

The system evaluates:
- Required skills match
- Available capacity
- Historical success rate (coming v0.0.8 with ML)

Get a ranked recommendation of who should do the job.

### Batch Skill Filtering

Search for techs by skill in seconds:

- "Show me all techs with repair skills"
- "Filter for install + service_change"
- "Available techs in SOUTH region"

---

## Real-Time Timeline

The timeline shows technician workload across the day:

**X-axis:** Time (6 AM → 6 PM)  
**Y-axis:** Technicians  
**Bars:** Jobs assigned to each tech  
**Colors:** Job types (install = blue, repair = orange, etc.)

### Updates Live

As jobs are assigned/completed, the timeline updates in real-time. See workload balance across the team instantly.

### Spot Overload

Visual indicator: Is one tech overbooked while others are idle? The timeline makes it obvious. Drag jobs to rebalance.

---

## Geographic Mapping

Interactive map showing:
- **Job pins** — Click to see job details
- **Technician locations** — Where everyone is (coming v0.0.8)
- **Route context** — Optimize by geography

### Floating Map Window

The map is a resizable, draggable window so you can position it how you want while still seeing grids.

### Location-Based Assignment

Assign jobs considering geography:
- Tech A is already near the next job
- Reduce travel time and fuel costs
- Better customer response times

---

## Advanced Search & Filtering

### Filter Technicians

- By **Status** (available, on_break, assigned, off_duty)
- By **Skills** (repair, install, maintenance, etc.)
- By **Capacity** (has room for more jobs?)
- By **Location** (coming v0.0.8)

### Filter Jobs

- By **Status** (pending, assigned, in_progress, completed, failed)
- By **Type** (install, repair, maintenance, etc.)
- By **Date** (today, tomorrow, next week)
- By **Time Slot** (morning, afternoon, evening)
- By **Required Skills**
- By **Location** (zip code, region)

### Free-Text Search

Search for anything:
- Technician name: "Miles"
- Job customer: "Acme"
- Address: "123 Main"
- Job ID: "J-0042"

Results appear instantly.

---

## Batch Operations

Dispatch faster with batch actions:

### Batch Assign
Select 10 jobs → assign all to 1 tech in one click

### Batch Unassign
Remove multiple job assignments at once

### Batch Reassign
Move 5 jobs from one tech to another

### Batch Status Change
Mark 8 jobs as completed simultaneously

All operations are atomic (all-or-nothing) for data consistency.

---

## Data-Driven Dispatch (Coming v0.0.8)

### ML Autodrip

The system learns from your dispatch history:

**Data collected:**
- Which tech handled what job type
- How long each job took
- Success vs. failure rate
- Travel times between locations
- Skill fit vs. actual performance

**Model trained:**
Every week, re-train the model on your company's data.

**Output:**
Better auto-route recommendations over time.

The more you use FieldOpt, the smarter it gets.

---

## Audit & History

Every dispatch action is logged:
- Who assigned what job
- When the assignment happened
- Job completion time
- Success/failure outcome

Use this data for:
- Performance analysis
- Compliance reporting
- Continuous improvement

---

## Mobile Responsiveness (Coming v0.0.8)

Currently desktop-optimized. Mobile/touch support coming soon:
- Responsive grid layout
- Touch-friendly drag & drop
- Mobile map interface
- Field tech app (separate project)

---

## What's Coming Next?

**v0.0.8:**
- Real-time WebSocket updates
- ML autodrip dispatch visible
- Mobile responsiveness
- Time-lapsed day animation

**v0.0.9:**
- Role-based access control
- Project jobs (sub-tasks)
- Advanced reporting dashboard
- Integrations (Salesforce, ServiceTitan, etc.)

**v0.1 & Beyond:**
- Field technician app
- Advanced analytics
- Predictive dispatch
- Multi-region support
