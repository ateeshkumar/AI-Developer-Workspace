const aiService = require("../services/ai.service");

const queryAssistant = async (req, res, next) => {
  try {
    const payload = await aiService.queryAssistant(req.body);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  queryAssistant,
};
