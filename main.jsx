import React from "react";
import ReactDOM from "react-dom/client";
import Shell from "./src/Shell";
import VerifyEmailPage from "./src/components/VerifyEmailPage";

// Shell is the home page: a single page with c++ / CS3000 tabs at the bottom.
const isVerifyPage = window.location.pathname === "/verify-email";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isVerifyPage ? <VerifyEmailPage /> : <Shell />}
  </React.StrictMode>
);
