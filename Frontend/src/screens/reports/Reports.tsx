import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useRef, useState } from "react";
import { Animated, Easing, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Button, Card, ProgressBar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
// Import Lucide icons with correct names
import { ChevronDown } from "lucide-react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { useAutoHideTabBarOnScroll } from "../../navigation/tabBarVisibility";

type ReportStatus = "approved" | "pending" | "rejected";
type ReportType = "attendance" | "leaves" | "tasks" | "performance";
type TabType = "employee" | "department" | "executive";
type RatingType = "poor" | "average" | "good" | "excellent";
type MonthType = "January" | "February" | "March" | "April" | "May" | "June" | "July" | "August" | "September" | "October" | "November" | "December";

type ReportItem = {
  id: string;
  title: string;
  type: ReportType;
  status: ReportStatus;
  date: string; // ISO
  owner: string;
};

type EmployeePerformance = {
  id: string;
  name: string;
  empId: string;
  department: string;
  role: string;
  attendance: number;
  taskCompletion: number;
  productivity: number | null;
  qualityScore: number | null;
  overallRating: number | null;
  status: RatingType;
};

type DepartmentPerformance = {
  id: string;
  name: string;
  totalEmployees: number;
  avgProductivity: number;
  avgAttendance: number;
  tasksCompleted: number;
  tasksPending: number;
  performanceScore: number;
  status: RatingType;
};

type ExecutiveSummary = {
  topPerformer: {
    name: string;
    score: number;
  };
  avgPerformance: number;
  tasksCompleted: number;
  tasksTrend: number;
  bestDepartment: {
    name: string;
    score: number;
  };
  keyFindings: string[];
  recommendations: string[];
  actionItems: string[];
};

interface FilterOptions {
  month: MonthType;
  department: string;
}

// Mock data for reports
const MOCK_REPORTS: ReportItem[] = [
  { id: "RPT-001", title: "Daily Attendance - 10 Nov", type: "attendance", status: "approved", date: new Date().toISOString(), owner: "HR Team" },
  { id: "RPT-002", title: "Leave Summary - Nov Week 2", type: "leaves", status: "pending", date: new Date().toISOString(), owner: "HR Team" },
  { id: "RPT-003", title: "Task Completion - Sprint 21", type: "tasks", status: "approved", date: new Date().toISOString(), owner: "PMO" },
  { id: "RPT-004", title: "Department Performance - Q3", type: "performance", status: "rejected", date: new Date().toISOString(), owner: "Ops" },
  { id: "RPT-005", title: "Daily Attendance - 11 Nov", type: "attendance", status: "pending", date: new Date().toISOString(), owner: "HR Team" },
];

// Mock data for employee performance
const MOCK_EMPLOYEES: EmployeePerformance[] = [
  { 
    id: "1", 
    name: "John Doe", 
    empId: "EMP001", 
    department: "Engineering", 
    role: "Software Engineer",
    attendance: 95,
    taskCompletion: 88,
    productivity: null,
    qualityScore: null,
    overallRating: null,
    status: "good"
  },
  { 
    id: "2", 
    name: "Jane Smith", 
    empId: "EMP002", 
    department: "Marketing", 
    role: "Marketing Lead",
    attendance: 98,
    taskCompletion: 94,
    productivity: null,
    qualityScore: null,
    overallRating: null,
    status: "excellent"
  },
  { 
    id: "3", 
    name: "Mike Johnson", 
    empId: "EMP003", 
    department: "Sales", 
    role: "Sales Executive",
    attendance: 87,
    taskCompletion: 82,
    productivity: null,
    qualityScore: null,
    overallRating: null,
    status: "good"
  },
  { 
    id: "4", 
    name: "Sarah Williams", 
    empId: "EMP004", 
    department: "HR", 
    role: "HR",
    attendance: 92,
    taskCompletion: 90,
    productivity: null,
    qualityScore: null,
    overallRating: null,
    status: "good"
  },
];

// Mock data for department performance
const MOCK_DEPARTMENTS: DepartmentPerformance[] = [
  {
    id: "1",
    name: "Engineering",
    totalEmployees: 45,
    avgProductivity: 89,
    avgAttendance: 92,
    tasksCompleted: 342,
    tasksPending: 58,
    performanceScore: 88,
    status: "good"
  },
  {
    id: "2",
    name: "Marketing",
    totalEmployees: 20,
    avgProductivity: 94,
    avgAttendance: 95,
    tasksCompleted: 156,
    tasksPending: 24,
    performanceScore: 92,
    status: "excellent"
  },
  {
    id: "3",
    name: "Sales",
    totalEmployees: 35,
    avgProductivity: 86,
    avgAttendance: 88,
    tasksCompleted: 278,
    tasksPending: 42,
    performanceScore: 85,
    status: "good"
  },
  {
    id: "4",
    name: "HR",
    totalEmployees: 12,
    avgProductivity: 91,
    avgAttendance: 94,
    tasksCompleted: 98,
    tasksPending: 12,
    performanceScore: 90,
    status: "excellent"
  },
];

// Mock data for executive summary
const MOCK_EXECUTIVE: ExecutiveSummary = {
  topPerformer: {
    name: "Jane Smith",
    score: 95
  },
  avgPerformance: 88.5,
  tasksCompleted: 874,
  tasksTrend: 12,
  bestDepartment: {
    name: "Marketing",
    score: 92
  },
  keyFindings: [
    "Overall employee performance improved by 8% compared to last month",
    "Marketing department shows the highest productivity at 94%",
    "Task completion rate across all departments is at 87%",
    "Attendance rates remain steady at 92% organization-wide"
  ],
  recommendations: [
    "Implement performance improvement plans for underperforming employees",
    "Recognize and reward top performers to maintain motivation",
    "Provide additional training for departments with lower productivity scores",
    "Review and optimize task allocation to improve completion rates"
  ],
  actionItems: [
    "Schedule one-on-one meetings with employees scoring below 75%",
    "Plan quarterly awards ceremony for top performers",
    "Conduct department-wise training needs assessment",
    "Implement weekly task review meetings"
  ]
};

// Available filter options
const MONTHS: MonthType[] = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DEPARTMENTS = ["All Departments", "Engineering", "Marketing", "Sales", "HR", "Operations", "Finance"];

// Helper function to get color based on rating
const getRatingColor = (rating: number | null): string => {
  if (rating === null) return "#9ca3af";
  if (rating >= 90) return "#22c55e";
  if (rating >= 80) return "#3b82f6";
  if (rating >= 70) return "#f59e0b";
  return "#ef4444";
};

// Helper function to get status label
const getRatingLabel = (rating: number | null): RatingType => {
  if (rating === null) return "average";
  if (rating >= 90) return "excellent";
  if (rating >= 75) return "good";
  if (rating >= 60) return "average";
  return "poor";
};

// Helper function to get status color for RatingType
const getRatingStatusColor = (status: RatingType): string => {
  switch (status) {
    case "excellent":
      return "#10b981"; // Emerald-500
    case "good":
      return "#3b82f6"; // Blue-500
    case "average":
      return "#f59e0b"; // Amber-500
    case "poor":
      return "#ef4444"; // Red-500
    default:
      return "#6b7280"; // Gray-500
  }
};

// Helper function to get status background color for RatingType
const getRatingStatusBgColor = (status: RatingType): string => {
  switch (status) {
    case "excellent":
      return "#d1fae5"; // Emerald-100
    case "good":
      return "#dbeafe"; // Blue-100
    case "average":
      return "#fef3c7"; // Amber-100
    case "poor":
      return "#fee2e2"; // Red-100
    default:
      return "#f3f4f6"; // Gray-100
  }
};

// Helper function to get status icon for RatingType
const getRatingStatusIcon = (status: RatingType): keyof typeof Ionicons.glyphMap => {
  switch (status) {
    case "excellent":
      return "trophy";
    case "good":
      return "thumbs-up";
    case "average":
      return "remove-circle";
    case "poor":
      return "warning";
    default:
      return "help-circle";
  }
};

// Helper function to get status color for ReportStatus
const getReportStatusColor = (status: ReportStatus): string => {
  switch (status) {
    case "approved":
      return "#22C55E";
    case "pending":
      return "#F59E0B";
    case "rejected":
      return "#EF4444";
    default:
      return "#6B7280";
  }
};

const SummaryCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) => (
  <Card style={[styles.statCard, { backgroundColor: color }]}>
    <Card.Content style={styles.statContent}>
      <View style={{ flex: 1 }}>
        <Text style={styles.statLabelLight}>{label}</Text>
        <Text style={styles.statValueLight}>{value}</Text>
      </View>
      <View style={styles.statIconCircle}>
        <Ionicons name={icon} size={18} color="#fff" />
      </View>
    </Card.Content>
  </Card>
);

// Tab component for navigation between report types
const TabButton = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tabButton, active && styles.activeTabButton]} 
    onPress={onPress}
  >
    <Text style={[styles.tabButtonText, active && styles.activeTabButtonText]}>{label}</Text>
    {active && <View style={styles.activeTabIndicator} />}
  </TouchableOpacity>
);

// Dropdown selector component
const Dropdown = ({ 
  label, 
  value, 
  options, 
  onSelect 
}: { 
  label: string; 
  value: string; 
  options: string[]; 
  onSelect: (value: string) => void 
}) => {
  const [open, setOpen] = useState(false);
  
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setOpen(!open)}
      >
        <Text style={styles.dropdownLabel}>{value}</Text>
        <ChevronDown size={16} color="#6b7280" />
      </TouchableOpacity>
      
      {open && (
        <View style={styles.dropdownOptions}>
          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={true}
          >
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                style={styles.dropdownOption}
                onPress={() => {
                  onSelect(option);
                  setOpen(false);
                }}
              >
                <Text style={[styles.dropdownOptionText, option === value && styles.dropdownOptionTextActive]}>
                  {option}
                </Text>
                {option === value && (
                  <Ionicons name="checkmark" size={16} color="#2563eb" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// Star Rating component
const StarRating = ({ 
  rating, 
  onRatingChange, 
  size = 24 
}: { 
  rating: number; 
  onRatingChange: (rating: number) => void; 
  size?: number 
}) => {
  return (
    <View style={styles.starRatingContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onRatingChange(star * 20)} // Convert to percentage
          style={styles.starButton}
        >
          <Ionicons
            name={star * 20 <= rating ? "star" : "star-outline"}
            size={size}
            color={star * 20 <= rating ? "#f59e0b" : "#d1d5db"}
          />
        </TouchableOpacity>
      ))}
      <Text style={styles.ratingText}>
        {rating === 0 ? "Not rated (0%)" : `${rating}%`}
      </Text>
    </View>
  );
};

export default function Reports() {
  const navigation = useNavigation();
  const { isDarkMode, colors } = useTheme();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("employee");
  const [filters, setFilters] = useState<FilterOptions>({
    month: "November",
    department: "All Departments"
  });
  
  // Rating modal state
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePerformance | null>(null);
  const [productivityRating, setProductivityRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [productivityComment, setProductivityComment] = useState("");
  const [qualityComment, setQualityComment] = useState("");
  
  // Tab bar visibility hook for proper spacing
  const {
    onScroll,
    scrollEventThrottle,
    tabBarVisible,
    tabBarHeight,
  } = useAutoHideTabBarOnScroll();
  
  // Animation values for header elements
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslateY = useRef(new Animated.Value(-20)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslateY = useRef(new Animated.Value(20)).current;
  
  // Animate header elements on component mount
  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(headerTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 800,
        delay: 200,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  }, []);
  
  // Handle tab change with animation
  const handleTabChange = (tab: TabType) => {
    contentOpacity.setValue(0);
    contentTranslateY.setValue(20);
    
    setActiveTab(tab);
    
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(contentTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();
  };
  
  // Handle filter changes
  const handleMonthChange = (month: string) => {
    setFilters(prev => ({ ...prev, month: month as MonthType }));
  };
  
  const handleDepartmentChange = (department: string) => {
    setFilters(prev => ({ ...prev, department }));
  };

  // Rating modal functions
  const openRatingModal = (employee: EmployeePerformance) => {
    setSelectedEmployee(employee);
    setProductivityRating(employee.productivity || 0);
    setQualityRating(employee.qualityScore || 0);
    setProductivityComment("");
    setQualityComment("");
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    setRatingModalVisible(false);
    setSelectedEmployee(null);
    setProductivityRating(0);
    setQualityRating(0);
    setProductivityComment("");
    setQualityComment("");
  };

  const saveRatings = () => {
    // Here you would typically save to backend
    console.log("Saving ratings for", selectedEmployee?.name);
    console.log("Productivity:", productivityRating, productivityComment);
    console.log("Quality:", qualityRating, qualityComment);
    closeRatingModal();
  };

  const total = MOCK_REPORTS.length;
  const pending = MOCK_REPORTS.filter(r => r.status === "pending").length;
  const approved = MOCK_REPORTS.filter(r => r.status === "approved").length;
  const rejected = MOCK_REPORTS.filter(r => r.status === "rejected").length;

  // Filter reports based on search query and department
  const filteredReports = useMemo(() => {
    return MOCK_REPORTS.filter((r) => {
      const matchesQuery =
        !query ||
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.owner.toLowerCase().includes(query.toLowerCase());
      const matchesDepartment = 
        filters.department === "All Departments" || 
        r.owner.toLowerCase().includes(filters.department.toLowerCase());
      return matchesQuery && matchesDepartment;
    });
  }, [query, filters.department]);
  
  // Filter employees based on department
  const filteredEmployees = useMemo(() => {
    return MOCK_EMPLOYEES.filter(emp => {
      const matchesDepartment = 
        filters.department === "All Departments" || 
        emp.department === filters.department;
      return matchesDepartment;
    });
  }, [filters.department]);
  
  // Filter departments
  const filteredDepartments = useMemo(() => {
    return filters.department === "All Departments" 
      ? MOCK_DEPARTMENTS 
      : MOCK_DEPARTMENTS.filter(dept => dept.name === filters.department);
  }, [filters.department]);

  // Enhanced Performance metric component with modern design
  const PerformanceMetric = ({ 
    label, 
    value, 
    color 
  }: { 
    label: string; 
    value: number | null; 
    color: string 
  }) => {
    const rating = getRatingLabel(value);
    const ratingColor = getRatingStatusColor(rating);
    const ratingBgColor = getRatingStatusBgColor(rating);
    const ratingIcon = getRatingStatusIcon(rating);
    
    return (
      <View style={styles.modernMetricContainer}>
        <View style={styles.metricHeaderRow}>
          <View style={styles.metricLabelContainer}>
            <Text style={styles.modernMetricLabel}>{label}</Text>
            <View style={[styles.modernStatusBadge, { backgroundColor: ratingBgColor }]}>
              <Ionicons name={ratingIcon} size={12} color={ratingColor} style={styles.statusBadgeIcon} />
              <Text style={[styles.modernStatusText, { color: ratingColor }]}>
                {rating.charAt(0).toUpperCase() + rating.slice(1)}
              </Text>
            </View>
          </View>
          <Text style={[styles.modernMetricValue, { color: ratingColor }]}>
            {value !== null ? `${value}%` : 'N/A'}
          </Text>
        </View>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${value !== null ? value : 0}%`, 
                  backgroundColor: ratingColor 
                }
              ]} 
            />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLabelStart}>0%</Text>
            <Text style={styles.progressLabelEnd}>100%</Text>
          </View>
        </View>
      </View>
    );
  };
  
  // Department performance card component
  const DepartmentCard = ({ department }: { department: DepartmentPerformance }) => (
    <Card style={styles.departmentCard}>
      <View style={styles.departmentCardHeader}>
        <Text style={styles.departmentName}>{department.name}</Text>
        <View style={[styles.enhancedStatusBadge, { backgroundColor: getRatingStatusBgColor(department.status) }]}>
          <Ionicons 
            name={getRatingStatusIcon(department.status)} 
            size={14} 
            color={getRatingStatusColor(department.status)} 
            style={styles.statusBadgeIcon} 
          />
          <Text style={[styles.enhancedStatusText, { color: getRatingStatusColor(department.status) }]}>
            {department.status.charAt(0).toUpperCase() + department.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <View style={styles.departmentStats}>
        <View style={styles.departmentStatItem}>
          <Text style={styles.statLabel}>Total Employees</Text>
          <Text style={styles.statValue}>{department.totalEmployees}</Text>
        </View>
        
        <View style={styles.departmentStatItem}>
          <Text style={styles.statLabel}>Avg Productivity</Text>
          <Text style={[styles.statValue, { color: getRatingColor(department.avgProductivity) }]}>
            {department.avgProductivity}%
          </Text>
        </View>
        
        <View style={styles.departmentStatItem}>
          <Text style={styles.statLabel}>Avg Attendance</Text>
          <Text style={[styles.statValue, { color: getRatingColor(department.avgAttendance) }]}>
            {department.avgAttendance}%
          </Text>
        </View>
        
        <View style={styles.departmentStatItem}>
          <Text style={styles.statLabel}>Tasks Completed</Text>
          <Text style={styles.statValue}>{department.tasksCompleted}</Text>
        </View>
        
        <View style={styles.departmentStatItem}>
          <Text style={styles.statLabel}>Tasks Pending</Text>
          <Text style={styles.statValue}>{department.tasksPending}</Text>
        </View>
      </View>
      
      <View style={styles.performanceScoreContainer}>
        <Text style={styles.performanceScoreLabel}>Performance Score</Text>
        <View style={styles.performanceScoreRow}>
          <ProgressBar 
            progress={department.performanceScore / 100} 
            color={getRatingColor(department.performanceScore)} 
            style={styles.performanceBar} 
          />
          <Text style={[styles.performanceScoreValue, { color: getRatingColor(department.performanceScore) }]}>
            {department.performanceScore}%
          </Text>
        </View>
      </View>
    </Card>
  );

  const getTypeIcon = (type: ReportType) => {
    switch (type) {
      case "attendance":
        return "time-outline";
      case "leaves":
        return "leaf-outline";
      case "tasks":
        return "clipboard-outline";
      case "performance":
        return "trending-up-outline";
      default:
        return "document-text-outline";
    }
  };

  const getStatusColor = (status: ReportStatus) => {
    switch (status) {
      case "approved":
        return "#22C55E";
      case "pending":
        return "#F59E0B";
      case "rejected":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  // Render the appropriate tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case "employee":
        return (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Individual Performance Metrics</Text>
              <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.exportButtonText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            
            {filteredEmployees.map(employee => (
              <Card key={employee.id} style={styles.employeeCard}>
                <View style={styles.employeeHeader}>
                  <View>
                    <Text style={styles.employeeName}>{employee.name}</Text>
                    <Text style={styles.employeeMeta}>{employee.empId} • {employee.department} • {employee.role}</Text>
                  </View>
                  <View style={[styles.enhancedStatusBadge, { backgroundColor: getRatingStatusBgColor(employee.status) }]}>
                    <Ionicons 
                      name={getRatingStatusIcon(employee.status)} 
                      size={14} 
                      color={getRatingStatusColor(employee.status)} 
                      style={styles.statusBadgeIcon} 
                    />
                    <Text style={[styles.enhancedStatusText, { color: getRatingStatusColor(employee.status) }]}>
                      {employee.status.charAt(0).toUpperCase() + employee.status.slice(1)}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.metricsContainer}>
                  <PerformanceMetric 
                    label="Attendance" 
                    value={employee.attendance} 
                    color={getRatingColor(employee.attendance)} 
                  />
                  <PerformanceMetric 
                    label="Task Completion" 
                    value={employee.taskCompletion} 
                    color={getRatingColor(employee.taskCompletion)} 
                  />
                  <PerformanceMetric 
                    label="Productivity" 
                    value={employee.productivity} 
                    color={getRatingColor(employee.productivity)} 
                  />
                  <PerformanceMetric 
                    label="Quality Score" 
                    value={employee.qualityScore} 
                    color={getRatingColor(employee.qualityScore)} 
                  />
                </View>
                
                <View style={styles.overallRatingContainer}>
                  <Text style={styles.overallRatingLabel}>Overall Rating</Text>
                  <View style={styles.overallRatingStatus}>
                    <Text style={styles.overallRatingValue}>
                      {employee.overallRating ? `${employee.overallRating}%` : "Pending"}
                    </Text>
                    <Text style={styles.overallRatingSubtext}>Average of all metrics</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.addRatingButton}
                  onPress={() => openRatingModal(employee)}
                >
                  <Ionicons name="add-circle-outline" size={16} color="#3b82f6" />
                  <Text style={styles.addRatingButtonText}>Add Rating</Text>
                </TouchableOpacity>
              </Card>
            ))}
          </>
        );
        
      case "department":
        return (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Department Performance Overview</Text>
              <TouchableOpacity style={styles.exportButton}>
                <Ionicons name="download-outline" size={18} color="#fff" />
                <Text style={styles.exportButtonText}>Export CSV</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.departmentsGrid}>
              {filteredDepartments.map(department => (
                <DepartmentCard key={department.id} department={department} />
              ))}
            </View>
          </>
        );
        
      case "executive":
        return (
          <>
            <View style={styles.modernSummaryCards}>
              <View style={[styles.modernSummaryCard, styles.topPerformerCard]}>
                <LinearGradient
                  colors={['#10b981', '#059669']}
                  style={styles.summaryCardGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}>
                      <Text style={styles.modernSummaryCardLabel}>Top Performer</Text>
                      <View style={styles.summaryCardIconContainer}>
                        <Ionicons name="trophy" size={20} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.modernSummaryCardTitle}>{MOCK_EXECUTIVE.topPerformer.name}</Text>
                    <Text style={styles.modernSummaryCardValue}>{MOCK_EXECUTIVE.topPerformer.score}% Overall Score</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.avgPerformanceCard]}>
                <LinearGradient
                  colors={['#3b82f6', '#2563eb']}
                  style={styles.summaryCardGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}>
                      <Text style={styles.modernSummaryCardLabel}>Avg Performance</Text>
                      <View style={styles.summaryCardIconContainer}>
                        <Ionicons name="analytics" size={20} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.modernSummaryCardTitle}>{MOCK_EXECUTIVE.avgPerformance.toFixed(1)}%</Text>
                    <Text style={styles.modernSummaryCardValue}>All Employees</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.tasksCompletedCard]}>
                <LinearGradient
                  colors={['#8b5cf6', '#7c3aed']}
                  style={styles.summaryCardGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}>
                      <Text style={styles.modernSummaryCardLabel}>Tasks Completed</Text>
                      <View style={styles.summaryCardIconContainer}>
                        <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.modernSummaryCardTitle}>{MOCK_EXECUTIVE.tasksCompleted}</Text>
                    <Text style={styles.modernSummaryCardValue}>+{MOCK_EXECUTIVE.tasksTrend}% vs last month</Text>
                  </View>
                </LinearGradient>
              </View>
              
              <View style={[styles.modernSummaryCard, styles.bestDepartmentCard]}>
                <LinearGradient
                  colors={['#f59e0b', '#d97706']}
                  style={styles.summaryCardGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <View style={styles.summaryCardContent}>
                    <View style={styles.summaryCardHeader}>
                      <Text style={styles.modernSummaryCardLabel}>Best Department</Text>
                      <View style={styles.summaryCardIconContainer}>
                        <Ionicons name="business" size={20} color="#fff" />
                      </View>
                    </View>
                    <Text style={styles.modernSummaryCardTitle}>{MOCK_EXECUTIVE.bestDepartment.name}</Text>
                    <Text style={styles.modernSummaryCardValue}>{MOCK_EXECUTIVE.bestDepartment.score}% Score</Text>
                  </View>
                </LinearGradient>
              </View>
            </View>
            
            <Card style={styles.executiveSummaryCard}>
              <Text style={styles.executiveSectionTitle}>Executive Summary</Text>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Key Findings</Text>
                {MOCK_EXECUTIVE.keyFindings.map((finding, index) => (
                  <View key={`finding-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{finding}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Recommendations</Text>
                {MOCK_EXECUTIVE.recommendations.map((rec, index) => (
                  <View key={`rec-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{rec}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.executiveSection}>
                <Text style={styles.executiveSectionSubtitle}>Action Items</Text>
                {MOCK_EXECUTIVE.actionItems.map((action, index) => (
                  <View key={`action-${index}`} style={styles.executiveListItem}>
                    <View style={styles.executiveListBullet} />
                    <Text style={styles.executiveListText}>{action}</Text>
                  </View>
                ))}
              </View>
              
              <View style={styles.reportActions}>
                <Button 
                  mode="contained" 
                  icon="file-document-outline" 
                  onPress={() => {}} 
                  style={styles.generateReportButton}
                >
                  Generate Full Report
                </Button>
                
                <Button 
                  mode="contained" 
                  icon="download" 
                  onPress={() => {}} 
                  style={styles.downloadSummaryButton}
                >
                  Download Summary
                </Button>
              </View>
            </Card>
          </>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <SafeAreaView style={styles.safeAreaContainer} edges={['top']}>
      <StatusBar style="light" />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          
          <Animated.View 
            style={[
              styles.headerTextContainer,
              { opacity: headerOpacity, transform: [{ translateY: headerTranslateY }] }
            ]}
          >
            <Text style={styles.headerTitle}>Performance Reports</Text>
            <Text style={styles.headerSubtitle}>Analyze metrics, export insights</Text>
          </Animated.View>
        </View>
        
        {/* Filter Row */}
        <View style={styles.filterRow}>
          <Dropdown 
            label="Month" 
            value={filters.month} 
            options={MONTHS} 
            onSelect={handleMonthChange} 
          />
          <Dropdown 
            label="Department" 
            value={filters.department} 
            options={DEPARTMENTS} 
            onSelect={handleDepartmentChange} 
          />
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          <TabButton 
            label="Employee Performance" 
            active={activeTab === "employee"} 
            onPress={() => handleTabChange("employee")} 
          />
          <TabButton 
            label="Department Metrics" 
            active={activeTab === "department"} 
            onPress={() => handleTabChange("department")} 
          />
          <TabButton 
            label="Executive Summary" 
            active={activeTab === "executive"} 
            onPress={() => handleTabChange("executive")} 
          />
        </View>
        
        {/* Content Area */}
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={[
            styles.scrollContentContainer,
            {
              paddingBottom: tabBarVisible ? tabBarHeight + 24 : 100,
            },
          ]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          <Animated.View 
            style={[
              styles.tabContent,
              { opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }
            ]}
          >
            {renderTabContent()}
          </Animated.View>
        </ScrollView>
        
      </View>

      {/* Performance Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeRatingModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingModalContainer}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate Employee Performance</Text>
              <Text style={styles.ratingModalSubtitle}>
                Provide performance ratings for {selectedEmployee?.name}
              </Text>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={closeRatingModal}
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.ratingModalContent} showsVerticalScrollIndicator={false}>
              {/* Productivity Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>Productivity</Text>
                <StarRating 
                  rating={productivityRating} 
                  onRatingChange={setProductivityRating}
                  size={32}
                />
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Description / Comments</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Describe the employee's productivity, work efficiency, time management, etc."
                    value={productivityComment}
                    onChangeText={setProductivityComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>{productivityComment.length}/500</Text>
                </View>
              </View>

              {/* Quality Score Section */}
              <View style={styles.ratingSection}>
                <Text style={styles.ratingSectionTitle}>Quality Score</Text>
                <StarRating 
                  rating={qualityRating} 
                  onRatingChange={setQualityRating}
                  size={32}
                />
                <View style={styles.commentSection}>
                  <Text style={styles.commentLabel}>Description / Comments</Text>
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Describe the quality of work, attention to detail, accuracy, etc."
                    value={qualityComment}
                    onChangeText={setQualityComment}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.characterCount}>{qualityComment.length}/500</Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.ratingModalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={closeRatingModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={saveRatings}
              >
                <Text style={styles.saveButtonText}>Save Ratings</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// Helper function to get icon for report type
const getTypeIcon = (type: ReportType): string => {
  switch (type) {
    case "attendance":
      return "time-outline";
    case "leaves":
      return "leaf-outline";
    case "tasks":
      return "clipboard-outline";
    case "performance":
      return "trending-up-outline";
    default:
      return "document-text-outline";
  }
};

const styles = StyleSheet.create({
  safeAreaContainer: {
    flex: 1,
    backgroundColor: "#39549fff",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: "#39549fff",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 30,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTextContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#a5b4fc",
    opacity: 0.9,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  activeTabButton: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
    textAlign: "center",
  },
  activeTabButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  activeTabIndicator: {
    position: "absolute",
    bottom: 0,
    height: 3,
    width: "60%",
    backgroundColor: "#2563eb",
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  tabContent: {
    flex: 1,
    minHeight: '100%',
  },
  dropdownContainer: {
    position: "relative",
    width: "48%",
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dropdownLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  dropdownOptions: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderRadius: 8,
    marginTop: 4,
    padding: 4,
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 6,
  },
  dropdownOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  dropdownOptionTextActive: {
    color: "#2563eb",
    fontWeight: "600",
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 12,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    marginBottom: 6,
  },
  cardLabel: { 
    fontSize: 12, 
    color: "#6b7280",
    marginBottom: 4,
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: "bold", 
    color: "#111827" 
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563eb",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  exportButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  employeeCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  employeeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  employeeMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    
  },
  metricsContainer: {
    padding: 16,
    backgroundColor: "#fff",
  },
  metricContainer: {
    marginBottom: 16,
  },
  metricLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 14,
    color: "#4b5563",
    fontWeight: "500",
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
  },
  metricSubtext: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "right",
  },
  overallRatingContainer: {
    padding: 16,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  overallRatingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  overallRatingStatus: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  overallRatingValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2563eb",
  },
  overallRatingSubtext: {
    fontSize: 12,
    color: "#6b7280",
  },
  addRatingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  addRatingButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3b82f6",
    marginLeft: 6,
  },
  departmentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  departmentCard: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    padding: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  departmentCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  departmentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  departmentStats: {
    padding: 12,
    backgroundColor: "#fff",
  },
  departmentStatItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
  },
  statValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  performanceScoreContainer: {
    padding: 12,
    backgroundColor: "#f8fafc",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  performanceScoreLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  performanceScoreRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  performanceBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#e5e7eb",
    marginRight: 8,
  },
  performanceScoreValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  summaryCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  summaryCard: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
    position: "relative",
    overflow: "hidden",
  },
  summaryCardLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  summaryCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  summaryCardValue: {
    fontSize: 14,
    color: "#4b5563",
  },
  summaryCardIcon: {
    position: "absolute",
    top: 12,
    right: 12,
    opacity: 0.15,
  },
  executiveSummaryCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  executiveSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  executiveSection: {
    marginBottom: 20,
  },
  executiveSectionSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  executiveListItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  executiveListBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#3b82f6",
    marginRight: 8,
  },
  executiveListText: {
    fontSize: 14,
    color: "#4b5563",
    flex: 1,
  },
  reportActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  generateReportButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: "#2563eb",
  },
  downloadSummaryButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: "#3b82f6",
  },
  
  // Legacy styles for compatibility
  sectionCard: { 
    marginBottom: 16, 
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: 'hidden',
  },
  filterLabel: { 
    fontSize: 12, 
    color: "#6B7280", 
    marginTop: 4, 
    marginBottom: 6 
  },
  chipsRow: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    gap: 8 
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: "#2563EB",
  },
  chipText: { 
    fontSize: 12, 
    color: "#374151" 
  },
  chipTextActive: { 
    color: "#fff" 
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  reportTitle: { 
    fontSize: 14, 
    fontWeight: "600", 
    color: "#111827" 
  },
  reportSub: { 
    fontSize: 11, 
    color: "#6B7280", 
    marginTop: 2 
  },
  badge: {
    color: "#fff",
  },
  
  // Missing styles for SummaryCard component
  statCard: { 
    width: "48%", 
    borderRadius: 12, 
    marginBottom: 8 
  },
  statContent: { 
    flexDirection: "row", 
    alignItems: "center" 
  },
  statLabelLight: { 
    fontSize: 12, 
    color: "#E5E7EB" 
  },
  statValueLight: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#fff", 
    marginTop: 2 
  },
  statIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  
  // Enhanced Status Badge Styles
  enhancedStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  enhancedStatusText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  statusBadgeIcon: {
    marginRight: 2,
  },
  
  // Modern Performance Metric Styles
  modernMetricContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  metricLabelContainer: {
    flex: 1,
  },
  modernMetricLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  modernStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  modernStatusText: {
    fontSize: 10,
    fontWeight: "600",
    marginLeft: 3,
  },
  modernMetricValue: {
    fontSize: 24,
    fontWeight: "700",
    marginLeft: 12,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
    minWidth: 2,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  progressLabelStart: {
    fontSize: 10,
    color: "#9ca3af",
  },
  progressLabelEnd: {
    fontSize: 10,
    color: "#9ca3af",
  },
  
  // Modern Summary Cards Styles
  modernSummaryCards: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  modernSummaryCard: {
    width: "48%",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryCardGradient: {
    flex: 1,
    padding: 16,
  },
  summaryCardContent: {
    flex: 1,
  },
  summaryCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modernSummaryCardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryCardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  modernSummaryCardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  modernSummaryCardValue: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  
  // Individual card color variants
  topPerformerCard: {
    // Emerald gradient handled by LinearGradient
  },
  avgPerformanceCard: {
    // Blue gradient handled by LinearGradient
  },
  tasksCompletedCard: {
    // Purple gradient handled by LinearGradient
  },
  bestDepartmentCard: {
    // Amber gradient handled by LinearGradient
  },
  
  // Star Rating Styles
  starRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  starButton: {
    padding: 4,
    marginRight: 4,
  },
  ratingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  
  // Rating Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingModalContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 60,
    borderRadius: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  ratingModalHeader: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    position: 'relative',
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  ratingModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingModalContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  ratingSection: {
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  ratingSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  commentSection: {
    marginTop: 16,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#f9fafb',
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  ratingModalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
