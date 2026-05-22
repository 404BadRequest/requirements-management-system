/**
 * Capacity constants for utilization calculations.
 * Based on a standard full-time 40-hour work week.
 */

/** Standard weekly capacity in hours (Mon–Fri, 8h/day) */
export const WEEKLY_CAPACITY_HOURS = 40;

/** Standard monthly capacity in hours (4 weeks × WEEKLY_CAPACITY_HOURS) */
export const MONTHLY_CAPACITY_HOURS = WEEKLY_CAPACITY_HOURS * 4;
