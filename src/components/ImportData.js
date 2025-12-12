import React, { useState, useMemo } from "react";
import {
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { SystemUpdateAlt as ImportIcon } from "@mui/icons-material";
import { parsePlain, normalizeRecord } from "../utils/parse";

const COLORS = {
  primary: "#9e0807",
  primaryAccent: "#9e0807",
  gold: "#f4c522",
  lightGray: "#f5f5f5",
  white: "#ffffff",
};

export default function ImportData({ onCreateMany, disableImport = false, onNavigateToSubjects }) {
  const [text, setText] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");
  const disabled = useMemo(() => !text.trim() || disableImport || importLoading, [text, disableImport, importLoading]);

  const handleImport = () => {
    const rows = parsePlain(text);
    if (!rows.length) {
      setSnackbarMessage("No data found to import");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      return;
    }
    
    // Validate that all subjects have required fields (complete data)
    const requiredFields = ["#", "Offering Dept", "Subject", "Subject Title", "Credited Units", "Section", "Schedule", "Room", "Total Slots", "Enrolled", "Assessed", "Is Closed"];
    const incompleteSubjects = [];
    
    rows.forEach((row, index) => {
      // Check if any required field is missing or empty
      for (let i = 0; i < Math.min(row.length, requiredFields.length); i++) {
        if (!row[i] || String(row[i]).trim() === "") {
          incompleteSubjects.push(`Row ${index + 1} is missing: ${requiredFields[i]}`);
          break;
        }
      }
      // Check if row doesn't have all 12 fields
      if (row.length < requiredFields.length) {
        incompleteSubjects.push(`Row ${index + 1} has only ${row.length} fields, expected ${requiredFields.length}`);
      }
    });
    
    if (incompleteSubjects.length > 0) {
      setSnackbarMessage(`Cannot import incomplete subjects. ${incompleteSubjects[0]}`);
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }
    
    setImportLoading(true);
    
    // Import the data first
    const mapped = rows.map(normalizeRecord);
    onCreateMany?.(mapped);
    
    
    setTimeout(() => {
      setImportLoading(false);
      setText(""); // Clear the text field
      if (onNavigateToSubjects) {
        onNavigateToSubjects();
      }
     
      setSnackbarOpen(false);
    }, 2000);
  };

  const handleClear = () => setText("");

  const handleCloseSnackbar = () => {
    setSnackbarOpen(false);
  };

  const headers = [
    "#",
    "Offering Dept",
    "Subject",
    "Subject Title",
    "Credited Units",
    "Section",
    "Schedule",
    "Room",
    "Total Slots",
    "Enrolled",
    "Assessed",
    "Is Closed",
  ];

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", height: "100%"}}>
        {/* TOP CAPSULE HEADER */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.primary} 100%)`,
            p: { xs: 2, md: 3 },
            pb: 4.5,
            borderRadius: 2,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: "100%",
              boxSizing: "border-box",
              display: "flex",
              alignItems: "center",
              background: COLORS.lightGray,
              borderRadius: 40,
              px: { xs: 2, md: 3 },
              py: 1.25,
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
              border: "1px solid rgba(255,255,255,0.4)",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                sx={{
                  bgcolor: COLORS.primary,
                  width: 56,
                  height: 56,
                  boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
                }}
              >
                <ImportIcon sx={{ color: COLORS.gold, fontSize: 28 }} />
              </Avatar>

              <Box>
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontSize: "1.55rem",
                    color: COLORS.primary,
                    letterSpacing: "0.5px",
                  }}
                >
                  Import Subjects
                </Typography>

                <Typography
                  variant="caption"
                  sx={{
                    color: COLORS.primary,
                    opacity: 0.75,
                    fontSize: "0.85rem",
                  }}
                >
                  Paste AIMS rows here and import instantly
                </Typography>
              </Box>
            </Box>

            <Box sx={{ flex: 1 }} />
          </Box>
        </Box>

        {/* BODY — must fill remaining height with rounded corners */}
        <Box 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            backgroundColor: "#fffef7", 
            display: "flex", 
            flexDirection: "column", 
            flex: 1, 
            borderRadius: 2,
            boxSizing: "border-box",
            borderBottomLeftRadius: 12,  // Add rounded bottom corners
            borderBottomRightRadius: 12, // Add rounded bottom corners
          }}
        >
          <Stack spacing={2} sx={{ height: "100%" }}>
            <Box>
              <Typography variant="body2" sx={{ color: "#333", mb: 1.25, lineHeight: 1.6, fontSize: "1rem" }}>
                Go to <b>AIMS → Section Offering</b>, search the subject, then copy & paste the rows.
              </Typography>

            {/* COLUMN FIELDS */}
              {/* <Box
                sx={{
                  backgroundColor: "#fff6db",
                  borderRadius: 2,
                  border: "1px solid rgba(0,0,0,0.08)",
                  py: 1.2,
                  px: 1.5,
                  fontFamily: "'JetBrains Mono','Fira Code', monospace",
                  fontSize: "0.9rem",
                  color: "#1A1A1A",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  gap: "8px",
                }}
              >
                {headers.map((h, i) => (
                  <Box
                    key={i}
                    sx={{
                      flex: i === 3 ? "1.4" : i === 6 ? "1.5" : "1",
                      textAlign: "left",
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box> */}
            </Box>

            {/* TEXTAREA: Flexible and scrollable container */}
            <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minHeight: 0 }}>
              <Box
                sx={{
                  flex: 1,
                  backgroundColor: "#fafafa",
                  borderRadius: 2,
                  overflow: "hidden", // Ensure content doesn't overflow the rounded container
                  border: "1px solid rgba(0,0,0,0.1)",
                  minHeight: 0, // Prevent container from growing
                }}
              >
                <TextField
                  multiline
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste rows here..."
                  fullWidth
                  InputProps={{
                    sx: {
                      boxSizing: "border-box",
                      height: "100%",
                      "& .MuiOutlinedInput-notchedOutline": {
                        border: "none", // Remove default border
                      },
                      "& textarea": {
                        fontFamily: "'JetBrains Mono','Fira Code', monospace",
                        whiteSpace: "pre",
                        padding: "12px",
                        boxSizing: "border-box",
                        wordBreak: "break-word",
                        resize: "none", // Prevent manual resizing
                        height: "100% !important",
                        maxHeight: "100% !important",
                        overflowY: "auto !important", // Force scrollbar
                        "&::-webkit-scrollbar": {
                          width: "8px",
                        },
                        "&::-webkit-scrollbar-track": {
                          background: "#f1f1f1",
                          borderRadius: "4px",
                        },
                        "&::-webkit-scrollbar-thumb": {
                          background: "#888",
                          borderRadius: "4px",
                        },
                        "&::-webkit-scrollbar-thumb:hover": {
                          background: "#555",
                        },
                      },
                      "&.MuiInputBase-root": {
                        height: "100%",
                        overflow: "hidden", // Prevent textarea from expanding
                      },
                    },
                  }}
                  sx={{
                    height: "100%",
                    "& .MuiInputBase-root": {
                      height: "100%",
                    },
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                <Button
                  variant="outlined"
                  onClick={handleClear}
                  disabled={importLoading}
                  sx={{
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                    textTransform: "none",
                    fontWeight: 600,
                    borderRadius: 2,
                    px: 2.5,
                  }}
                >
                  Clear
                </Button>

                <Button
                  variant="contained"
                  disabled={disabled}
                  onClick={handleImport}
                  startIcon={importLoading ? <CircularProgress size={18} color="inherit" /> : null}
                  sx={{
                    bgcolor: COLORS.primary,
                    "&:hover": { bgcolor: "#7a0506" },
                    px: 3,
                    py: 1,
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: 2,
                    minWidth: 120,
                  }}
                >
                  {importLoading ? "Importing..." : "Import & View Subjects"}
                </Button>
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* Snackbar for notifications - ONLY shows in ImportData */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbarSeverity}
          sx={{ 
            width: "100%",
            fontSize: "1rem",
            fontWeight: 600,
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
}