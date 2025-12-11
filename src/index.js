// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";
import "./index.css";
import "./security.css";

const root = createRoot(document.getElementById("root"));

root.render(
  React.createElement(React.StrictMode, null,
    React.createElement(ThemeProvider, { theme },
      React.createElement(CssBaseline, null),
      React.createElement(App, null)
    )
  )
);
