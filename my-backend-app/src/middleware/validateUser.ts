import { Request, Response, NextFunction } from "express";

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

const validatePassword = (password: string): boolean => {
  return password.length >= 8;
};

const validateUser = (req: Request, res: Response, next: NextFunction): void => {
  const { userName, email, password } = req.body;

  const errors: string[] = [];

  if (!userName) errors.push("Username is required.");
  if (!email) errors.push("Email is required.");
  if (!password) errors.push("Password is required.");

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

export default validateUser;
