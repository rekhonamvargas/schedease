import React from "react";
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StorageIcon from "@mui/icons-material/Storage";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { clearSensitiveData } from "../utils/security";

export default function Sidebar({ open = false, onClose = () => {}, onNavigate = () => {} }) {
  const navigate = useNavigate();

  const items = [
    { key: "dashboard", label: "Import Data", icon: <StorageIcon />, path: "/dashboard" },
    { key: "schedule", label: "Saved Schedules", icon: <CalendarTodayIcon />, path: "/saved-schedules" },
    { key: "compare", label: "Compare Schedules", icon: <CompareArrowsIcon />, path: "/compare-schedules" },
  ];

  const handleNavigation = (item) => {
    if (item.path) {
      navigate(item.path);
    }
    onNavigate?.(item.key);
    onClose?.();
  };

  return (
    <Drawer anchor="left" open={!!open} onClose={onClose}>
      <Box sx={{ 
        width: 280, 
        p: 2, 
        height: "100%", 
        display: "flex", 
        flexDirection: "column",
        bgcolor: "#fffef7",
      }}>
        <Box sx={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          mb: 2,
          pb: 2,
          borderBottom: "2px solid rgba(244, 197, 34, 0.2)",
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 700,
              color: "#9e0807",
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Menu
          </Typography>
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{
              color: "#9e0807",
              "&:hover": { backgroundColor: "rgba(158, 8, 7, 0.1)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider sx={{ mb: 2 }} />

        <List>
          {items.map((it) => (
            <ListItem
              button
              key={it.key}
              onClick={() => handleNavigation(it)}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                "&:hover": {
                  backgroundColor: "rgba(244, 197, 34, 0.15)",
                },
              }}
            >
              <ListItemIcon sx={{ color: "#9e0807", minWidth: 40 }}>
                {it.icon}
              </ListItemIcon>
              <ListItemText 
                primary={it.label}
                primaryTypographyProps={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 500,
                  color: "#333",
                }}
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: "auto" }}>
          <Divider sx={{ mb: 2, mt: 2 }} />
          <ListItem
            button
            onClick={() => {
              // Clear all sensitive data securely
              clearSensitiveData();
              localStorage.removeItem("token");
              localStorage.removeItem("schedease_current_user");
              sessionStorage.clear();
              navigate("/login", { replace: true });
              onClose?.();
            }}
            sx={{
              borderRadius: 2,
              "&:hover": {
                backgroundColor: "rgba(244, 67, 54, 0.1)",
              },
            }}
          >
            <ListItemIcon sx={{ color: "#f44336", minWidth: 40 }}>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 500,
                color: "#f44336",
              }}
            />
          </ListItem>
        </Box>
      </Box>
    </Drawer>
  );
}
