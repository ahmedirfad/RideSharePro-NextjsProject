const { Router } = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const {
  createDispute,
  getMyDisputes,
  getDisputeById,
  cancelDispute,
} = require("../controllers/disputeController");

const router = Router();

// All dispute routes require authentication
router.use(authMiddleware);

router.post("/", createDispute);
router.get("/my", getMyDisputes);
router.get("/:id", getDisputeById);
router.put("/:id/cancel", cancelDispute);

module.exports = router;