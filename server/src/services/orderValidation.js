// Order validation utilities for three-stage status system

/**
 * Valid status transitions
 */
export const VALID_STATUS_TRANSITIONS = {
  'pending': ['confirmed', 'cancelled'],
  'confirmed': [], // No transitions allowed from confirmed
  'cancelled': []  // No transitions allowed from cancelled
};

/**
 * Valid statuses
 */
export const VALID_STATUSES = ['pending', 'confirmed', 'cancelled'];

/**
 * Check if order can be edited based on status
 * Only pending orders can be edited
 */
export const isOrderEditable = (status) => {
  return status === 'pending';
};

/**
 * Check if status transition is valid
 */
export const isValidStatusTransition = (currentStatus, newStatus) => {
  if (!VALID_STATUSES.includes(newStatus)) {
    return false;
  }
  
  const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowedTransitions && allowedTransitions.includes(newStatus);
};

/**
 * Get allowed next statuses for current status
 */
export const getAllowedNextStatuses = (currentStatus) => {
  return VALID_STATUS_TRANSITIONS[currentStatus] || [];
};

/**
 * Validate order edit permissions
 */
export const validateOrderEditPermission = (order) => {
  if (!isOrderEditable(order.status)) {
    return {
      isValid: false,
      message: `Cannot edit order with status '${order.status}'. Only 'pending' orders can be edited.`
    };
  }
  return { isValid: true };
};

/**
 * Validate status transition
 */
export const validateStatusTransition = (currentStatus, newStatus) => {
  if (!isValidStatusTransition(currentStatus, newStatus)) {
    const allowedTransitions = getAllowedNextStatuses(currentStatus);
    return {
      isValid: false,
      message: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none'}`
    };
  }
  return { isValid: true };
};
