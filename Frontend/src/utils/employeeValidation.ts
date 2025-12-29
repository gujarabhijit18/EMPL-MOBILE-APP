/**
 * Employee Validation Utility
 * Implements strict business rules for employee creation and management
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  details?: string;
}

export interface EmployeeValidationRules {
  employeeId: ValidationResult;
  name: ValidationResult;
  email: ValidationResult;
  phone: ValidationResult;
  panCard: ValidationResult;
  aadharCard: ValidationResult;
  address: ValidationResult;
  joiningDate: ValidationResult;
  resignationDate: ValidationResult;
  department: ValidationResult;
  role: ValidationResult;
  designation: ValidationResult;
}

// ============ EMPLOYEE ID VALIDATION ============
export const validateEmployeeId = (id: string): ValidationResult => {
  if (!id?.trim()) {
    return { isValid: false, error: 'Employee ID is required' };
  }

  const trimmed = id.trim().toUpperCase();

  // Only uppercase letters (A-Z) and numbers (0-9)
  if (!/^[A-Z0-9]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Only uppercase letters (A-Z) and numbers (0-9) allowed',
      details: 'No spaces or special characters'
    };
  }

  // Must contain at least one letter and one number
  const hasLetter = /[A-Z]/.test(trimmed);
  const hasNumber = /[0-9]/.test(trimmed);

  if (!hasLetter || !hasNumber) {
    return {
      isValid: false,
      error: 'Must contain at least one letter and one number',
      details: 'Example: EMP001, HR2024'
    };
  }

  // Minimum length check
  if (trimmed.length < 3) {
    return {
      isValid: false,
      error: 'Employee ID must be at least 3 characters',
      details: 'Example: EMP001'
    };
  }

  return { isValid: true };
};

// ============ FULL NAME VALIDATION ============
export const validateName = (name: string): ValidationResult => {
  if (!name?.trim()) {
    return { isValid: false, error: 'Full Name is required' };
  }

  const trimmed = name.trim();

  // Only letters and spaces
  if (!/^[a-zA-Z\s]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Only letters and spaces allowed',
      details: 'No numbers or special characters'
    };
  }

  // Minimum 2 characters
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters',
      details: 'Please enter a valid full name'
    };
  }

  // Maximum 100 characters
  if (trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Name must not exceed 100 characters'
    };
  }

  return { isValid: true };
};

// ============ EMAIL VALIDATION ============
export const validateEmail = (email: string): ValidationResult => {
  if (!email?.trim()) {
    return { isValid: false, error: 'Email is required' };
  }

  const trimmed = email.trim().toLowerCase();

  // Strict email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid email format',
      details: 'Example: user@company.com'
    };
  }

  // Check for consecutive dots
  if (trimmed.includes('..')) {
    return {
      isValid: false,
      error: 'Email cannot contain consecutive dots'
    };
  }

  // Check for invalid symbols
  if (/[<>()[\]\\,;:\s@"]+/.test(trimmed.replace('@', '').replace('.', ''))) {
    return {
      isValid: false,
      error: 'Email contains invalid characters'
    };
  }

  return { isValid: true };
};

// ============ PHONE NUMBER VALIDATION ============
export const validatePhone = (phone: string, countryCode: string = '+91'): ValidationResult => {
  if (!phone?.trim()) {
    return { isValid: false, error: 'Phone number is required' };
  }

  const cleaned = phone.replace(/\D/g, '');

  if (countryCode === '+91' || countryCode === '91') {
    // India: exactly 10 digits, must start with 6-9
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      return {
        isValid: false,
        error: 'Invalid Indian phone number',
        details: 'Must be 10 digits starting with 6-9'
      };
    }
  } else {
    // Other countries: max 15 digits
    if (cleaned.length < 7 || cleaned.length > 15) {
      return {
        isValid: false,
        error: 'Phone number must be 7-15 digits',
        details: `Provided: ${cleaned.length} digits`
      };
    }
  }

  return { isValid: true };
};

// ============ PAN CARD VALIDATION ============
export const validatePanCard = (pan: string): ValidationResult => {
  if (!pan?.trim()) {
    return { isValid: false, error: 'PAN Card is required' };
  }

  const trimmed = pan.trim().toUpperCase();

  // Format: AAAAA9999A (5 letters, 4 numbers, 1 letter)
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Invalid PAN Card format',
      details: 'Format: ABCDE1234F (5 letters, 4 numbers, 1 letter)'
    };
  }

  return { isValid: true };
};

// ============ AADHAR CARD VALIDATION ============
export const validateAadharCard = (aadhar: string): ValidationResult => {
  if (!aadhar?.trim()) {
    return { isValid: false, error: 'Aadhar Card is required' };
  }

  const cleaned = aadhar.replace(/\D/g, '');

  // Must be exactly 12 digits
  if (cleaned.length !== 12) {
    return {
      isValid: false,
      error: 'Aadhar Card must be 12 digits',
      details: `Provided: ${cleaned.length} digits`
    };
  }

  // Aadhar numbers do not start with 0 or 1
  if (cleaned[0] === '0' || cleaned[0] === '1') {
    return {
      isValid: false,
      error: 'Invalid Aadhar Card number',
      details: 'Aadhar number should not start with 0 or 1'
    };
  }

  return { isValid: true };
};


// ============ ADDRESS VALIDATION ============
export const validateAddress = (address: string): ValidationResult => {
  if (!address?.trim()) {
    return { isValid: false, error: 'Address is required' };
  }

  const trimmed = address.trim();

  // Minimum length
  if (trimmed.length < 10) {
    return {
      isValid: false,
      error: 'Address must be at least 10 characters',
      details: 'Include street, city, and postal code'
    };
  }

  // Maximum length
  if (trimmed.length > 500) {
    return {
      isValid: false,
      error: 'Address must not exceed 500 characters'
    };
  }

  // Must contain at least city and postal code indicators
  const hasCity = /[a-zA-Z]{3,}/i.test(trimmed);
  const hasPostalCode = /\d{3,6}/i.test(trimmed);

  if (!hasCity || !hasPostalCode) {
    return {
      isValid: false,
      error: 'Address must include city and postal code',
      details: 'Example: 123 Main St, New York, NY 10001'
    };
  }

  return { isValid: true };
};

// ============ JOINING DATE VALIDATION ============
export const validateJoiningDate = (date: Date): ValidationResult => {
  if (!date) {
    return { isValid: false, error: 'Joining Date is required' };
  }

  const joiningDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const fiftyYearsAgo = new Date();
  fiftyYearsAgo.setFullYear(fiftyYearsAgo.getFullYear() - 50);

  // Cannot be more than 50 years in the past
  if (joiningDate < fiftyYearsAgo) {
    return {
      isValid: false,
      error: 'Joining Date is too far in the past',
      details: 'Please verify the date'
    };
  }

  return { isValid: true };
};

// ============ RESIGNATION DATE VALIDATION ============
export const validateResignationDate = (
  resignationDate: Date | null,
  joiningDate: Date,
  status: string
): ValidationResult => {
  // Resignation date is only required if status is inactive
  if (status !== 'Inactive' && !resignationDate) {
    return { isValid: true };
  }

  if (status === 'Inactive' && !resignationDate) {
    return {
      isValid: false,
      error: 'Resignation Date is required for inactive employees'
    };
  }

  if (!resignationDate) {
    return { isValid: true };
  }

  const resDate = new Date(resignationDate);
  const joinDate = new Date(joiningDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Must be after joining date
  if (resDate < joinDate) {
    return {
      isValid: false,
      error: 'Resignation Date must be after Joining Date'
    };
  }

  return { isValid: true };
};

// ============ DEPARTMENT VALIDATION ============
export const validateDepartment = (department: string, role: string): ValidationResult => {
  if (!department?.trim()) {
    return {
      isValid: false,
      error: 'Department is required for all roles'
    };
  }

  // Role-based department rules
  const roleRequiresSingleDept = ['Employee', 'TeamLead', 'Team Lead'].includes(role);

  if (roleRequiresSingleDept && department.includes(',')) {
    return {
      isValid: false,
      error: `${role} can only select one department`,
      details: 'Managers and HR can select multiple departments'
    };
  }

  return { isValid: true };
};

// ============ ROLE VALIDATION ============
export const validateRole = (role: string): ValidationResult => {
  if (!role?.trim()) {
    return { isValid: false, error: 'Role is required' };
  }

  const validRoles = ['Admin', 'HR', 'Manager', 'TeamLead', 'Team Lead', 'Employee'];

  if (!validRoles.includes(role)) {
    return {
      isValid: false,
      error: 'Invalid role selected',
      details: `Valid roles: ${validRoles.join(', ')}`
    };
  }

  return { isValid: true };
};

// ============ DESIGNATION VALIDATION ============
export const validateDesignation = (designation: string, role: string): ValidationResult => {
  // Designation is only visible for Employee, Team Lead, Admin
  const rolesRequiringDesignation = ['Employee', 'TeamLead', 'Team Lead', 'Admin'];

  if (!rolesRequiringDesignation.includes(role)) {
    // HR and Manager don't need designation
    return { isValid: true };
  }

  if (!designation?.trim()) {
    return {
      isValid: false,
      error: 'Designation is required for this role'
    };
  }

  const trimmed = designation.trim();

  // Only alphanumeric and spaces
  if (!/^[a-zA-Z0-9\s\-()]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Designation contains invalid characters',
      details: 'Only letters, numbers, hyphens, and parentheses allowed'
    };
  }

  // Length check
  if (trimmed.length < 2 || trimmed.length > 100) {
    return {
      isValid: false,
      error: 'Designation must be 2-100 characters'
    };
  }

  return { isValid: true };
};

// ============ EMPLOYMENT TYPE VALIDATION ============
export const validateEmploymentType = (type: string): ValidationResult => {
  if (!type?.trim()) {
    return { isValid: false, error: 'Employment Type is required' };
  }

  const validTypes = [
    'Contract-based',
    'Permanent'
  ];

  if (!validTypes.includes(type)) {
    return {
      isValid: false,
      error: 'Invalid Employment Type',
      details: `Valid types: ${validTypes.join(', ')}`
    };
  }

  return { isValid: true };
};

// ============ SHIFT TYPE VALIDATION ============
export const validateShiftType = (shift: string): ValidationResult => {
  if (!shift?.trim()) {
    return { isValid: false, error: 'Shift Type is required' };
  }

  const validShifts = ['General (GS)', 'Morning', 'Afternoon', 'Night', 'Rotational'];

  if (!validShifts.includes(shift)) {
    return {
      isValid: false,
      error: 'Invalid Shift Type',
      details: `Valid shifts: ${validShifts.join(', ')}`
    };
  }

  return { isValid: true };
};

// ============ GENDER VALIDATION ============
export const validateGender = (gender: string): ValidationResult => {
  if (!gender?.trim()) {
    return { isValid: false, error: 'Gender is required' };
  }

  const validGenders = ['Male', 'Female', 'Other'];

  if (!validGenders.includes(gender)) {
    return {
      isValid: false,
      error: 'Invalid Gender',
      details: `Valid options: ${validGenders.join(', ')}`
    };
  }

  return { isValid: true };
};

// ============ COMPREHENSIVE VALIDATION ============
export const validateEmployeeForm = (formData: any, isEdit: boolean = false): EmployeeValidationRules => {
  return {
    employeeId: isEdit ? { isValid: true } : validateEmployeeId(formData.employee_id),
    name: validateName(formData.name),
    email: validateEmail(formData.email),
    phone: validatePhone(formData.phone, '+91'),
    panCard: isEdit ? { isValid: true } : validatePanCard(formData.pan_card),
    aadharCard: isEdit ? { isValid: true } : validateAadharCard(formData.aadhar_card),
    address: validateAddress(formData.address),
    joiningDate: validateJoiningDate(formData.joining_date),
    resignationDate: validateResignationDate(
      formData.resignation_date,
      formData.joining_date,
      formData.status
    ),
    department: validateDepartment(formData.department, formData.role),
    role: validateRole(formData.role),
    designation: validateDesignation(formData.designation, formData.role),
  };
};

// ============ HELPER FUNCTIONS ============
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '').substring(0, 10);
  if (cleaned.length > 6) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}-${cleaned.substring(6, 10)}`;
  } else if (cleaned.length > 3) {
    return `${cleaned.substring(0, 3)}-${cleaned.substring(3, 6)}`;
  }
  return cleaned;
};

export const formatAadharCard = (aadhar: string): string => {
  const cleaned = aadhar.replace(/\D/g, '').substring(0, 12);
  const parts = [];
  for (let i = 0; i < cleaned.length; i += 4) {
    parts.push(cleaned.substring(i, i + 4));
  }
  return parts.join('-');
};

export const formatEmployeeId = (id: string): string => {
  return id.trim().toUpperCase();
};

export const formatPanCard = (pan: string): string => {
  return pan.trim().toUpperCase();
};
