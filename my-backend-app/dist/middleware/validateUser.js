"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const validateEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};
const validatePassword = (password) => {
    return password.length >= 8;
};
const validateUser = (req, res, next) => {
    const { userName, email, password } = req.body;
    const errors = [];
    if (!userName)
        errors.push("Username is required.");
    if (!email)
        errors.push("Email is required.");
    if (!password)
        errors.push("Password is required.");
    if (email && !validateEmail(email)) {
        errors.push("Invalid email format.");
    }
    if (password && !validatePassword(password)) {
        errors.push("Password must be at least 8 characters long.");
    }
    if (errors.length > 0) {
        res.status(400).json({ success: false, errors });
        return;
    }
    next();
};
exports.default = validateUser;
