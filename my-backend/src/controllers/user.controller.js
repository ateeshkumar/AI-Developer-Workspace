const userService = require("../services/user.service");

const getProfile = async (req, res, next) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    res.json(profile);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
};
