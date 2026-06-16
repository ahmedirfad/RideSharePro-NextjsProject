// server/controllers/adminSettingsController.js
const PlatformSettings = require("../../models/PlatformSettings");

// GET /api/admin/settings
const getSettings = async (req, res) => {
  try {
    const settings = await PlatformSettings.getSingleton();
    return res.json({ success: true, data: settings });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/settings
// Body: { general?: {...}, fees?: {...}, notifications?: {...}, security?: {...} }
// Only the provided sections are updated — others untouched.
const updateSettings = async (req, res) => {
  try {
    const allowed = ["general", "fees", "notifications", "security"];
    const patch = {};

    for (const key of allowed) {
      if (req.body[key] && typeof req.body[key] === "object") {
        patch[key] = req.body[key];
      }
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, message: "No valid settings sections provided" });
    }

    const updated = await PlatformSettings.updateSingleton(patch);
    return res.json({ success: true, message: "Settings saved successfully", data: updated });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/admin/settings/maintenance
// Body: { enabled: true|false }
// Quick toggle for maintenance mode without loading the whole settings form.
const toggleMaintenance = async (req, res) => {
  try {
    const { enabled } = req.body;
    const updated = await PlatformSettings.updateSingleton({
      security: { maintenanceMode: !!enabled },
    });
    return res.json({
      success: true,
      message: enabled ? "Maintenance mode ON" : "Maintenance mode OFF",
      maintenanceMode: updated.security.maintenanceMode,
    });
  } catch (error) {
    console.error("Toggle maintenance error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getSettings, updateSettings, toggleMaintenance };