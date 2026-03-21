const ApiError = require("../utils/api-error");

const errorHandler = (error, _req, res, _next) => {
  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "Invalid JSON request body",
    });
  }

  if (error instanceof ApiError) {
    return res.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
  }

  if (error.code === "P2002") {
    return res.status(409).json({
      error: "A record with these details already exists",
      details: error.meta,
    });
  }

  console.error("Unhandled error:", {
    message: error.message,
    stack: error.stack,
    code: error.code,
  });

  return res.status(500).json({
    error: "Internal server error",
    message: error.message,
  });
};

module.exports = {
  errorHandler,
};
