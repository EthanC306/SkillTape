import React from "react";
import ReactDOM from "react-dom/client";
import Shell from "./src/Shell";

// Shell is the home page: a single page with CS2401 / CS3000 tabs at the bottom.
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>
);
