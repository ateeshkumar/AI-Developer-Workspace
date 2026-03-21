const authService = require("../services/auth.service");

const register = async (req, res, next) => {
  try {
    const payload = await authService.register(req.body);
    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const payload = await authService.login(req.body);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const payload = await authService.refreshAccessToken(req.body.refreshToken);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const payload = await authService.logout(req.body.refreshToken);
    res.json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  refresh,
  logout,
};
