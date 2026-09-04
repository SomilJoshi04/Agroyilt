const bcrypt = require('bcryptjs');

/**
 * Shared utility for MPIN-related operations (hashing, comparison, lockout)
 */

const MPIN_MAX_ATTEMPTS = 5;
const MPIN_LOCKOUT_MINUTES = 15;

/**
 * Validates if the MPIN is exactly 4 digits
 * @param {string} mpin 
 * @returns {boolean}
 */
const validateMpinFormat = (mpin) => {
  return typeof mpin === 'string' && /^\d{4}$/.test(mpin);
};

/**
 * Hashes the MPIN using bcrypt
 * @param {string} mpin 
 * @returns {Promise<string>}
 */
const hashMpin = async (mpin) => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(mpin, salt);
};

/**
 * Compares plain MPIN with hashed MPIN
 * @param {string} plainMpin 
 * @param {string} hashedMpin 
 * @returns {Promise<boolean>}
 */
const compareMpin = async (plainMpin, hashedMpin) => {
  if (!hashedMpin) return false;
  return bcrypt.compare(plainMpin, hashedMpin);
};

/**
 * Handles failed MPIN attempt logic (increments attempts, applies lockout if needed)
 * @param {Object} entity - User, Vendor, or Worker instance
 * @returns {Object} - Result object { locked: boolean, remainingAttempts: number, lockUntil: Date|null }
 */
const incrementMpinAttempts = async (entity) => {
  let attempts = (entity.mpinAttempts || 0) + 1;
  let locked = false;
  let lockUntil = null;

  if (attempts >= MPIN_MAX_ATTEMPTS) {
    locked = true;
    lockUntil = new Date(Date.now() + MPIN_LOCKOUT_MINUTES * 60 * 1000);
    entity.mpinLockedUntil = lockUntil;
  }

  entity.mpinAttempts = attempts;
  await entity.save();

  return {
    locked,
    remainingAttempts: Math.max(0, MPIN_MAX_ATTEMPTS - attempts),
    lockUntil
  };
};

/**
 * Resets MPIN attempts to 0 (called on successful login or password reset)
 * @param {Object} entity - User, Vendor, or Worker instance
 */
const resetMpinAttempts = async (entity) => {
  if (entity.mpinAttempts > 0 || entity.mpinLockedUntil !== null) {
    entity.mpinAttempts = 0;
    entity.mpinLockedUntil = null;
    await entity.save();
  }
};

/**
 * Checks if the entity is currently locked out from MPIN login
 * @param {Object} entity - User, Vendor, or Worker instance
 * @returns {boolean} - true if locked out
 */
const isMpinLocked = (entity) => {
  if (entity.mpinLockedUntil && entity.mpinLockedUntil > new Date()) {
    return true;
  }
  return false;
};

module.exports = {
  MPIN_MAX_ATTEMPTS,
  MPIN_LOCKOUT_MINUTES,
  validateMpinFormat,
  hashMpin,
  compareMpin,
  incrementMpinAttempts,
  resetMpinAttempts,
  isMpinLocked
};
