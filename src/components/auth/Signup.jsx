import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
} from "@mui/material";
import useForm from "../../hooks/useForm";
import { loadUsers, saveUser, setCurrentUserId } from "../../utils/storage";
import { hashPassword, sanitizeForLogging } from "../../utils/security";

export default function Signup() {
  const navigate = useNavigate();
  const { values, errors, handleChange, setError } = useForm({
    full_name: "",
    email: "",
    username: "",
    password: "",
  });
  const [submitError, setSubmitError] = useState("");

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPassword = (password) => password.length >= 6;

  const isValidUsername = (username) => /^[a-zA-Z0-9_]{3,20}$/.test(username);

  const validateForm = () => {
    const newErrors = {};

    if (!values.full_name || !values.full_name.trim()) {
      newErrors.full_name = "Full name is required";
    } else if (values.full_name.trim().length < 2) {
      newErrors.full_name = "Full name must be at least 2 characters";
    }

    if (!values.email || !values.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(values.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!values.username || !values.username.trim()) {
      newErrors.username = "Username is required";
    } else if (!isValidUsername(values.username)) {
      newErrors.username =
        "Username must be 3-20 characters (letters, numbers, underscore only)";
    }

    if (!values.password) {
      newErrors.password = "Password is required";
    } else if (!isValidPassword(values.password)) {
      newErrors.password = "Password must be at least 6 characters long";
    }

    Object.keys(newErrors).forEach((key) => setError(key, newErrors[key]));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!validateForm()) return;

    try {
      // Log sanitized version only
      if (process.env.NODE_ENV === 'development') {
        console.log("Signup attempt:", sanitizeForLogging({
          full_name: values.full_name,
          email: values.email,
          username: values.username,
          password: values.password,
        }));
      }

     
      const newUser = {
        username: values.username,
        email: values.email,
        password: values.password, 
        full_name: values.full_name,
      };
      
      await saveUser(newUser);

      // After signup, navigate to login so the user can sign in
      navigate("/login", { replace: true });

      
    } catch (err) {
      setSubmitError(err.message || "An error occurred while registering. Please try again.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff6db",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
        backgroundImage: "linear-gradient(135deg, #fff6db 0%, #fff2c2 100%)",
      }}
    >
      <Container maxWidth="sm">
        <Paper
          sx={{
            p: 4,
            borderRadius: 3,
            bgcolor: "#fffef7",
            boxShadow: "0 4px 16px rgba(158, 8, 7, 0.08)",
            border: "1px solid rgba(244, 197, 34, 0.2)",
          }}
        >
          <Stack spacing={3}>
            {/* Logo Section */}
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, mb: 2 }}>
              <img
                src="/favicon.ico"
                alt="SchedEase Logo"
                style={{ width: "48px", height: "48px" }}
              />
              <img
                src="/cit-logo.png"
                alt="CIT-U Logo"
                style={{
                  height: "50px",
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            </Box>

            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: "#9e0807",
                  mb: 1,
                  fontFamily: "'Poppins', sans-serif",
                  textAlign: "center",
                }}
              >
                Sign Up
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontFamily: "'Poppins', sans-serif",
                  textAlign: "center",
                }}
              >
                Create a new account to get started
              </Typography>
            </Box>

            {submitError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {submitError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Full Name"
                  type="text"
                  fullWidth
                  required
                  value={values.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  error={!!errors.full_name}
                  helperText={errors.full_name}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />

                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  required
                  value={values.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  error={!!errors.email}
                  helperText={errors.email}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />

                <TextField
                  label="Username"
                  type="text"
                  fullWidth
                  required
                  value={values.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  error={!!errors.username}
                  helperText={
                    errors.username ||
                    "3-20 characters, letters, numbers, and underscore only"
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />

                <TextField
                  label="Password"
                  type="password"
                  fullWidth
                  required
                  value={values.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  error={!!errors.password}
                  helperText={errors.password || "Minimum 6 characters"}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 2,
                    },
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  sx={{
                    bgcolor: "#9e0807",
                    "&:hover": { bgcolor: "#7c0605" },
                    py: 1.5,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: "1rem",
                    mt: 1,
                  }}
                >
                  Create Account
                </Button>
              </Stack>
            </Box>

            <Box sx={{ textAlign: "center", pt: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: "#666",
                  fontFamily: "'Poppins', sans-serif",
                }}
              >
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{
                    color: "#9e0807",
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Log in
                </Link>
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Container>
    </Box>
  );
}
