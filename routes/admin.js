import express from "express";
import { createClient } from "@supabase/supabase-js";

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Middleware to check if user is logged in
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/admin/login");
  }
  next();
}

// Admin login page
router.get("/login", (req, res) => {
  res.render("pages/admin/login", { title: "Admin Login" });
});

// Handle admin login form
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const { data: user, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !user || user.password !== password) {
    return res.render("pages/admin/login", {
      title: "Admin Login",
      error: "Invalid email or password",
    });
  }

  req.session.user = { id: user.id, email: user.email };
  res.redirect("/admin/dashboard");
});

// Admin dashboard (protected)
router.get("/dashboard", requireAuth, (req, res) => {
  res.render("pages/admin/dashboard", { title: "Dashboard", user: req.session.user });
});

// Logout
router.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/admin/login");
});

export default router;
