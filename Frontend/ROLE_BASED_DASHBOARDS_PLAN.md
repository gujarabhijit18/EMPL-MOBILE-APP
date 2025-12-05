# Role-Based Dashboard Modernization Plan

## Overview
Apply the same modern UI/UX design from Admin Dashboard to all other dashboards with role-specific content.

## Common Modern Design Elements

### 1. **Modern Header Design**
- Decorative background pattern (3 floating circles)
- Icon badge with role-specific icon
- Title + Subtitle layout
- Date & Time display
- Mini stats overview bar (4 stats)
- Purple gradient background

### 2. **Compact Stats Cards**
- Horizontal layout with gradient icon
- 4 cards in 2x2 grid
- Role-specific metrics
- Modern shadows and spacing

### 3. **Department/Team Section**
- Compact cards with progress bars
- "See All" link in header
- Top 3 items displayed
- Gradient icons

### 4. **Recent Activities**
- Compact single-line layout
- Small icons with status colors
- "View All" link
- Minimalist design

---

## Role-Specific Content

### 📊 **HR Dashboard**

**Header Icon:** `people` (team icon)
**Title:** "HR Dashboard"
**Subtitle:** "Human Resources Management"

**Stats Cards (4):**
1. **Total Employees** (Green) - `people` icon
2. **New Joiners** (Blue) - `person-add` icon
3. **Pending Leaves** (Orange) - `calendar` icon
4. **Open Positions** (Purple) - `briefcase` icon

**Mini Stats Bar:**
- Total: 248 staff
- Active: 231 present
- Leaves: 12 today
- Hiring: 8 positions

**Department Section:**
- Top 3 departments by headcount
- Show employee count
- Show growth rate
- Recruitment status

**Recent Activities:**
- Leave approvals
- New joiner onboarding
- Document submissions
- Policy updates
- Exit interviews

---

### 👔 **Manager Dashboard**

**Header Icon:** `business` (briefcase icon)
**Title:** "Manager Dashboard"
**Subtitle:** "Team Management & Oversight"

**Stats Cards (4):**
1. **Team Members** (Blue) - `people` icon
2. **Team Tasks** (Green) - `checkbox` icon
3. **Team On Leave** (Orange) - `calendar` icon
4. **Pending Approvals** (Purple) - `checkmark-circle` icon

**Mini Stats Bar:**
- Team: 25 members
- Active: 92% attendance
- Tasks: 18 in progress
- Approvals: 5 pending

**Team Section:**
- Top performers
- Task completion rates
- Attendance percentage
- Current projects

**Recent Activities:**
- Task completions
- Leave requests
- Performance updates
- Team member check-ins
- Meeting schedules

---

### 🎯 **Team Lead Dashboard**

**Header Icon:** `people-circle` (team lead icon)
**Title:** "Team Lead Dashboard"
**Subtitle:** "Project & Team Coordination"

**Stats Cards (4):**
1. **Team Size** (Blue) - `people` icon
2. **Active Tasks** (Green) - `checkbox` icon
3. **Completed Today** (Orange) - `checkmark-done` icon
4. **Blockers** (Red) - `alert-circle` icon

**Mini Stats Bar:**
- Team: 12 members
- Tasks: 8 active
- Done: 15 today
- Blocked: 2 issues

**Project Section:**
- Active projects
- Sprint progress
- Task distribution
- Deadline tracking

**Recent Activities:**
- Task assignments
- Status updates
- Code reviews
- Standup notes
- Sprint planning

---

### 👤 **Employee Dashboard**

**Header Icon:** `person` (user icon)
**Title:** "My Dashboard"
**Subtitle:** "Personal Workspace"

**Stats Cards (4):**
1. **My Tasks** (Blue) - `checkbox` icon
2. **Leave Balance** (Green) - `calendar` icon
3. **Attendance** (Orange) - `checkmark-circle` icon
4. **Projects** (Purple) - `briefcase` icon

**Mini Stats Bar:**
- Tasks: 5 active
- Leaves: 12 days left
- Attendance: 96%
- Projects: 3 assigned

**My Projects Section:**
- Active assignments
- Task progress
- Deadlines
- Completion rate

**Recent Activities:**
- Task completions
- Time logs
- Attendance records
- Leave applications
- Document submissions

---

## Implementation Pattern

### File Structure:
```
src/screens/
├── admin/AdminDashboard.tsx      ✅ COMPLETED (Template)
├── hr/HRDashboard.tsx            🔄 UPDATE
├── manager/ManagerDashboard.tsx  🔄 UPDATE
├── team_lead/TeamLeadDashboard.tsx 🔄 UPDATE
└── employee/EmployeeDashboard.tsx 🔄 UPDATE
```

### Code Pattern:
```typescript
// 1. Modern Header with Pattern
<LinearGradient colors={['#667eea', '#764ba2']}>
  <View style={styles.headerPattern}>
    {/* 3 decorative circles */}
  </View>
  
  <View style={styles.headerContent}>
    {/* Icon Badge + Title + DateTime */}
    {/* Mini Stats Bar */}
  </View>
</LinearGradient>

// 2. Compact Stats Grid
<View style={styles.statsGrid}>
  {/* 4 stat cards with gradients */}
</View>

// 3. Role-Specific Section
<View style={styles.sectionContainer}>
  <View style={styles.sectionHeader}>
    <Text>Section Title</Text>
    <Text>See All</Text>
  </View>
  {/* Compact cards */}
</View>

// 4. Recent Activities
<View style={styles.sectionContainer}>
  {/* Compact activity cards */}
</View>
```

### Color Scheme:
- **Admin**: Purple gradient `#667eea` → `#764ba2`
- **HR**: Blue gradient `#3b82f6` → `#2563eb`
- **Manager**: Teal gradient `#14b8a6` → `#0d9488`
- **Team Lead**: Orange gradient `#f59e0b` → `#d97706`
- **Employee**: Green gradient `#10b981` → `#059669`

---

## Key Differences from Admin

1. **No Department Management** (other roles)
2. **No New Hires** (Manager, Team Lead, Employee)
3. **Team-specific data** (Manager, Team Lead)
4. **Personal data** (Employee)
5. **Role-based permissions** reflected in content

---

## Next Steps

1. ✅ Admin Dashboard - Completed as template
2. 🔄 Update HR Dashboard with HR-specific content
3. 🔄 Update Manager Dashboard with team management content
4. 🔄 Update Team Lead Dashboard with project coordination content
5. 🔄 Update Employee Dashboard with personal workspace content

Each dashboard will maintain the same **premium modern design** but show only **role-appropriate content**.

---

**Status:** Ready for implementation
**Priority:** High
**Design Consistency:** 100% across all dashboards
