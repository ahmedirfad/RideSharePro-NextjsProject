const { z } = require("zod");

const Validate = (Schema) => (req, res, next) => {
  let dataToValidate = req.body;
  
  if (req.method === 'GET' && Object.keys(req.query).length > 0) {
    dataToValidate = req.query;
  }
  
  const isDone = Schema.safeParse(dataToValidate);

  if (!isDone.success) {
    return res.status(400).json({
      errors: isDone.error.errors,
    });
  }

  // Store validated data back
  if (req.method === 'GET') {
    req.query = isDone.data;
  } else {
    req.body = isDone.data;
  }
  
  next();
};

module.exports = { Validate };