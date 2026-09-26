const AdminAuditLog = require('../models/AdminAuditLog');

/**
 * Builds the geographic scope query filter for a given admin and entity type.
 * If admin is super_admin or scopeType === 'GLOBAL', returns {} (unrestricted).
 */
function buildAdminScopeFilter(admin, entityType = 'general') {
  if (!admin || admin.role === 'super_admin' || admin.scopeType === 'GLOBAL') {
    return {};
  }

  const { scopeType, cityId, cityName, districtId, districtName, subDistrictId, subDistrictName } = admin;
  const cleanCity = (cityName || '').trim();
  const cleanDistrict = (districtName || '').trim();
  const cleanSubDistrict = (subDistrictName || '').trim();

  if (scopeType === 'CITY') {
    const cityConditions = [];
    if (cityId) {
      if (entityType === 'vendor') cityConditions.push({ cityId });
      cityConditions.push({ 'address.cityId': cityId });
    }
    if (cleanCity) {
      const cityRegex = new RegExp(`^${escapeRegex(cleanCity)}$`, 'i');
      if (entityType === 'user') {
        cityConditions.push({ 'addresses.city': cityRegex }, { 'farms.location.city': cityRegex });
      } else {
        cityConditions.push({ 'address.city': cityRegex }, { cityName: cityRegex });
      }
    }
    return cityConditions.length > 0 ? { $or: cityConditions } : {};
  }

  if (scopeType === 'DISTRICT') {
    const distConditions = [];
    if (districtId) {
      distConditions.push({ districtId }, { 'address.districtId': districtId });
    }
    if (cleanDistrict) {
      const distRegex = new RegExp(`^${escapeRegex(cleanDistrict)}$`, 'i');
      if (entityType === 'user') {
        distConditions.push({ 'addresses.district': distRegex }, { districtName: distRegex });
      } else {
        distConditions.push({ 'address.district': distRegex }, { districtName: distRegex });
      }
    }
    if (cleanCity && distConditions.length === 0) {
      const cityRegex = new RegExp(`^${escapeRegex(cleanCity)}$`, 'i');
      distConditions.push({ 'address.city': cityRegex });
    }
    return distConditions.length > 0 ? { $or: distConditions } : {};
  }

  if (scopeType === 'SUB_DISTRICT') {
    const subConditions = [];
    if (subDistrictId) {
      subConditions.push({ subDistrictId }, { 'address.subDistrictId': subDistrictId });
    }
    if (cleanSubDistrict) {
      const subRegex = new RegExp(`^${escapeRegex(cleanSubDistrict)}$`, 'i');
      if (entityType === 'user') {
        subConditions.push({ 'addresses.subDistrict': subRegex }, { subDistrictName: subRegex });
      } else {
        subConditions.push({ 'address.subDistrict': subRegex }, { subDistrictName: subRegex });
      }
    }
    if (cleanDistrict && subConditions.length === 0) {
      const distRegex = new RegExp(`^${escapeRegex(cleanDistrict)}$`, 'i');
      subConditions.push({ 'address.district': distRegex });
    }
    return subConditions.length > 0 ? { $or: subConditions } : {};
  }

  return {};
}

function escapeRegex(text) {
  return String(text).replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

/**
 * Audit helper for recording admin operations
 */
async function auditAdminAction(req, action, module, description, targetId = null, targetModel = null, targetName = null, metadata = null) {
  try {
    const admin = req.user;
    if (!admin) return;

    await AdminAuditLog.log({
      adminId: admin._id || admin.id,
      adminName: admin.name ,
      adminEmail: admin.email ,
      adminRole: admin.role ,
      action,
      module,
      description,
      targetId,
      targetModel,
      targetName,
      metadata,
      ipAddress: req.ip || req.connection?.remoteAddress,
      userAgent: req.headers ? req.headers['user-agent'] : null
    });
  } catch (err) {
    console.error('auditAdminAction error:', err.message);
  }
}

module.exports = {
  buildAdminScopeFilter,
  auditAdminAction
};
